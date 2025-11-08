"""Session service for session-level operations."""

import logging
from typing import Dict, List

from cli_agent_orchestrator.clients.database import archive_session as db_archive_session
from cli_agent_orchestrator.clients.database import (
    delete_terminals_by_session,
)
from cli_agent_orchestrator.clients.database import get_archived_session as db_get_archived_session
from cli_agent_orchestrator.clients.database import (
    get_archived_session_names,
)
from cli_agent_orchestrator.clients.database import (
    list_archived_sessions as db_list_archived_sessions,
)
from cli_agent_orchestrator.clients.database import (
    list_terminals_by_session,
    update_archived_terminal_status,
)
from cli_agent_orchestrator.clients.tmux import tmux_client
from cli_agent_orchestrator.constants import SESSION_PREFIX
from cli_agent_orchestrator.providers.manager import provider_manager

logger = logging.getLogger(__name__)


def list_sessions() -> List[Dict]:
    """List all sessions from tmux with their terminals."""
    try:
        tmux_sessions = tmux_client.list_sessions()
        sessions = []

        # Get archived session names to exclude them
        archived_names = set(get_archived_session_names())

        for s in tmux_sessions:
            if s["id"].startswith(SESSION_PREFIX):
                # Skip archived sessions
                if s["name"] in archived_names:
                    continue

                # Get terminals for this session
                raw_terminals = list_terminals_by_session(s["name"])
                terminals = []

                for terminal in raw_terminals:
                    status = "UNKNOWN"
                    try:
                        provider = provider_manager.get_provider(terminal["id"])
                        status = provider.get_status().value
                    except Exception as exc:  # Provider might not be initialized yet
                        logger.debug(
                            "Unable to resolve status for terminal %s: %s",
                            terminal["id"],
                            exc,
                        )

                    # Normalize status to uppercase
                    status = status.upper() if status else "UNKNOWN"

                    last_active = terminal.get("last_active")
                    terminals.append(
                        {
                            "id": terminal["id"],
                            "session_name": terminal["tmux_session"],
                            "provider": terminal["provider"],
                            "agent_profile": terminal.get("agent_profile") or "unknown",
                            "status": status,
                            "last_active": last_active.isoformat() if last_active else None,
                            "created_at": terminal.get("created_at"),
                            "updated_at": last_active.isoformat() if last_active else None,
                            "full_permissions": bool(terminal.get("full_permissions", False)),
                        }
                    )

                sessions.append(
                    {
                        "name": s["name"],
                        "terminal_count": len(terminals),
                        "terminals": terminals,
                    }
                )

        return sessions
    except Exception as e:
        logger.error(f"Failed to list sessions: {e}")
        return []


def get_session(session_name: str) -> Dict:
    """Get session with terminals."""
    try:
        if not tmux_client.session_exists(session_name):
            raise ValueError(f"Session '{session_name}' not found")

        tmux_sessions = tmux_client.list_sessions()
        session_data = next((s for s in tmux_sessions if s["id"] == session_name), None)

        if not session_data:
            raise ValueError(f"Session '{session_name}' not found")

        terminals = list_terminals_by_session(session_name)
        return {"session": session_data, "terminals": terminals}

    except Exception as e:
        logger.error(f"Failed to get session {session_name}: {e}")
        raise


def delete_session(session_name: str) -> bool:
    """Delete session and cleanup."""
    try:
        if not tmux_client.session_exists(session_name):
            raise ValueError(f"Session '{session_name}' not found")

        terminals = list_terminals_by_session(session_name)

        # Cleanup providers
        for terminal in terminals:
            provider_manager.cleanup_provider(terminal["id"])

        # Kill tmux session
        tmux_client.kill_session(session_name)

        # Delete terminal metadata
        delete_terminals_by_session(session_name)

        logger.info(f"Deleted session: {session_name}")
        return True

    except Exception as e:
        logger.error(f"Failed to delete session {session_name}: {e}")
        raise


def archive_session(session_name: str, archived_by: str = None) -> Dict:
    """
    Archive a session by snapshotting all terminals, killing the tmux session,
    and moving metadata to archived tables.
    """
    try:
        # Validate session exists
        if not tmux_client.session_exists(session_name):
            raise ValueError(f"Session '{session_name}' not found")

        # Get terminals and their current statuses
        raw_terminals = list_terminals_by_session(session_name)
        terminal_statuses = {}

        for terminal in raw_terminals:
            status = "UNKNOWN"
            try:
                provider = provider_manager.get_provider(terminal["id"])
                status = provider.get_status().value.upper()
            except Exception as exc:
                logger.debug(
                    "Unable to resolve status for terminal %s: %s",
                    terminal["id"],
                    exc,
                )
            terminal_statuses[terminal["id"]] = status

        # Archive to database (this also deletes terminal metadata)
        archived_data = db_archive_session(session_name, archived_by)

        # Update statuses in archived terminals
        for terminal_id, status in terminal_statuses.items():
            update_archived_terminal_status(session_name, terminal_id, status)

        # Cleanup providers
        for terminal in raw_terminals:
            try:
                provider_manager.cleanup_provider(terminal["id"])
            except Exception as exc:
                logger.warning(
                    "Failed to cleanup provider for terminal %s: %s",
                    terminal["id"],
                    exc,
                )

        # Kill tmux session
        tmux_client.kill_session(session_name)

        logger.info(f"Archived session: {session_name}")

        # Refresh archived data with updated statuses
        return db_get_archived_session(session_name)

    except Exception as e:
        logger.error(f"Failed to archive session {session_name}: {e}")
        raise


def list_archived_sessions() -> List[Dict]:
    """List all archived sessions."""
    try:
        return db_list_archived_sessions()
    except Exception as e:
        logger.error(f"Failed to list archived sessions: {e}")
        return []


def get_archived_session(session_name: str) -> Dict:
    """Get archived session detail."""
    try:
        session = db_get_archived_session(session_name)
        if not session:
            raise ValueError(f"Archived session '{session_name}' not found")
        return session
    except Exception as e:
        logger.error(f"Failed to get archived session {session_name}: {e}")
        raise
