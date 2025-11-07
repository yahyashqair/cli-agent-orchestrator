"""Terminal service with workflow functions."""

import logging
from enum import Enum
from typing import Dict

from cli_agent_orchestrator.clients.database import create_terminal as db_create_terminal
from cli_agent_orchestrator.clients.database import delete_terminal as db_delete_terminal
from cli_agent_orchestrator.clients.database import (
    get_terminal_metadata,
    update_last_active,
)
from cli_agent_orchestrator.clients.tmux import tmux_client
from cli_agent_orchestrator.constants import SESSION_PREFIX, TERMINAL_LOG_DIR
from cli_agent_orchestrator.models.terminal import Terminal
from cli_agent_orchestrator.providers.manager import provider_manager
from cli_agent_orchestrator.utils.terminal import (
    generate_session_name,
    generate_terminal_id,
    generate_window_name,
)

logger = logging.getLogger(__name__)


class OutputMode(str, Enum):
    """Output mode for terminal history."""

    FULL = "full"
    LAST = "last"


def create_terminal(
    provider: str,
    agent_profile: str,
    session_name: str = None,
    new_session: bool = False,
    working_directory: str = None,
    full_permissions: bool = False,
) -> Terminal:
    """Create terminal, optionally creating new session with it."""
    logger.info(
        f"create_terminal called: provider={provider}, agent_profile={agent_profile}, "
        f"session_name={session_name}, new_session={new_session}, "
        f"working_directory={working_directory}, full_permissions={full_permissions}"
    )
    try:
        terminal_id = generate_terminal_id()
        logger.debug(f"Generated terminal_id: {terminal_id}")

        # Generate session name if not provided
        if not session_name:
            session_name = generate_session_name()
            logger.debug(f"Generated session_name: {session_name}")

        window_name = generate_window_name(agent_profile)
        logger.debug(f"Generated window_name: {window_name}")

        if new_session:
            # Apply SESSION_PREFIX if not already present
            if not session_name.startswith(SESSION_PREFIX):
                session_name = f"{SESSION_PREFIX}{session_name}"
                logger.debug(f"Added prefix to session_name: {session_name}")

            # Check if session already exists
            logger.debug(f"Checking if session exists: {session_name}")
            if tmux_client.session_exists(session_name):
                raise ValueError(f"Session '{session_name}' already exists")

            # Create new tmux session with this terminal as the initial window
            logger.info(f"Creating new tmux session: {session_name}")
            tmux_client.create_session(
                session_name,
                window_name,
                terminal_id,
                working_directory,
                provider,
                agent_profile,
            )
            logger.info(f"Tmux session created: {session_name}")
        else:
            # Add window to existing session
            logger.debug(f"Checking if session exists: {session_name}")
            if not tmux_client.session_exists(session_name):
                raise ValueError(f"Session '{session_name}' not found")
            logger.info(f"Creating window in existing session: {session_name}")
            window_name = tmux_client.create_window(
                session_name,
                window_name,
                terminal_id,
                working_directory,
                provider,
                agent_profile,
            )
            logger.info(f"Window created: {window_name}")

        # Save terminal metadata to database
        logger.debug("Saving terminal metadata to database")
        db_create_terminal(
            terminal_id,
            session_name,
            window_name,
            provider,
            agent_profile,
            working_directory,
            full_permissions,
        )
        logger.debug("Terminal metadata saved")

        # Initialize provider
        logger.info(f"Creating provider instance: {provider}")
        provider_instance = provider_manager.create_provider(
            provider,
            terminal_id,
            session_name,
            window_name,
            agent_profile,
            working_directory,
            full_permissions=full_permissions,
        )
        logger.info(f"Initializing provider: {provider}")
        provider_instance.initialize()
        logger.info(f"Provider initialized: {provider}")

        # Create log file and start pipe-pane
        log_path = TERMINAL_LOG_DIR / f"{terminal_id}.log"
        logger.debug(f"Creating log file: {log_path}")
        log_path.touch()  # Ensure file exists before watching
        logger.debug("Starting pipe-pane")
        tmux_client.pipe_pane(session_name, window_name, str(log_path))
        logger.debug("Pipe-pane started")

        terminal = Terminal(
            id=terminal_id,
            name=window_name,
            provider=provider,
            session_name=session_name,
            agent_profile=agent_profile,
            full_permissions=full_permissions,
        )

        logger.info(
            f"Created terminal: {terminal_id} in session: {session_name} (new_session={new_session})"
        )
        return terminal

    except Exception as e:
        logger.error(f"Failed to create terminal: {e}", exc_info=True)
        if new_session:
            try:
                logger.debug(f"Attempting to clean up session: {session_name}")
                tmux_client.kill_session(session_name)
            except Exception as cleanup_err:
                logger.error(f"Failed to cleanup session: {cleanup_err}")
        raise


