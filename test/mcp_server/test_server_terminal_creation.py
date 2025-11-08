"""Tests for MCP server terminal creation provider selection."""

import os
from unittest.mock import MagicMock, patch

import pytest

from cli_agent_orchestrator.mcp_server.server import _create_terminal

META_ENV_VARS = [
    "CAO_TERMINAL_ID",
    "CAO_SESSION_NAME",
    "CAO_PROVIDER",
    "CAO_WORKING_DIRECTORY",
]


@pytest.fixture(autouse=True)
def clear_env():
    originals = {key: os.environ.get(key) for key in META_ENV_VARS}
    try:
        for key in META_ENV_VARS:
            os.environ.pop(key, None)
        yield
    finally:
        for key, value in originals.items():
            if value is not None:
                os.environ[key] = value
            else:
                os.environ.pop(key, None)


@pytest.fixture(autouse=True)
def clear_provider_overrides(monkeypatch):
    monkeypatch.setattr(
        "cli_agent_orchestrator.mcp_server.server.agent_config_service.get_provider_for_profile",
        lambda profile: None,
    )


@patch("cli_agent_orchestrator.mcp_server.server.requests.post")
@patch("cli_agent_orchestrator.mcp_server.server.requests.get")
@patch("cli_agent_orchestrator.mcp_server.server.load_agent_profile")
def test_create_terminal_respects_agent_provider(mock_load, mock_get, mock_post):
    """Agent-level provider should drive worker creation inside an existing session."""
    os.environ["CAO_TERMINAL_ID"] = "super123"

    profile = MagicMock()
    profile.provider = "codex_cli"
    mock_load.return_value = profile

    mock_get.return_value.raise_for_status.return_value = None
    mock_get.return_value.json.return_value = {
        "provider": "q_cli",
        "session_name": "cao-test-session",
        "working_directory": "/test/working/dir",
    }

    mock_post.return_value.raise_for_status.return_value = None
    mock_post.return_value.json.return_value = {"id": "worker456"}

    terminal_id, provider = _create_terminal("log_analyst_codex")

    assert terminal_id == "worker456"
    assert provider == "codex_cli"

    # Verify the call was made with working_directory inherited from parent
    call_args = mock_post.call_args
    assert call_args[0][0] in [
        "http://localhost:9889/sessions/cao-test-session/terminals",
        "http://127.0.0.1:9889/sessions/cao-test-session/terminals",
    ]
    assert call_args[1]["params"]["provider"] == "codex_cli"
    assert call_args[1]["params"]["agent_profile"] == "log_analyst_codex"
    assert call_args[1]["params"]["working_directory"] == "/test/working/dir"


@patch("cli_agent_orchestrator.mcp_server.server.requests.post")
@patch("cli_agent_orchestrator.mcp_server.server.requests.get")
@patch("cli_agent_orchestrator.mcp_server.server.load_agent_profile")
def test_create_terminal_prefers_configured_override(mock_load, mock_get, mock_post, monkeypatch):
    """Configured override should take precedence over inherited provider."""
    os.environ["CAO_TERMINAL_ID"] = "super123"

    profile = MagicMock()
    profile.provider = None
    mock_load.return_value = profile

    mock_get.return_value.raise_for_status.return_value = None
    mock_get.return_value.json.return_value = {
        "provider": "q_cli",
        "session_name": "cao-test-session",
        "working_directory": "/test/working/dir",
    }

    monkeypatch.setattr(
        "cli_agent_orchestrator.mcp_server.server.agent_config_service.get_provider_for_profile",
        lambda profile_name: "copilot_cli",
    )

    mock_post.return_value.raise_for_status.return_value = None
    mock_post.return_value.json.return_value = {"id": "worker457"}

    terminal_id, provider = _create_terminal("developer")

    assert terminal_id == "worker457"
    assert provider == "copilot_cli"

    call_args = mock_post.call_args
    assert call_args[1]["params"]["provider"] == "copilot_cli"


