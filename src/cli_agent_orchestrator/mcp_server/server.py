"""CLI Agent Orchestrator MCP Server implementation."""

import asyncio
import logging
import os
import time
from typing import Any, Dict, Tuple

import requests
from fastmcp import FastMCP
from pydantic import Field

from cli_agent_orchestrator.constants import API_BASE_URL
from cli_agent_orchestrator.mcp_server.models import HandoffResult
from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.services import agent_config_service
from cli_agent_orchestrator.utils.agent_profiles import load_agent_profile
from cli_agent_orchestrator.utils.terminal import generate_session_name, wait_until_terminal_status

# Create MCP server
mcp = FastMCP(
    "cao-mcp-server",
    instructions="""
    # CLI Agent Orchestrator MCP Server

    This server provides tools to facilitate terminal delegation within CLI Agent Orchestrator sessions.

    ## Best Practices

    - Use specific agent profiles and providers
    - Provide clear and concise messages
    - Ensure you're running within a CAO terminal (CAO_TERMINAL_ID must be set)
    """,
)


def _create_terminal(agent_profile: str) -> Tuple[str, str]:
    """Create a new terminal with the specified agent profile.

    Args:
        agent_profile: Agent profile for the terminal

    Returns:
        Tuple of (terminal_id, provider)

    Raises:
        Exception: If terminal creation fails
    """
    profile_provider = None

    try:
        profile = load_agent_profile(agent_profile)
        profile_provider = getattr(profile, "provider", None)
    except Exception as exc:
        raise RuntimeError(
            f"Agent profile '{agent_profile}' is not installed. Run `cao install` before invoking it."
        ) from exc

    configured_provider = agent_config_service.get_provider_for_profile(agent_profile)
    provider = agent_config_service.resolve_provider(
        agent_profile,
        profile_provider=profile_provider,
        configured_provider=configured_provider,
    )

    # Get current terminal ID from environment
    current_terminal_id = os.environ.get("CAO_TERMINAL_ID")
    if current_terminal_id:
        # Get terminal metadata via API
        response = requests.get(f"{API_BASE_URL}/terminals/{current_terminal_id}")
        response.raise_for_status()
        terminal_metadata = response.json()

        session_name = terminal_metadata["session_name"]
        working_directory = terminal_metadata.get("working_directory")  # Inherit from parent

        if not configured_provider and not profile_provider:
            inherited_provider = terminal_metadata["provider"]
        else:
            inherited_provider = None

        provider = agent_config_service.resolve_provider(
            agent_profile,
            profile_provider=profile_provider,
            inherited_provider=inherited_provider,
            configured_provider=configured_provider,
        )

        # Create new terminal in existing session
        params = {"provider": provider, "agent_profile": agent_profile}
        if working_directory:
            params["working_directory"] = working_directory
        response = requests.post(
            f"{API_BASE_URL}/sessions/{session_name}/terminals",
            params=params,
        )
        response.raise_for_status()
        terminal = response.json()
    elif session_name := os.environ.get("CAO_SESSION_NAME"):
        # Fallback for environments that pass session metadata but not terminal IDs
        inherited_provider = os.environ.get("CAO_PROVIDER")
        selected_provider = agent_config_service.resolve_provider(
            agent_profile,
            profile_provider=profile_provider,
            inherited_provider=inherited_provider,
            configured_provider=configured_provider,
        )
        working_directory = os.environ.get("CAO_WORKING_DIRECTORY")

        params = {"provider": selected_provider, "agent_profile": agent_profile}
        if working_directory:
            params["working_directory"] = working_directory

        response = requests.post(
            f"{API_BASE_URL}/sessions/{session_name}/terminals",
            params=params,
        )
        response.raise_for_status()
        terminal = response.json()
        provider = selected_provider
    else:
        # Create new session with terminal - use current working directory
        session_name = generate_session_name()
        working_directory = os.getcwd()
        response = requests.post(
            f"{API_BASE_URL}/sessions",
            params={
                "provider": provider,
                "agent_profile": agent_profile,
                "session_name": session_name,
                "working_directory": working_directory,
            },
        )
        response.raise_for_status()
        terminal = response.json()

    return terminal["id"], provider


def _send_direct_input(terminal_id: str, message: str) -> None:
    """Send input directly to a terminal (bypasses inbox).

    Args:
        terminal_id: Terminal ID
        message: Message to send

    Raises:
        Exception: If sending fails
    """
    response = requests.post(
        f"{API_BASE_URL}/terminals/{terminal_id}/input", params={"message": message}
    )
    response.raise_for_status()


