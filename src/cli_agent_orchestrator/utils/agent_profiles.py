"""Agent profile utilities."""

from importlib import resources
from pathlib import Path

import frontmatter

from cli_agent_orchestrator.constants import LOCAL_AGENT_STORE_DIR
from cli_agent_orchestrator.models.agent_profile import AgentProfile
from cli_agent_orchestrator.utils.mcp_config import get_cao_mcp_command


def load_agent_profile(agent_name: str) -> AgentProfile:
    """Load agent profile from local or built-in agent store."""
    try:
        # Check local store first
        local_profile = LOCAL_AGENT_STORE_DIR / f"{agent_name}.md"
        if local_profile.exists():
            profile_data = frontmatter.loads(local_profile.read_text())
            profile_data.metadata["system_prompt"] = profile_data.content.strip()
            return _populate_mcp_config(AgentProfile(**profile_data.metadata))

        # Fall back to built-in store
        agent_store = resources.files("cli_agent_orchestrator.agent_store")
        profile_file = agent_store / f"{agent_name}.md"

        if not profile_file.is_file():
            raise FileNotFoundError(f"Agent profile not found: {agent_name}")

        # Parse frontmatter
        profile_data = frontmatter.loads(profile_file.read_text())

        # Add system_prompt from markdown content
        profile_data.metadata["system_prompt"] = profile_data.content.strip()

        # Let Pydantic handle the nested object parsing including mcpServers
        return _populate_mcp_config(AgentProfile(**profile_data.metadata))

    except Exception as e:
        raise RuntimeError(f"Failed to load agent profile '{agent_name}': {e}")


def _populate_mcp_config(profile: AgentProfile) -> AgentProfile:
    """Auto-populate MCP server configuration if not specified.
    
    If cao-mcp-server is configured but has no command, auto-detect it.
    """
    if not profile.mcpServers:
        return profile
    
    # Check if cao-mcp-server needs auto-detection
    cao_mcp = profile.mcpServers.get("cao-mcp-server")
    if cao_mcp and not cao_mcp.get("command"):
        # Auto-detect command
        cmd_parts = get_cao_mcp_command()
        cao_mcp["command"] = cmd_parts[0]
        cao_mcp["args"] = cmd_parts[1:]
    
    return profile