@patch("cli_agent_orchestrator.mcp_server.server.requests.post")
@patch("cli_agent_orchestrator.mcp_server.server.requests.get")
@patch("cli_agent_orchestrator.mcp_server.server.load_agent_profile")
def test_create_terminal_inherits_parent_working_directory(mock_load, mock_get, mock_post):
    """Workers inherit the parent's working directory via the terminals API."""

    os.environ["CAO_TERMINAL_ID"] = "super123"

    profile = MagicMock()
    profile.provider = None
    mock_load.return_value = profile

    mock_get.return_value.raise_for_status.return_value = None
    mock_get.return_value.json.return_value = {
        "provider": "q_cli",
        "session_name": "cao-test-session",
        "working_directory": "/workspace/cao",
    }

    mock_post.return_value.raise_for_status.return_value = None
    mock_post.return_value.json.return_value = {"id": "worker458"}

    terminal_id, provider = _create_terminal("developer")

    assert terminal_id == "worker458"
    assert provider == "q_cli"

    params = mock_post.call_args[1]["params"]
    assert params["working_directory"] == "/workspace/cao"


@patch(
    "cli_agent_orchestrator.mcp_server.server.generate_session_name",
    return_value="cao-test-session",
)
@patch("cli_agent_orchestrator.mcp_server.server.requests.post")
@patch("cli_agent_orchestrator.mcp_server.server.load_agent_profile")
def test_create_terminal_defaults_when_provider_missing(mock_load, mock_post, mock_session_name):
    """Use DEFAULT_PROVIDER when the profile omits provider metadata."""
    profile = MagicMock()
    profile.provider = None
    mock_load.return_value = profile

    mock_post.return_value.raise_for_status.return_value = None
    mock_post.return_value.json.return_value = {"id": "worker789"}

    terminal_id, provider = _create_terminal("legacy_agent")

    assert terminal_id == "worker789"
    assert provider == "q_cli"

    # Verify the call was made with working_directory set to current directory
    call_args = mock_post.call_args
    assert call_args[0][0] in [
        "http://localhost:9889/sessions",
        "http://127.0.0.1:9889/sessions",
    ]
    assert call_args[1]["params"]["provider"] == "q_cli"
    assert call_args[1]["params"]["agent_profile"] == "legacy_agent"
    assert call_args[1]["params"]["session_name"] == "cao-test-session"
    assert "working_directory" in call_args[1]["params"]  # Should have current working dir


@patch(
    "cli_agent_orchestrator.mcp_server.server.load_agent_profile",
    side_effect=RuntimeError("missing profile"),
)
def test_create_terminal_errors_when_profile_missing(mock_load):
    """Raise a helpful error when the agent profile is not installed."""
    with pytest.raises(RuntimeError, match="Agent profile 'unknown_agent' is not installed"):
        _create_terminal("unknown_agent")


@patch("cli_agent_orchestrator.mcp_server.server.requests.post")
@patch("cli_agent_orchestrator.mcp_server.server.load_agent_profile")
def test_create_terminal_uses_session_env_when_terminal_missing(mock_load, mock_post):
    """Fallback to session metadata when terminal ID is not available."""
    profile = MagicMock()
    profile.provider = None
    mock_load.return_value = profile

    os.environ["CAO_SESSION_NAME"] = "cao-test-session"
    os.environ["CAO_PROVIDER"] = "codex_cli"
    os.environ["CAO_WORKING_DIRECTORY"] = "/tmp/work"

    mock_post.return_value.raise_for_status.return_value = None
    mock_post.return_value.json.return_value = {"id": "worker222"}

    terminal_id, provider = _create_terminal("legacy_agent")

    assert terminal_id == "worker222"
    assert provider == "codex_cli"

    call_args = mock_post.call_args
    assert call_args[0][0] in [
        "http://localhost:9889/sessions/cao-test-session/terminals",
        "http://127.0.0.1:9889/sessions/cao-test-session/terminals",
    ]
    params = call_args[1]["params"]
    assert params["agent_profile"] == "legacy_agent"
    assert params["provider"] == "codex_cli"
    assert params["working_directory"] == "/tmp/work"
