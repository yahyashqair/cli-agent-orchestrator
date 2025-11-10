"""Inbox service with watchdog for automatic message delivery."""

import logging
import re
import subprocess
from pathlib import Path

from watchdog.events import FileModifiedEvent, FileSystemEventHandler

from cli_agent_orchestrator.clients.database import (
    dequeue_next_message,
    get_pending_messages,
    record_processing_failure,
)
from cli_agent_orchestrator.constants import INBOX_SERVICE_TAIL_LINES, TERMINAL_LOG_DIR
from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.providers.manager import provider_manager
from cli_agent_orchestrator.services import terminal_service

logger = logging.getLogger(__name__)


def _get_log_tail(terminal_id: str, lines: int = 5) -> str:
    """Get last N lines from terminal log file."""
    log_path = TERMINAL_LOG_DIR / f"{terminal_id}.log"
    try:
        result = subprocess.run(
            ["tail", "-n", str(lines), str(log_path)], capture_output=True, text=True, timeout=1
        )
        return result.stdout
    except Exception:
        return ""


def _has_idle_pattern(terminal_id: str) -> bool:
    """Check if log tail contains idle pattern without expensive tmux calls."""
    tail = _get_log_tail(terminal_id)
    if not tail:
        return False

    try:
        provider = provider_manager.get_provider(terminal_id)
        idle_pattern = provider.get_idle_pattern_for_log()
        return bool(re.search(idle_pattern, tail))
    except Exception:
        return False


def check_and_send_pending_messages(terminal_id: str) -> bool:
    """Attempt to schedule the next pending message for the terminal.

    This function checks the terminal's status, dequeues at most one message
    atomically, and streams it to the terminal input. Messages are marked as
    ``processing`` when dequeued and rescheduled with backoff if delivery fails.

    Args:
        terminal_id: Terminal ID to check messages for

    Returns:
        bool: True if a message was sent, False otherwise

    Raises:
        ValueError: If provider not found for terminal
    """

    provider = provider_manager.get_provider(terminal_id)
    status = provider.get_status(tail_lines=INBOX_SERVICE_TAIL_LINES)

    if status not in (TerminalStatus.IDLE, TerminalStatus.COMPLETED):
        logger.debug(f"Terminal {terminal_id} not ready (status={status})")
        return False

    message = dequeue_next_message(terminal_id)
    if not message:
        logger.debug(f"No pending inbox messages for {terminal_id}")
        return False

    policy = message.metadata.get("routing_policy", "unspecified")
    attempt = message.metadata.get("attempt", 1)
    notification_header = (
        f"[INBOX #{message.id} FROM {message.sender_id} | priority={message.priority}"
        f" | policy={policy} | attempt={attempt}]"
    )
    formatted_message = f"{notification_header}\n{message.message}"

    try:
        terminal_service.send_input(terminal_id, formatted_message)
        logger.info(
            "Delivered inbox message %s to %s (policy=%s, attempt=%s)",
            message.id,
            terminal_id,
            policy,
            attempt,
        )
        return True
    except Exception as exc:
        logger.error(
            "Failed to deliver inbox message %s to %s: %s",
            message.id,
            terminal_id,
            exc,
        )
        record_processing_failure(message, error=str(exc))
        return False


class LogFileHandler(FileSystemEventHandler):
    """Handler for terminal log file changes."""

    def on_modified(self, event):
        """Handle file modification events."""
        if isinstance(event, FileModifiedEvent) and event.src_path.endswith(".log"):
            log_path = Path(event.src_path)
            terminal_id = log_path.stem
            logger.debug(f"Log file modified: {terminal_id}.log")
            self._handle_log_change(terminal_id)

    def _handle_log_change(self, terminal_id: str):
        """Handle log file change and attempt message delivery."""
        try:
            # Check for pending messages first
            messages = get_pending_messages(terminal_id, limit=1)
            if not messages:
                logger.debug(f"No pending messages for {terminal_id}, skipping")
                return

            # Fast check: does log tail have idle pattern?
            if not _has_idle_pattern(terminal_id):
                logger.debug(
                    f"Terminal {terminal_id} not idle (no idle pattern in log tail), skipping"
                )
                return

            # Attempt delivery
            check_and_send_pending_messages(terminal_id)

        except Exception as e:
            logger.error(f"Error handling log change for {terminal_id}: {e}")
