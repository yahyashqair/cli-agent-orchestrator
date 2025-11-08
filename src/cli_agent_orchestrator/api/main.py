"""Single FastAPI entry point for all HTTP routes."""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path as FilePath
from typing import Annotated, Dict, List, Optional

from fastapi import (
    FastAPI,
    HTTPException,
    Path,
    Query,
    Response,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import and_, or_
from watchdog.observers.polling import PollingObserver

from cli_agent_orchestrator.api.websocket_manager import TerminalWebSocketManager
from cli_agent_orchestrator.clients.database import (
    InboxModel,
    SessionLocal,
    create_inbox_message,
    init_db,
)
from cli_agent_orchestrator.constants import (
    INBOX_POLLING_INTERVAL,
    PROVIDERS,
    SERVER_HOST,
    SERVER_PORT,
    SERVER_VERSION,
    TERMINAL_LOG_DIR,
)
from cli_agent_orchestrator.models.terminal import Terminal, TerminalId
from cli_agent_orchestrator.providers.manager import provider_manager
from cli_agent_orchestrator.services import (
    agent_config_service,
    flow_service,
    inbox_service,
    session_service,
    terminal_service,
)
from cli_agent_orchestrator.services.cleanup_service import cleanup_old_data
from cli_agent_orchestrator.services.inbox_service import LogFileHandler
from cli_agent_orchestrator.services.terminal_service import OutputMode
from cli_agent_orchestrator.utils.logging import setup_logging
from cli_agent_orchestrator.utils.terminal import generate_session_name

logger = logging.getLogger(__name__)
ws_manager = TerminalWebSocketManager()


async def flow_daemon():
    """Background task to check and execute flows."""
    logger.info("Flow daemon started")
    while True:
        try:
            flows = flow_service.get_flows_to_run()
            for flow in flows:
                try:
                    executed = flow_service.execute_flow(flow.name)
                    if executed:
                        logger.info(f"Flow '{flow.name}' executed successfully")
                    else:
                        logger.info(f"Flow '{flow.name}' skipped (execute=false)")
                except Exception as e:
                    logger.error(f"Flow '{flow.name}' failed: {e}")
        except Exception as e:
            logger.error(f"Flow daemon error: {e}")

        await asyncio.sleep(60)


# Response Models
class TerminalOutputResponse(BaseModel):
    output: str
    mode: str


class AgentProviderConfigResponse(BaseModel):
    agent_profile: str = Field(description="Agent profile identifier")
    provider: str = Field(description="Configured provider override")


class AgentProviderConfigRequest(BaseModel):
    provider: str = Field(description="Provider identifier", examples=["codex_cli"])

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, value: str) -> str:
        if value not in PROVIDERS:
            raise ValueError(f"Provider must be one of {', '.join(PROVIDERS)}")
        return value


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("Starting CLI Agent Orchestrator server...")
    setup_logging()
    init_db()

    # Run cleanup in background
    asyncio.create_task(asyncio.to_thread(cleanup_old_data))

    # Start flow daemon as background task
    daemon_task = asyncio.create_task(flow_daemon())

    # Start inbox watcher
    inbox_observer = PollingObserver(timeout=INBOX_POLLING_INTERVAL)
    inbox_observer.schedule(LogFileHandler(), str(TERMINAL_LOG_DIR), recursive=False)
    inbox_observer.start()
    logger.info("Inbox watcher started (PollingObserver)")

    yield

    # Stop inbox observer
    inbox_observer.stop()
    inbox_observer.join()
    logger.info("Inbox watcher stopped")

    # Cancel daemon on shutdown
    daemon_task.cancel()
    try:
        await daemon_task
    except asyncio.CancelledError:
        pass

    logger.info("Shutting down CLI Agent Orchestrator server...")


app = FastAPI(
    title="CLI Agent Orchestrator",
    description="Simplified CLI Agent Orchestrator API",
    version=SERVER_VERSION,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://127.0.0.1:3004"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "cli-agent-orchestrator"}


@app.get(
    "/agent-provider-configs",
    response_model=List[AgentProviderConfigResponse],
    summary="List agent provider overrides",
)
async def list_agent_provider_configs() -> List[Dict[str, str]]:
    try:
        return agent_config_service.list_provider_configs()
    except Exception as exc:
        logger.error("Failed to list agent provider configs: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list agent provider configs: {exc}",
        )


@app.put(
    "/agent-provider-configs/{agent_profile}",
    response_model=AgentProviderConfigResponse,
    summary="Upsert agent provider override",
)
async def upsert_agent_provider_config(
    agent_profile: Annotated[str, Path(description="Agent profile identifier")],
    payload: AgentProviderConfigRequest,
) -> Dict[str, str]:
    try:
        return agent_config_service.set_provider_for_profile(agent_profile, payload.provider)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error("Failed to upsert agent provider config: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set provider config: {exc}",
        )


@app.delete(
    "/agent-provider-configs/{agent_profile}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete agent provider override",
)
async def delete_agent_provider_config(
    agent_profile: Annotated[str, Path(description="Agent profile identifier")],
) -> Response:
    try:
        deleted = agent_config_service.clear_provider_for_profile(agent_profile)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No provider override configured for '{agent_profile}'",
            )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to delete agent provider config: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete provider config: {exc}",
        )


