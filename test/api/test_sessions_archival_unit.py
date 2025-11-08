"""Unit tests for session archival API endpoints."""

import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient


def test_archive_session_endpoint_success(monkeypatch):
    """Test POST /sessions/{session_name}/archive success path."""
    from cli_agent_orchestrator.api.main import app

    client = TestClient(app)

    # Mock the session_service.archive_session to return a successful response
    mock_result = {
        "name": "test-session",
        "archived_at": "2025-11-08T10:00:00",
        "archived_by": "test_user",
        "terminals": []
    }

    with patch("cli_agent_orchestrator.api.main.session_service.archive_session", return_value=mock_result):
        response = client.post("/sessions/test-session/archive")

    assert response.status_code == 200
    assert response.json()["name"] == "test-session"


def test_archive_session_endpoint_not_found(monkeypatch):
    """Test POST /sessions/{session_name}/archive returns 404 when session not found."""
    from cli_agent_orchestrator.api.main import app

    client = TestClient(app)

    # Mock the session_service.archive_session to raise ValueError
    with patch("cli_agent_orchestrator.api.main.session_service.archive_session", side_effect=ValueError("Session 'nonexistent' not found")):
        response = client.post("/api/sessions/nonexistent/archive")

    assert response.status_code == 404


def test_list_archived_sessions_endpoint(monkeypatch):
    """Test GET /sessions/archived returns list of archived sessions."""
    from cli_agent_orchestrator.api.main import app

    client = TestClient(app)

    # Mock the session_service.list_archived_sessions
    mock_result = [
        {
            "name": "session1",
            "archived_at": "2025-11-08T10:00:00",
            "archived_by": "user1",
            "terminal_count": 2,
            "terminals": []
        }
    ]

    with patch("cli_agent_orchestrator.api.main.session_service.list_archived_sessions", return_value=mock_result):
        response = client.get("/sessions/archived")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_archived_session_endpoint(monkeypatch):
    """Test GET /sessions/archived/{session_name} returns archived session details."""
    from cli_agent_orchestrator.api.main import app

    client = TestClient(app)

    # Mock the session_service.get_archived_session
    mock_result = {
        "name": "test-session",
        "archived_at": "2025-11-08T10:00:00",
        "archived_by": "user1",
        "terminal_count": 1,
        "terminals": [
            {
                "id": "term1",
                "provider": "q_cli",
                "agent_profile": "developer",
                "status": "IDLE"
            }
        ]
    }

    with patch("cli_agent_orchestrator.api.main.session_service.get_archived_session", return_value=mock_result):
        response = client.get("/sessions/archived/test-session")

    assert response.status_code == 200
    assert response.json()["name"] == "test-session"


def test_get_archived_session_endpoint_not_found(monkeypatch):
    """Test GET /sessions/archived/{session_name} returns 404 when not found."""
    from cli_agent_orchestrator.api.main import app

    client = TestClient(app)

    # Mock the session_service.get_archived_session to raise ValueError
    with patch("cli_agent_orchestrator.api.main.session_service.get_archived_session", side_effect=ValueError("Archived session 'nonexistent' not found")):
        response = client.get("/api/sessions/archived/nonexistent")

    assert response.status_code == 404


def test_pending_messages_count_exclude_archived(monkeypatch):
    """Test GET /inbox/messages/pending/count with include_archived=false."""
    from cli_agent_orchestrator.api.main import app

    client = TestClient(app)

    # Mock session_service.list_sessions to return active sessions
    mock_sessions = [
        {
            "name": "active-session",
            "terminals": [
                {"id": "term1", "status": "IDLE"},
                {"id": "term2", "status": "PROCESSING"}
            ]
        }
    ]

    # Mock database query
    with patch("cli_agent_orchestrator.api.main.session_service.list_sessions", return_value=mock_sessions):
        with patch("cli_agent_orchestrator.api.main.SessionLocal") as mock_session:
            # Mock query to return a count
            mock_db = Mock()
            mock_query = Mock()
            mock_query.filter.return_value = mock_query
            mock_query.count.return_value = 5
            mock_db.query.return_value = mock_query
            mock_session.return_value.__enter__.return_value = mock_db
            mock_session.return_value.__exit__.return_value = None

            response = client.get("/inbox/messages/pending/count?include_archived=false")

    assert response.status_code == 200
    assert "count" in response.json()


def test_pending_messages_count_include_archived_default(monkeypatch):
    """Test GET /inbox/messages/pending/count defaults to include_archived=true."""
    from cli_agent_orchestrator.api.main import app

    client = TestClient(app)

    # Mock database query
    with patch("cli_agent_orchestrator.api.main.SessionLocal") as mock_session:
        mock_db = Mock()
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 10
        mock_db.query.return_value = mock_query
        mock_session.return_value.__enter__.return_value = mock_db
        mock_session.return_value.__exit__.return_value = None

        response = client.get("/inbox/messages/pending/count")

    assert response.status_code == 200
    assert response.json()["count"] == 10
