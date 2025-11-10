"""Tests for inbox service scheduling."""

from datetime import datetime
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from cli_agent_orchestrator.clients import database
from cli_agent_orchestrator.models.inbox import MessageStatus
from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.services import inbox_service


@pytest.fixture
def isolated_inbox_service_db(monkeypatch):
    """Provide an isolated database for inbox service tests."""

    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", Session)

    database.Base.metadata.create_all(bind=engine)
    database.init_db()

    yield


def test_scheduler_delivers_message_when_idle(monkeypatch, isolated_inbox_service_db):
    """Scheduler should deliver the oldest ready message when terminal is idle."""

    message = database.create_inbox_message(
        "sender",
        "receiver",
        "hello agent",
        priority=30,
        metadata={"routing_policy": "small_task"},
    )

    class FakeProvider:
        def get_status(self, tail_lines=None):
            return TerminalStatus.IDLE

    monkeypatch.setattr(
        inbox_service.provider_manager,
        "get_provider",
        MagicMock(return_value=FakeProvider()),
    )

    captured = {}

    def fake_send_input(terminal_id: str, payload: str) -> bool:
        captured["terminal_id"] = terminal_id
        captured["payload"] = payload
        return True

    monkeypatch.setattr(inbox_service.terminal_service, "send_input", fake_send_input)

    delivered = inbox_service.check_and_send_pending_messages("receiver")
    assert delivered is True
    assert message.sender_id in captured["payload"]
    assert f"INBOX #{message.id}" in captured["payload"]

    stored = database.get_inbox_message(message.id)
    assert stored is not None
    assert stored.status == MessageStatus.PROCESSING


def test_scheduler_reschedules_on_failure(monkeypatch, isolated_inbox_service_db):
    """If delivery fails the message should be rescheduled with failure metadata."""

    message = database.create_inbox_message(
        "sender",
        "receiver",
        "reschedule me",
        metadata={"routing_policy": "small_task"},
    )

    class FailingProvider:
        def get_status(self, tail_lines=None):
            return TerminalStatus.IDLE

    monkeypatch.setattr(
        inbox_service.provider_manager,
        "get_provider",
        MagicMock(return_value=FailingProvider()),
    )

    def raise_error(*_, **__):
        raise RuntimeError("tmux offline")

    monkeypatch.setattr(inbox_service.terminal_service, "send_input", raise_error)

    delivered = inbox_service.check_and_send_pending_messages("receiver")
    assert delivered is False

    stored = database.get_inbox_message(message.id)
    assert stored is not None
    assert stored.status == MessageStatus.PENDING
    assert stored.metadata.get("last_error") == "tmux offline"
    assert stored.scheduled_at is not None
    assert stored.scheduled_at > datetime.now()