@app.post("/sessions", response_model=Terminal, status_code=status.HTTP_201_CREATED)
async def create_session(
    provider: str,
    agent_profile: str,
    session_name: str = None,
    working_directory: str = None,
    full_permissions: bool = Query(default=False),
) -> Terminal:
    """Create a new session with exactly one terminal."""
    logger.info(
        f"Creating session: provider={provider}, agent_profile={agent_profile}, "
        f"session_name={session_name}, working_directory={working_directory}, "
        f"full_permissions={full_permissions}"
    )
    try:
        result = terminal_service.create_terminal(
            provider=provider,
            agent_profile=agent_profile,
            session_name=session_name,
            new_session=True,
            working_directory=working_directory,
            full_permissions=full_permissions,
        )
        logger.info(f"Session created successfully: {result.id}")
        return result

    except ValueError as e:
        logger.error(f"ValueError creating session: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Exception creating session: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}",
        )


@app.get("/sessions")
async def list_sessions() -> List[Dict]:
    try:
        return session_service.list_sessions()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list sessions: {str(e)}",
        )


@app.get("/sessions/archived")
async def list_archived_sessions() -> List[Dict]:
    """List all archived sessions."""
    try:
        return session_service.list_archived_sessions()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list archived sessions: {str(e)}",
        )


@app.get("/sessions/archived/{session_name}")
async def get_archived_session(session_name: str) -> Dict:
    """Get a specific archived session."""
    try:
        return session_service.get_archived_session(session_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get archived session: {str(e)}",
        )


@app.post("/sessions/{session_name}/archive")
async def archive_session(session_name: str, archived_by: Optional[str] = None) -> Dict:
    """Archive a session by snapshotting terminals and killing the tmux session."""
    try:
        result = session_service.archive_session(session_name, archived_by)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to archive session: {str(e)}",
        )


@app.get("/sessions/{session_name}")
async def get_session(session_name: str) -> Dict:
    try:
        return session_service.get_session(session_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session: {str(e)}",
        )


@app.delete("/sessions/{session_name}")
async def delete_session(session_name: str) -> Dict:
    try:
        success = session_service.delete_session(session_name)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}",
        )


@app.post(
    "/sessions/{session_name}/terminals",
    response_model=Terminal,
    status_code=status.HTTP_201_CREATED,
)
async def create_terminal_in_session(
    session_name: str,
    provider: str,
    agent_profile: str,
    working_directory: str = None,
    full_permissions: bool = Query(default=False),
) -> Terminal:
    """Create additional terminal in existing session."""
    try:
        result = terminal_service.create_terminal(
            provider=provider,
            agent_profile=agent_profile,
            session_name=session_name,
            new_session=False,
            working_directory=working_directory,
            full_permissions=full_permissions,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create terminal: {str(e)}",
        )


@app.get("/sessions/{session_name}/terminals")
async def list_terminals_in_session(session_name: str) -> List[Dict]:
    """List all terminals in a session."""
    try:
        from cli_agent_orchestrator.clients.database import list_terminals_by_session

        return list_terminals_by_session(session_name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list terminals: {str(e)}",
        )


@app.get("/terminals/{terminal_id}", response_model=Terminal)
async def get_terminal(terminal_id: TerminalId) -> Terminal:
    try:
        terminal = terminal_service.get_terminal(terminal_id)
        return Terminal(**terminal)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get terminal: {str(e)}",
        )


@app.post("/terminals/{terminal_id}/input")
async def send_terminal_input(terminal_id: TerminalId, message: str) -> Dict:
    try:
        success = terminal_service.send_input(terminal_id, message)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send input: {str(e)}",
        )


@app.get("/terminals/{terminal_id}/output", response_model=TerminalOutputResponse)
async def get_terminal_output(
    terminal_id: TerminalId, mode: OutputMode = OutputMode.FULL
) -> TerminalOutputResponse:
    try:
        output = terminal_service.get_output(terminal_id, mode)
        return TerminalOutputResponse(output=output, mode=mode)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get output: {str(e)}",
        )


@app.post("/terminals/{terminal_id}/exit")
async def exit_terminal(terminal_id: TerminalId) -> Dict:
    """Send provider-specific exit command to terminal."""
    try:
        provider = provider_manager.get_provider(terminal_id)
        exit_command = provider.exit_cli()
        terminal_service.send_input(terminal_id, exit_command)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to exit terminal: {str(e)}",
        )


