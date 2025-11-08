"""Auto-detect MCP server command based on environment."""

import os
import shutil
from typing import List


def get_cao_mcp_command() -> List[str]:
    """Auto-detect cao-mcp-server command.

    Priority:
    1. CAO_MCP_COMMAND env var (user override)
    2. cao-mcp-server in PATH (uv tool install)
    3. CAO_REPO_ROOT env var (development)
    4. uvx fallback (portable)

    Returns:
        List[str]: Command and arguments for cao-mcp-server
    """
    # Allow user override
    if cmd := os.environ.get("CAO_MCP_COMMAND"):
        return cmd.split()

    # Check if installed via uv tool
    if shutil.which("cao-mcp-server"):
        return ["cao-mcp-server"]

    # Check if running from repo
    if repo_root := os.environ.get("caO_REPO_ROOT"):
        return ["uv", "run", "--directory", repo_root, "cao-mcp-server"]

    # Portable fallback
    return [
        "uvx",
        "--from",
        "git+https://github.com/awslabs/cli-agent-orchestrator.git@main",
        "cao-mcp-server",
    ]


def get_provider_command(provider: str) -> str:
    """Get the command for a specific provider.

    Args:
        provider: Provider name (q_cli, claude_code, etc.)

    Returns:
        str: Command name for the provider

    Raises:
        ValueError: If provider is not supported
    """
    provider_commands = {
        "q_cli": "q",
        "claude_code": "claude",
        "codex_cli": "codex",
        "copilot_cli": "copilot",
        "opencode": "opencode",
    }

    if provider not in provider_commands:
        raise ValueError(f"Unsupported provider: {provider}")

    return provider_commands[provider]


def validate_provider_available(provider: str) -> tuple[bool, str]:
    """Check if provider command is available in PATH.

    Args:
        provider: Provider name

    Returns:
        tuple: (is_available, error_message)
    """
    try:
        cmd = get_provider_command(provider)
        if not shutil.which(cmd):
            return False, f"Provider command '{cmd}' not found in PATH"
        return True, ""
    except ValueError as e:
        return False, str(e)


def get_default_mcp_config() -> dict:
    """Get default MCP configuration for cao-mcp-server.

    Returns:
        dict: MCP server configuration with auto-detected command
    """
    cmd_parts = get_cao_mcp_command()
    return {
        "type": "stdio",
        "command": cmd_parts[0],
        "args": cmd_parts[1:],
    }
