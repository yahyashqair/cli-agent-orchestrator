"""Single FastAPI entry point for all HTTP routes."""

import asyncio
import logging
import json
from pathlib import Path as FilePath
from contextlib import asynccontextmanager
from typing import List, Dict, Optional, Annotated, Set
from fastapi import FastAPI, HTTPException, status, Path, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from watchdog.observers.polling import PollingObserver

from cli_agent_orchestrator.clients.database import init_db, create_inbox_message
from cli_agent_orchestrator.services import session_service, terminal_service, flow_service, inbox_service
from cli_agent_orchestrator.services.cleanup_service import cleanup_old_data
from cli_agent_orchestrator.services.inbox_service import LogFileHandler
from cli_agent_orchestrator.services.terminal_service import OutputMode
from cli_agent_orchestrator.models.terminal import Terminal, TerminalId
from cli_agent_orchestrator.constants import SERVER_VERSION, SERVER_HOST, SERVER_PORT, TERMINAL_LOG_DIR, INBOX_POLLING_INTERVAL
from cli_agent_orchestrator.utils.logging import setup_logging
from cli_agent_orchestrator.utils.terminal import generate_session_name
from cli_agent_orchestrator.providers.manager import provider_manager

logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket: {e}")
                disconnected.add(connection)

        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()


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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "cli-agent-orchestrator"}


@app.post("/sessions", response_model=Terminal, status_code=status.HTTP_201_CREATED)
async def create_session(
    provider: str,
    agent_profile: str,
    session_name: str = None,
    working_directory: str = None
) -> Terminal:
    """Create a new session with exactly one terminal."""
    try:
        result = terminal_service.create_terminal(
            provider=provider,
            agent_profile=agent_profile,
            session_name=session_name,
            new_session=True,
            working_directory=working_directory
        )
        return result

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create session: {str(e)}")


@app.get("/sessions")
async def list_sessions() -> List[Dict]:
    try:
        return session_service.list_sessions()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to list sessions: {str(e)}")


@app.get("/sessions/{session_name}")
async def get_session(session_name: str) -> Dict:
    try:
        return session_service.get_session(session_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get session: {str(e)}")


@app.delete("/sessions/{session_name}")
async def delete_session(session_name: str) -> Dict:
    try:
        success = session_service.delete_session(session_name)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete session: {str(e)}")


@app.post("/sessions/{session_name}/terminals", response_model=Terminal, status_code=status.HTTP_201_CREATED)
async def create_terminal_in_session(
    session_name: str,
    provider: str,
    agent_profile: str,
    working_directory: str = None
) -> Terminal:
    """Create additional terminal in existing session."""
    try:
        result = terminal_service.create_terminal(
            provider=provider,
            agent_profile=agent_profile,
            session_name=session_name,
            new_session=False,
            working_directory=working_directory
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create terminal: {str(e)}")


@app.get("/sessions/{session_name}/terminals")
async def list_terminals_in_session(session_name: str) -> List[Dict]:
    """List all terminals in a session."""
    try:
        from cli_agent_orchestrator.clients.database import list_terminals_by_session
        return list_terminals_by_session(session_name)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to list terminals: {str(e)}")


@app.get("/terminals/{terminal_id}", response_model=Terminal)
async def get_terminal(terminal_id: TerminalId) -> Terminal:
    try:
        terminal = terminal_service.get_terminal(terminal_id)
        return Terminal(**terminal)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get terminal: {str(e)}")


@app.post("/terminals/{terminal_id}/input")
async def send_terminal_input(terminal_id: TerminalId, message: str) -> Dict:
    try:
        success = terminal_service.send_input(terminal_id, message)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send input: {str(e)}")


@app.get("/terminals/{terminal_id}/output", response_model=TerminalOutputResponse)
async def get_terminal_output(terminal_id: TerminalId, mode: OutputMode = OutputMode.FULL) -> TerminalOutputResponse:
    try:
        output = terminal_service.get_output(terminal_id, mode)
        return TerminalOutputResponse(output=output, mode=mode)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to get output: {str(e)}")


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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to exit terminal: {str(e)}")


@app.delete("/terminals/{terminal_id}")
async def delete_terminal(terminal_id: TerminalId) -> Dict:
    """Delete a terminal."""
    try:
        success = terminal_service.delete_terminal(terminal_id)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete terminal: {str(e)}")


@app.post("/terminals/{receiver_id}/inbox/messages")
async def create_inbox_message_endpoint(receiver_id: TerminalId, sender_id: str, message: str) -> Dict:
    """Create inbox message and attempt immediate delivery."""
    try:
        inbox_msg = create_inbox_message(sender_id, receiver_id, message)
        inbox_service.check_and_send_pending_messages(receiver_id)

        return {
            "success": True,
            "message_id": inbox_msg.id,
            "sender_id": inbox_msg.sender_id,
            "receiver_id": inbox_msg.receiver_id,
            "created_at": inbox_msg.created_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create inbox message: {str(e)}")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()

            # Send current sessions state when requested
            if data == "get_sessions":
                sessions = session_service.list_sessions()
                await websocket.send_json({
                    "type": "sessions_update",
                    "data": sessions
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


def main():
    """Entry point for cao-server command."""
    import uvicorn
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)


if __name__ == "__main__":
    main()