@app.delete("/terminals/{terminal_id}")
async def delete_terminal(terminal_id: TerminalId) -> Dict:
    """Delete a terminal."""
    try:
        success = terminal_service.delete_terminal(terminal_id)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete terminal: {str(e)}",
        )


@app.post("/terminals/{terminal_id}/open")
async def open_terminal_in_tmux(terminal_id: TerminalId) -> Dict:
    """Open Linux terminal and attach to tmux session."""
    try:
        terminal = terminal_service.get_terminal(terminal_id)
        session_name = terminal["session_name"]

        # Try to open terminal emulator with tmux attach command
        import shutil
        import subprocess

        # Command to attach to tmux session
        attach_command = f"tmux attach-session -t {session_name}"

        # Try different terminal emulators in order of preference
        terminal_emulators = [
            (
                "gnome-terminal",
                ["gnome-terminal", "--", "bash", "-c", f"{attach_command}; exec bash"],
            ),
            ("konsole", ["konsole", "-e", f"{attach_command}"]),
            ("xfce4-terminal", ["xfce4-terminal", "-e", f"{attach_command}"]),
            ("xterm", ["xterm", "-e", f"{attach_command}"]),
            ("alacritty", ["alacritty", "-e", "bash", "-c", f"{attach_command}; exec bash"]),
            ("kitty", ["kitty", "bash", "-c", f"{attach_command}; exec bash"]),
            ("terminator", ["terminator", "-e", f"{attach_command}"]),
        ]

        opened = False
        used_emulator = None

        for emulator_name, command in terminal_emulators:
            if shutil.which(emulator_name):
                try:
                    subprocess.Popen(command, start_new_session=True)
                    opened = True
                    used_emulator = emulator_name
                    logger.info(f"Opened terminal '{emulator_name}' for session {session_name}")
                    break
                except Exception as e:
                    logger.warning(f"Failed to open {emulator_name}: {e}")
                    continue

        return {
            "success": opened,
            "session_name": session_name,
            "attach_command": attach_command,
            "terminal_emulator": used_emulator,
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to open terminal: {str(e)}",
        )


@app.post("/terminals/{receiver_id}/inbox/messages")
async def create_inbox_message_endpoint(
    receiver_id: TerminalId, sender_id: str, message: str
) -> Dict:
    """Create inbox message and attempt immediate delivery."""
    try:
        inbox_msg = create_inbox_message(sender_id, receiver_id, message)
        inbox_service.check_and_send_pending_messages(receiver_id)

        return {
            "success": True,
            "message_id": inbox_msg.id,
            "sender_id": inbox_msg.sender_id,
            "receiver_id": inbox_msg.receiver_id,
            "created_at": inbox_msg.created_at.isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create inbox message: {str(e)}",
        )