def _send_to_inbox(receiver_id: str, message: str) -> Dict[str, Any]:
    """Send message to another terminal's inbox (queued delivery when IDLE).

    Args:
        receiver_id: Target terminal ID
        message: Message content

    Returns:
        Dict with message details

    Raises:
        ValueError: If CAO_TERMINAL_ID not set
        Exception: If API call fails
    """
    sender_id = os.getenv("CAO_TERMINAL_ID")
    if not sender_id:
        raise ValueError("CAO_TERMINAL_ID not set - cannot determine sender")

    response = requests.post(
        f"{API_BASE_URL}/terminals/{receiver_id}/inbox/messages",
        params={"sender_id": sender_id, "message": message},
    )
    response.raise_for_status()
    return response.json()


@mcp.tool()
async def handoff(
    agent_profile: str = Field(
        description='The agent profile to hand off to (e.g., "developer", "analyst")'
    ),
    message: str = Field(description="The message/task to send to the target agent"),
    timeout: int = Field(
        default=600,
        description="Maximum time to wait for the agent to complete the task (in seconds)",
        ge=1,
        le=3600,
    ),
) -> HandoffResult:
    """Hand off a task to another agent via CAO terminal and wait for completion.

    This tool allows handing off tasks to other agents by creating a new terminal
    in the same session. It sends the message, waits for completion, and captures the output.

    ## Usage

    Use this tool to hand off tasks to another agent and wait for the results.
    The tool will:
    1. Create a new terminal with the specified agent profile and provider
    2. Send the message to the terminal
    3. Monitor until completion
    4. Return the agent's response
    5. Clean up the terminal with /exit

    ## Requirements

    - Must be called from within a CAO terminal (CAO_TERMINAL_ID environment variable)
    - Target session must exist and be accessible

    Args:
        agent_profile: The agent profile for the new terminal
        message: The task/message to send
        timeout: Maximum wait time in seconds

    Returns:
        HandoffResult with success status, message, and agent output
    """
    start_time = time.time()

    try:
        # Create terminal
        terminal_id, provider = _create_terminal(agent_profile)

        # Wait for terminal to be IDLE before sending message
        if not wait_until_terminal_status(terminal_id, TerminalStatus.IDLE, timeout=30.0):
            return HandoffResult(
                success=False,
                message=f"Terminal {terminal_id} did not reach IDLE status within 30 seconds",
                output=None,
                terminal_id=terminal_id,
            )

        await asyncio.sleep(2)  # wait another 2s

        # Send message to terminal
        _send_direct_input(terminal_id, message)

        # Monitor until completion with timeout
        if not wait_until_terminal_status(
            terminal_id, TerminalStatus.COMPLETED, timeout=timeout, polling_interval=1.0
        ):
            return HandoffResult(
                success=False,
                message=f"Handoff timed out after {timeout} seconds",
                output=None,
                terminal_id=terminal_id,
            )

        # Get the response
        response = requests.get(
            f"{API_BASE_URL}/terminals/{terminal_id}/output", params={"mode": "last"}
        )
        response.raise_for_status()
        output_data = response.json()
        output = output_data["output"]

        # Send provider-specific exit command to cleanup terminal
        response = requests.post(f"{API_BASE_URL}/terminals/{terminal_id}/exit")
        response.raise_for_status()

        execution_time = time.time() - start_time

        return HandoffResult(
            success=True,
            message=f"Successfully handed off to {agent_profile} ({provider}) in {execution_time:.2f}s",
            output=output,
            terminal_id=terminal_id,
        )

    except Exception as e:
        # Enhanced error handling with specific error codes
        error_msg = str(e)

        if "Agent profile" in error_msg and "not installed" in error_msg:
            return HandoffResult(
                success=False,
                message=f"Failed to create terminal with agent '{agent_profile}'",
                error_code="AGENT_NOT_INSTALLED",
                suggestion=f"Run 'cao install {agent_profile}' to install this agent profile",
                debug_info={
                    "agent_profile": agent_profile,
                    "error": error_msg,
                },
            )
        elif "Connection refused" in error_msg:
            return HandoffResult(
                success=False,
                message="Cannot connect to CAO server",
                error_code="SERVER_NOT_RUNNING",
                suggestion="Start the server with 'cao-server' in another terminal",
                debug_info={
                    "api_url": API_BASE_URL,
                    "error": error_msg,
                },
            )
        elif "Session" in error_msg and "not found" in error_msg:
            return HandoffResult(
                success=False,
                message="Parent session not found",
                error_code="SESSION_NOT_FOUND",
                suggestion="Your terminal session may have been closed. Try launching a new agent.",
                debug_info={
                    "agent_profile": agent_profile,
                    "error": error_msg,
                },
            )
        else:
            return HandoffResult(
                success=False,
                message=f"Handoff failed: {error_msg}",
                error_code="UNKNOWN_ERROR",
                suggestion="Check logs with: tail -f ~/.aws/cli-agent-orchestrator/logs/cao-server.log",
                debug_info={
                    "agent_profile": agent_profile,
                    "exception_type": type(e).__name__,
                    "error": error_msg,
                },
            )


