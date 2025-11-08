"""FastAPI unit tests for agent provider configuration endpoints."""

from fastapi.testclient import TestClient

from cli_agent_orchestrator.api.main import app

client = TestClient(app)


def test_list_agent_provider_configs(monkeypatch):
    monkeypatch.setattr(
        "cli_agent_orchestrator.api.main.agent_config_service.list_provider_configs",
        lambda: [{"agent_profile": "developer", "provider": "codex_cli"}],
    )

    response = client.get("/agent-provider-configs")
    assert response.status_code == 200
    assert response.json() == [{"agent_profile": "developer", "provider": "codex_cli"}]


def test_put_agent_provider_config_success(monkeypatch):
    def fake_set(agent_profile, provider):
        return {"agent_profile": agent_profile, "provider": provider}

    monkeypatch.setattr(
        "cli_agent_orchestrator.api.main.agent_config_service.set_provider_for_profile",
        fake_set,
    )

    response = client.put(
        "/agent-provider-configs/developer",
        json={"provider": "codex_cli"},
    )
    assert response.status_code == 200
    assert response.json() == {"agent_profile": "developer", "provider": "codex_cli"}


def test_put_agent_provider_config_invalid(monkeypatch):
    def fake_set(agent_profile, provider):
        raise ValueError("Invalid provider")

    monkeypatch.setattr(
        "cli_agent_orchestrator.api.main.agent_config_service.set_provider_for_profile",
        fake_set,
    )

    response = client.put(
        "/agent-provider-configs/developer",
        json={"provider": "codex_cli"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid provider"


def test_delete_agent_provider_config_success(monkeypatch):
    monkeypatch.setattr(
        "cli_agent_orchestrator.api.main.agent_config_service.clear_provider_for_profile",
        lambda profile: True,
    )

    response = client.delete("/agent-provider-configs/developer")
    assert response.status_code == 204


def test_delete_agent_provider_config_not_found(monkeypatch):
    monkeypatch.setattr(
        "cli_agent_orchestrator.api.main.agent_config_service.clear_provider_for_profile",
        lambda profile: False,
    )

    response = client.delete("/agent-provider-configs/reviewer")
    assert response.status_code == 404
    assert "No provider override" in response.json()["detail"]
