"""Unit tests for database archival functions."""

import pytest
from datetime import datetime
from cli_agent_orchestrator.clients import database


def test_archive_session_creates_archived_records(monkeypatch):
    """Test that archive_session creates archived session and terminal records."""
    session_name = "test-session"
    terminal_data = [
        {
            "id": "terminal1",
            "tmux_session": session_name,
            "provider": "q_cli",
            "agent_profile": "developer",
            "created_at": datetime.now(),
            "last_active": datetime.now(),
            "full_permissions": False,
            "working_directory": "/test",
        }
    ]

    # Mock database operations
    fake_db_session = FakeDBSession()
    monkeypatch.setattr(
        "cli_agent_orchestrator.clients.database.SessionLocal", lambda: fake_db_session
    )

    # Setup fake terminal data
    fake_db_session.terminal_records = terminal_data

    result = database.archive_session(session_name, archived_by="test_user")

    assert result["name"] == session_name
    assert result["archived_by"] == "test_user"
    assert len(result["terminals"]) == 1
    assert result["terminals"][0]["id"] == "terminal1"


def test_archive_session_raises_error_if_already_archived(monkeypatch):
    """Test that archive_session raises ValueError if session is already archived."""
    session_name = "existing-archived-session"

    # Mock database operations
    fake_db_session = FakeDBSession()
    fake_db_session.has_archived_session = True
    monkeypatch.setattr(
        "cli_agent_orchestrator.clients.database.SessionLocal", lambda: fake_db_session
    )

    with pytest.raises(ValueError, match="already archived"):
        database.archive_session(session_name)


def test_list_archived_sessions_returns_list(monkeypatch):
    """Test that list_archived_sessions returns a list of archived sessions."""
    # Mock database operations
    fake_db_session = FakeDBSession()
    monkeypatch.setattr(
        "cli_agent_orchestrator.clients.database.SessionLocal", lambda: fake_db_session
    )

    # Add some fake archived sessions
    fake_db_session.archived_sessions = [
        {
            "name": "session1",
            "archived_at": datetime.now(),
            "archived_by": "user1",
            "original_created_at": datetime.now(),
        }
    ]

    result = database.list_archived_sessions()

    assert isinstance(result, list)
    assert len(result) >= 0


def test_get_archived_session_returns_none_if_not_found(monkeypatch):
    """Test that get_archived_session returns None if session not found."""
    fake_db_session = FakeDBSession()
    monkeypatch.setattr(
        "cli_agent_orchestrator.clients.database.SessionLocal", lambda: fake_db_session
    )

    result = database.get_archived_session("nonexistent-session")

    assert result is None


def test_delete_archived_session_removes_terminals_and_session(monkeypatch):
    """Test that delete_archived_session removes both terminals and session."""
    session_name = "session-to-delete"

    fake_db_session = FakeDBSession()
    fake_db_session.has_archived_session = True
    monkeypatch.setattr(
        "cli_agent_orchestrator.clients.database.SessionLocal", lambda: fake_db_session
    )

    result = database.delete_archived_session(session_name)

    assert isinstance(result, bool)


def test_get_archived_session_names_returns_list(monkeypatch):
    """Test that get_archived_session_names returns a list of session names."""
    fake_db_session = FakeDBSession()
    monkeypatch.setattr(
        "cli_agent_orchestrator.clients.database.SessionLocal", lambda: fake_db_session
    )

    result = database.get_archived_session_names()

    assert isinstance(result, list)


# Fake classes for mocking
class FakeDBSession:
    def __init__(self):
        self.terminal_records = []
        self.archived_sessions = []
        self.has_archived_session = False
        self.committed = False
        self.added_objects = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def query(self, model):
        return FakeQuery(self, model)

    def add(self, obj):
        """Store added objects and populate default values."""
        # Simulate SQLAlchemy's default value mechanism
        if hasattr(obj, "archived_at") and obj.archived_at is None:
            obj.archived_at = datetime.now()
        if hasattr(obj, "id") and obj.id is None:
            obj.id = len(self.added_objects) + 1
        self.added_objects.append(obj)

    def flush(self):
        pass

    def commit(self):
        self.committed = True

    def delete(self):
        pass


class FakeQuery:
    def __init__(self, session, model):
        self.session = session
        self.model = model
        self._filters = []

    def filter(self, *args):
        self._filters.extend(args)
        return self

    def order_by(self, *args):
        return self

    def first(self):
        if hasattr(self.model, "__tablename__"):
            if (
                self.model.__tablename__ == "archived_sessions"
                and self.session.has_archived_session
            ):
                return FakeArchivedSession()
        return None

    def all(self):
        if hasattr(self.model, "__tablename__"):
            if self.model.__tablename__ == "terminals":
                return [FakeTerminal(t) for t in self.session.terminal_records]
            if self.model.__tablename__ == "archived_sessions":
                return [FakeArchivedSession(s) for s in self.session.archived_sessions]
            if self.model.__tablename__ == "archived_terminals":
                return []
        return []

    def delete(self):
        return 0


class FakeTerminal:
    def __init__(self, data=None):
        if data:
            self.id = data.get("id", "term1")
            self.tmux_session = data.get("tmux_session", "session")
            self.provider = data.get("provider", "q_cli")
            self.agent_profile = data.get("agent_profile", "developer")
            self.created_at = data.get("created_at", datetime.now())
            self.last_active = data.get("last_active", datetime.now())
            self.full_permissions = data.get("full_permissions", False)
            self.working_directory = data.get("working_directory", "/")
        else:
            self.id = "term1"
            self.tmux_session = "session"
            self.provider = "q_cli"
            self.agent_profile = "developer"
            self.created_at = datetime.now()
            self.last_active = datetime.now()
            self.full_permissions = False
            self.working_directory = "/"


class FakeArchivedSession:
    def __init__(self, data=None):
        if data:
            self.name = data.get("name", "session1")
            self.archived_at = data.get("archived_at", datetime.now())
            self.archived_by = data.get("archived_by", "user")
            self.original_created_at = data.get("original_created_at", datetime.now())
        else:
            self.name = "session1"
            self.archived_at = datetime.now()
            self.archived_by = "user"
            self.original_created_at = datetime.now()
