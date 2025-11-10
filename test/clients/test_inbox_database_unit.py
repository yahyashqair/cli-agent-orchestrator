"""Inbox database workflow tests."""

from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from cli_agent_orchestrator.clients import database
from cli_agent_orchestrator.models.inbox import MessageStatus


@pytest.fixture
def isolated_inbox_db(monkeypatch):
    """Provide an isolated in-memory database for inbox tests."""

    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", Session)

    database.Base.metadata.create_all(bind=engine)
    database.init_db()

    yield


def test_dequeue_marks_message_processing(monkeypatch, isolated_inbox_db):
    """Dequeueing should mark message as processing and increment attempts."""

    created = database.create_inbox_message("sender", "receiver", "do work", priority=10)
    assert created.status == MessageStatus.PENDING

    dequeued = database.dequeue_next_message("receiver")
    assert dequeued is not None
    assert dequeued.id == created.id
    assert dequeued.status == MessageStatus.PROCESSING
    assert dequeued.processing_started_at is not None
    assert dequeued.metadata.get("attempt") == 1

    stored = database.get_inbox_message(created.id)
    assert stored is not None
    assert stored.status == MessageStatus.PROCESSING


def test_record_processing_failure_reschedules_message(monkeypatch, isolated_inbox_db):
    """Failed delivery should reschedule message with updated metadata."""

    created = database.create_inbox_message("sender", "receiver", "retry soon")
    dequeued = database.dequeue_next_message("receiver")
    assert dequeued is not None

    database.record_processing_failure(dequeued, error="tmux unavailable")

    stored = database.get_inbox_message(created.id)
    assert stored is not None
    assert stored.status == MessageStatus.PENDING
    assert stored.metadata.get("last_error") == "tmux unavailable"
    assert stored.metadata.get("failures")
    assert stored.scheduled_at is not None
    assert stored.scheduled_at > datetime.now()


def test_dequeue_honours_priority_and_schedule(monkeypatch, isolated_inbox_db):
    """Messages should be dequeued by priority and ready schedule."""

    past = datetime.now() - timedelta(minutes=5)
    future = datetime.now() + timedelta(minutes=5)

    database.create_inbox_message(
        "sender",
        "receiver",
        "low",
        priority=5,
        scheduled_at=past,
        metadata={"routing_policy": "small_task"},
    )
    future_message = database.create_inbox_message(
        "sender",
        "receiver",
        "future",
        priority=100,
        scheduled_at=future,
    )
    high_priority = database.create_inbox_message(
        "sender",
        "receiver",
        "high",
        priority=50,
        scheduled_at=past,
    )

    dequeued = database.dequeue_next_message("receiver")
    assert dequeued is not None
    assert dequeued.id == high_priority.id
    assert dequeued.metadata.get("attempt") == 1

    # The future message should remain pending
    future_stored = database.get_inbox_message(future_message.id)
    assert future_stored is not None
    assert future_stored.status == MessageStatus.PENDING
