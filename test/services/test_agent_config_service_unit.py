"""Unit tests for the agent_config_service helpers."""

import pytest

from cli_agent_orchestrator.services import agent_config_service


def test_set_provider_for_profile_validates_provider():
    with pytest.raises(ValueError):
        agent_config_service.set_provider_for_profile("developer", "unknown")


def test_set_provider_for_profile_delegates(monkeypatch):
    recorded = {}

    def fake_set(agent_profile, provider):
        recorded["agent_profile"] = agent_profile
        recorded["provider"] = provider
        return {"agent_profile": agent_profile, "provider": provider}

    monkeypatch.setattr(
        "cli_agent_orchestrator.services.agent_config_service.set_agent_provider_config",
        fake_set,
    )

    result = agent_config_service.set_provider_for_profile("developer", "codex_cli")
    assert result == {"agent_profile": "developer", "provider": "codex_cli"}
    assert recorded == {"agent_profile": "developer", "provider": "codex_cli"}


def test_get_provider_for_profile_returns_none(monkeypatch):
    monkeypatch.setattr(
        "cli_agent_orchestrator.services.agent_config_service.get_agent_provider_config",
        lambda profile: None,
    )
    assert agent_config_service.get_provider_for_profile("reviewer") is None


def test_resolve_provider_prioritizes_override():
    resolved = agent_config_service.resolve_provider(
        "developer",
        profile_provider="claude_code",
        inherited_provider="q_cli",
        configured_provider="codex_cli",
    )
    assert resolved == "codex_cli"


def test_resolve_provider_falls_back_to_inherited():
    resolved = agent_config_service.resolve_provider(
        "developer",
        profile_provider=None,
        inherited_provider="codex_cli",
        configured_provider=None,
    )
    assert resolved == "codex_cli"


def test_clear_provider_for_profile_delegates(monkeypatch):
    called = {}

    def fake_delete(agent_profile):
        called["agent_profile"] = agent_profile
        return True

    monkeypatch.setattr(
        "cli_agent_orchestrator.services.agent_config_service.delete_agent_provider_config",
        fake_delete,
    )

    assert agent_config_service.clear_provider_for_profile("developer") is True
    assert called == {"agent_profile": "developer"}
