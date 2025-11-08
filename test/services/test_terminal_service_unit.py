"""Regression tests for terminal_service helpers."""

from types import SimpleNamespace

from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.services import terminal_service


def test_get_terminal_includes_working_directory(monkeypatch):
    """Ensure the terminal payload exposes the working directory."""

    metadata = {
        "id": "abcd1234",
        "tmux_session": "cao-test",
        "tmux_window": "dev",
        "provider": "codex_cli",
        "agent_profile": "developer",
        "working_directory": "/repo/project",
        "full_permissions": False,
        "last_active": None,
    }

    monkeypatch.setattr(
        "cli_agent_orchestrator.services.terminal_service.get_terminal_metadata",
        lambda terminal_id: metadata,
    )

    class ProviderStub:
        def get_status(self):
            return TerminalStatus.IDLE

    monkeypatch.setattr(
        "cli_agent_orchestrator.services.terminal_service.provider_manager",
        SimpleNamespace(get_provider=lambda terminal_id: ProviderStub()),
    )

    result = terminal_service.get_terminal("abcd1234")

    assert result["working_directory"] == "/repo/project"