def get_terminal(terminal_id: str) -> Dict:
    """Get terminal data."""
    try:
        metadata = get_terminal_metadata(terminal_id)
        if not metadata:
            raise ValueError(f"Terminal '{terminal_id}' not found")

        # Get status from provider
        provider = provider_manager.get_provider(terminal_id)
        status = provider.get_status().value

        return {
            "id": metadata["id"],
            "name": metadata["tmux_window"],
            "provider": metadata["provider"],
            "session_name": metadata["tmux_session"],
            "agent_profile": metadata["agent_profile"],
            "status": status,
            "last_active": metadata["last_active"],
            "full_permissions": metadata.get("full_permissions", False),
        }

    except Exception as e:
        logger.error(f"Failed to get terminal {terminal_id}: {e}")
        raise


def send_input(terminal_id: str, message: str) -> bool:
    """Send input to terminal."""
    try:
        metadata = get_terminal_metadata(terminal_id)
        if not metadata:
            raise ValueError(f"Terminal '{terminal_id}' not found")

        tmux_client.send_keys(metadata["tmux_session"], metadata["tmux_window"], message)

        update_last_active(terminal_id)
        logger.info(f"Sent input to terminal: {terminal_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to send input to terminal {terminal_id}: {e}")
        raise


def get_output(terminal_id: str, mode: OutputMode = OutputMode.FULL) -> str:
    """Get terminal output."""
    try:
        metadata = get_terminal_metadata(terminal_id)
        if not metadata:
            raise ValueError(f"Terminal '{terminal_id}' not found")

        full_output = tmux_client.get_history(metadata["tmux_session"], metadata["tmux_window"])

        if mode == OutputMode.FULL:
            return full_output
        elif mode == OutputMode.LAST:
            provider = provider_manager.get_provider(terminal_id)
            return provider.extract_last_message_from_script(full_output)

    except Exception as e:
        logger.error(f"Failed to get output from terminal {terminal_id}: {e}")
        raise


def delete_terminal(terminal_id: str) -> bool:
    """Delete terminal."""
    try:
        # Get metadata before deletion
        metadata = get_terminal_metadata(terminal_id)

        if metadata:
            # Stop pipe-pane
            try:
                tmux_client.stop_pipe_pane(metadata["tmux_session"], metadata["tmux_window"])
            except Exception as e:
                logger.warning(f"Failed to stop pipe-pane for {terminal_id}: {e}")

            # Kill the tmux window
            try:
                tmux_client.kill_window(metadata["tmux_session"], metadata["tmux_window"])
            except Exception as e:
                logger.warning(f"Failed to kill tmux window for {terminal_id}: {e}")

        # Existing cleanup
        provider_manager.cleanup_provider(terminal_id)
        deleted = db_delete_terminal(terminal_id)
        logger.info(f"Deleted terminal: {terminal_id}")
        return deleted

    except Exception as e:
        logger.error(f"Failed to delete terminal {terminal_id}: {e}")
        raise