@mcp.tool()
async def assign(
    agent_profile: str = Field(
        description='The agent profile for the worker agent (e.g., "developer", "analyst")'
    ),
    message: str = Field(
        description="The task message to send. Include callback instructions for the worker to send results back."
    ),
) -> Dict[str, Any]:
    """Assigns a task to another agent without blocking.

    In the message to the worker agent include instruction to send results back via send_message tool.
    **IMPORTANT**: The terminal id of each agent is available in environment variable CAO_TERMINAL_ID.
    When assigning, first find out your own CAO_TERMINAL_ID value, then include the terminal_id value in the message to the worker agent to allow callback.
    Example message: "Analyze the logs. When done, send results back to terminal ee3f93b3 using send_message tool."

    Args:
        agent_profile: Agent profile for the worker terminal
        message: Task message (include callback instructions)

    Returns:
        Dict with success status, worker terminal_id, and message
    """
    try:
        # Create terminal
        terminal_id, _ = _create_terminal(agent_profile)

        # Send message immediately
        _send_direct_input(terminal_id, message)

        return {
            "success": True,
            "terminal_id": terminal_id,
            "message": f"Task assigned to {agent_profile} (terminal: {terminal_id})",
        }

    except Exception as e:
        # Enhanced error handling for assign
        error_msg = str(e)

        if "Agent profile" in error_msg and "not installed" in error_msg:
            return {
                "success": False,
                "terminal_id": None,
                "message": f"Failed to create terminal with agent '{agent_profile}'",
                "error_code": "AGENT_NOT_INSTALLED",
                "suggestion": f"Run 'cao install {agent_profile}' to install this agent profile",
                "debug_info": {
                    "agent_profile": agent_profile,
                    "error": error_msg,
                },
            }
        elif "Connection refused" in error_msg:
            return {
                "success": False,
                "terminal_id": None,
                "message": "Cannot connect to CAO server",
                "error_code": "SERVER_NOT_RUNNING",
                "suggestion": "Start the server with 'cao-server' in another terminal",
                "debug_info": {
                    "api_url": API_BASE_URL,
                    "error": error_msg,
                },
            }
        else:
            return {
                "success": False,
                "terminal_id": None,
                "message": f"Assignment failed: {error_msg}",
                "error_code": "UNKNOWN_ERROR",
                "suggestion": "Check logs with: tail -f ~/.aws/cli-agent-orchestrator/logs/cao-server.log",
                "debug_info": {
                    "agent_profile": agent_profile,
                    "exception_type": type(e).__name__,
                    "error": error_msg,
                },
            }


@mcp.tool()
async def send_message(
    receiver_id: str = Field(description="Target terminal ID to send message to"),
    message: str = Field(description="Message content to send"),
) -> Dict[str, Any]:
    """Send a message to another terminal's inbox.

    The message will be delivered when the destination terminal is IDLE.
    Messages are delivered in order (oldest first).

    Args:
        receiver_id: Terminal ID of the receiver
        message: Message content to send

    Returns:
        Dict with success status and message details
    """
    try:
        return _send_to_inbox(receiver_id, message)
    except ValueError as e:
        # Specific error for CAO_TERMINAL_ID not set
        if "CAO_TERMINAL_ID not set" in str(e):
            return {
                "success": False,
                "error": str(e),
                "error_code": "TERMINAL_ID_NOT_SET",
                "suggestion": "send_message() can only be used from within a CAO terminal. "
                "Make sure you're calling this from an agent terminal.",
                "debug_info": {
                    "receiver_id": receiver_id,
                    "error": str(e),
                },
            }
        else:
            return {
                "success": False,
                "error": str(e),
                "error_code": "VALIDATION_ERROR",
                "suggestion": "Check that the receiver_id is a valid terminal ID.",
                "debug_info": {
                    "receiver_id": receiver_id,
                    "error": str(e),
                },
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "error_code": "UNKNOWN_ERROR",
            "suggestion": "Check logs with: tail -f ~/.aws/cli-agent-orchestrator/logs/cao-server.log",
            "debug_info": {
                "receiver_id": receiver_id,
                "exception_type": type(e).__name__,
                "error": str(e),
            },
        }


def main():
    """Main entry point for the MCP server."""
    mcp.run()


if __name__ == "__main__":
    main()
