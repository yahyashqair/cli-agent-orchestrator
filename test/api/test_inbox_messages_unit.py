"""API tests for inbox workflow."""

import json
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from cli_agent_orchestrator.api.main import app, inbox_service
from cli_agent_orchestrator.clients import database
from cli_agent_orchestrator.models.inbox import MessageStatus


@pytest.fixture()
def api_client(monkeypatch, tmp_path):
    """Create a test client with isolated database state."""

    db_path = tmp_path / "inbox_api.db"
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", Session)
    monkeypatch.setattr("cli_agent_orchestrator.api.main.SessionLocal", Session)
    monkeypatch.setattr(
        inbox_service,
        "check_and_send_pending_messages",
        lambda *_args, **_kwargs: False,
    )

    database.Base.metadata.create_all(bind=engine)
    database.init_db()

    with TestClient(app) as client:
        yield client


def test_create_inbox_message_marks_reply_complete(api_client):
    original = database.create_inbox_message(
        "ffee1122",
        "aabbccdd",
        "do a task",
        metadata={"routing_policy": "small_task"},
    )

    metadata = {"routing_policy": "small_task", "attempt": 0}
    response = api_client.post(
        f"/terminals/{original.sender_id}/inbox/messages",
        params={
            "sender_id": "aabbccdd",
            "message": "result ready",
            "metadata": json.dumps(metadata),
            "priority": 40,
            "in_reply_to": original.id,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["priority"] == 40

    completed = database.get_inbox_message(original.id)
    assert completed is not None
    assert completed.status == MessageStatus.COMPLETED
    assert completed.processing_completed_at is not None
    assert completed.metadata.get("completed_by") == "aabbccdd"


def test_get_inbox_messages_returns_workflow_fields(api_client):
    scheduled_time = datetime.now() + timedelta(minutes=1)
    database.create_inbox_message(
        "ffee1122",
        "11223344",
        "queued",
        priority=55,
        scheduled_at=scheduled_time,
        metadata={"routing_policy": "large_task", "attempt": 0},
    )

    response = api_client.get(
        "/terminals/11223344/inbox/messages", params={"status": "pending"}
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["count"] >= 1
    message = payload["messages"][0]
    assert message["priority"] == 55
    assert message["scheduled_at"] is not None
    assert message["metadata"]["routing_policy"] == "large_task"
