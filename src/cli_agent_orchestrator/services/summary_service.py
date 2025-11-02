"""Aggregated view of sessions, terminals, and activity."""

from datetime import datetime
from typing import Dict, List

from cli_agent_orchestrator.clients.database import list_terminals_by_session
from cli_agent_orchestrator.services import session_service, terminal_service


def build_summary() -> Dict[str, List[Dict]]:
    """Return a snapshot of sessions and their terminals.

    For each terminal we include status metadata and the most recent
    provider-specific message to give operators visibility into the
    agent's current work.
    """
    sessions = session_service.list_sessions()
    session_summaries = []

    for session in sessions:
        session_name = session.get("id") or session.get("session_name")
        if not session_name:
            continue

        terminal_rows = list_terminals_by_session(session_name)
        terminals = []
        for row in terminal_rows:
            terminal_id = row["id"]
            try:
                terminal_data = terminal_service.get_terminal(terminal_id)
                last_message = terminal_service.get_output(terminal_id, terminal_service.OutputMode.LAST)
            except Exception:
                # If the provider is unavailable (e.g. tmux window closed) we still
                # surface the terminal metadata to operators.
                terminal_data = {
                    "id": terminal_id,
                    "name": row.get("tmux_window"),
                    "provider": row.get("provider"),
                    "session_name": row.get("tmux_session"),
                    "agent_profile": row.get("agent_profile"),
                    "status": "unknown",
                    "last_active": row.get("last_active"),
                }
                last_message = ""

            terminals.append({
                **terminal_data,
                "last_active": _serialize_datetime(terminal_data.get("last_active")),
                "last_message": last_message,
            })

        session_summaries.append({
            "session_name": session_name,
            "created_at": session.get("created_at"),
            "terminals": terminals,
        })

    return {
        "sessions": session_summaries,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


def _serialize_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value