@app.get("/terminals/{terminal_id}/inbox/messages")
async def get_inbox_messages(
    terminal_id: str,
    message_status: Optional[str] = Query(None, alias="status"),
    direction: Optional[str] = "all",
) -> Dict:
    """
    Get all inbox messages for a terminal.

    Args:
        terminal_id: Terminal ID to fetch messages for
        message_status: Filter by message status (pending/delivered/failed)
        direction: Filter by direction (sent/received/all)

    Returns:
        JSON with messages array and count
    """
    try:
        # Validate parameters
        if message_status and message_status not in ["pending", "delivered", "failed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status parameter"
            )

        if direction not in ["sent", "received", "all"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid direction parameter"
            )

        with SessionLocal() as session:
            # Build query based on direction
            query = session.query(InboxModel)

            if direction == "sent":
                query = query.filter(InboxModel.sender_id == terminal_id)
            elif direction == "received":
                query = query.filter(InboxModel.receiver_id == terminal_id)
            else:  # 'all'
                query = query.filter(
                    or_(
                        InboxModel.sender_id == terminal_id,
                        InboxModel.receiver_id == terminal_id,
                    )
                )

            # Apply status filter if provided
            if message_status:
                query = query.filter(InboxModel.status == message_status)

            # Order by created_at DESC (newest first)
            query = query.order_by(InboxModel.created_at.desc())

            # Execute query
            db_messages = query.all()

            # Convert to response format
            messages = [
                {
                    "id": msg.id,
                    "sender_id": msg.sender_id,
                    "receiver_id": msg.receiver_id,
                    "message": msg.message,
                    "status": msg.status,
                    "created_at": msg.created_at.isoformat(),
                    "delivered_at": msg.delivered_at.isoformat() if msg.delivered_at else None,
                }
                for msg in db_messages
            ]

            return {"messages": messages, "count": len(messages)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching inbox messages for terminal {terminal_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get("/inbox/messages/pending/count")
async def get_pending_messages_count(include_archived: bool = Query(default=True)) -> Dict:
    """
    Get total count of pending messages across all terminals.

    Args:
        include_archived: If False, only count pending messages for active (non-archived) sessions.
                         Default is True for backward compatibility.
    """
    try:
        with SessionLocal() as db_session:
            query = db_session.query(InboxModel).filter(InboxModel.status == "pending")

            # If include_archived is False, filter to only active sessions
            if not include_archived:
                # Get all active session names
                active_sessions = session_service.list_sessions()
                active_terminal_ids = set()
                for sess in active_sessions:
                    for terminal in sess.get("terminals", []):
                        active_terminal_ids.add(terminal["id"])

                # Filter messages to only those with receiver_id in active terminals
                if active_terminal_ids:
                    query = query.filter(InboxModel.receiver_id.in_(active_terminal_ids))
                else:
                    # No active terminals, return 0
                    return {"count": 0, "pending_messages": 0}

            count = query.count()
            return {"count": count, "pending_messages": count}
    except Exception as e:
        logger.error(f"Error fetching pending messages count: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get("/terminals/{terminal_id}/inbox/messages/pending/count")
async def get_terminal_pending_messages_count(terminal_id: str) -> Dict:
    """Get count of pending messages for a specific terminal."""
    try:
        with SessionLocal() as session:
            count = (
                session.query(InboxModel)
                .filter(
                    and_(
                        InboxModel.receiver_id == terminal_id,
                        InboxModel.status == "pending",
                    )
                )
                .count()
            )

            return {
                "terminal_id": terminal_id,
                "count": count,
                "pending_messages": count,
            }
    except Exception as e:
        logger.error(f"Error fetching pending count for terminal {terminal_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# Flow endpoints
@app.post("/flows", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def add_flow(file_path: str) -> Dict:
    """Add flow from file."""
    try:
        flow = flow_service.add_flow(file_path)
        return {
            "name": flow.name,
            "file_path": flow.file_path,
            "schedule": flow.schedule,
            "agent_profile": flow.agent_profile,
            "provider": flow.provider,
            "script": flow.script,
            "enabled": flow.enabled,
            "last_run": flow.last_run.isoformat() if flow.last_run else None,
            "next_run": flow.next_run.isoformat() if flow.next_run else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add flow: {str(e)}",
        )


@app.get("/flows")
async def list_flows() -> List[Dict]:
    """List all flows."""
    try:
        flows = flow_service.list_flows()
        return [
            {
                "name": flow.name,
                "file_path": flow.file_path,
                "schedule": flow.schedule,
                "agent_profile": flow.agent_profile,
                "provider": flow.provider,
                "script": flow.script,
                "enabled": flow.enabled,
                "last_run": flow.last_run.isoformat() if flow.last_run else None,
                "next_run": flow.next_run.isoformat() if flow.next_run else None,
            }
            for flow in flows
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list flows: {str(e)}",
        )


@app.get("/flows/{flow_name}")
async def get_flow(flow_name: str) -> Dict:
    """Get flow by name."""
    try:
        flow = flow_service.get_flow(flow_name)
        return {
            "name": flow.name,
            "file_path": flow.file_path,
            "schedule": flow.schedule,
            "agent_profile": flow.agent_profile,
            "provider": flow.provider,
            "script": flow.script,
            "enabled": flow.enabled,
            "last_run": flow.last_run.isoformat() if flow.last_run else None,
            "next_run": flow.next_run.isoformat() if flow.next_run else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get flow: {str(e)}",
        )


@app.delete("/flows/{flow_name}")
async def remove_flow(flow_name: str) -> Dict:
    """Remove flow."""
    try:
        success = flow_service.remove_flow(flow_name)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove flow: {str(e)}",
        )


@app.post("/flows/{flow_name}/enable")
async def enable_flow(flow_name: str) -> Dict:
    """Enable flow."""
    try:
        success = flow_service.enable_flow(flow_name)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enable flow: {str(e)}",
        )


@app.post("/flows/{flow_name}/disable")
async def disable_flow(flow_name: str) -> Dict:
    """Disable flow."""
    try:
        success = flow_service.disable_flow(flow_name)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disable flow: {str(e)}",
        )


@app.post("/flows/{flow_name}/execute")
async def execute_flow(flow_name: str) -> Dict:
    """Execute flow manually."""
    try:
        executed = flow_service.execute_flow(flow_name)
        return {"success": True, "executed": executed}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute flow: {str(e)}",
        )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await ws_manager.connect(websocket)
    try:
        while True:
            payload = await websocket.receive_text()
            await ws_manager.handle_message(websocket, payload)
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await ws_manager.disconnect(websocket)
        raise


def main():
    """Entry point for cao-server command."""
    import uvicorn

    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)


if __name__ == "__main__":
    main()
