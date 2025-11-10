"""Routing heuristics for inbox message scheduling."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict

from cli_agent_orchestrator.models.inbox import RoutingPolicy

# Thresholds for classifying messages
_SMALL_TASK_WORD_THRESHOLD = 120
_LARGE_TASK_LINE_THRESHOLD = 20
_RETRY_BACKOFF_SECONDS = 20


@dataclass
class WorkflowPlan:
    """Represents routing metadata for a queued inbox message."""

    priority: int
    scheduled_at: datetime | None
    metadata: Dict[str, Any]


def _normalize_message(message: str) -> str:
    return message.lower().strip()


def _classify_policy(message: str, *, attempts: int = 0, escalate: bool | None = None) -> RoutingPolicy:
    normalized = _normalize_message(message)

    should_escalate = (
        escalate
        if escalate is not None
        else any(
            keyword in normalized
            for keyword in ["urgent", "escalate", "high priority", "asap", "blocker"]
        )
    )

    if should_escalate:
        return RoutingPolicy.ESCALATION

    if attempts > 0:
        return RoutingPolicy.RETRY

    word_count = len(normalized.split())
    line_count = message.count("\n") + 1
    if word_count > _SMALL_TASK_WORD_THRESHOLD or line_count > _LARGE_TASK_LINE_THRESHOLD:
        return RoutingPolicy.LARGE_TASK

    return RoutingPolicy.SMALL_TASK


def build_workflow_plan(
    message: str,
    *,
    attempts: int = 0,
    escalate: bool | None = None,
) -> WorkflowPlan:
    """Create a workflow plan (priority, schedule, metadata) for a message."""

    policy = _classify_policy(message, attempts=attempts, escalate=escalate)
    now = datetime.now()
    scheduled_at: datetime | None = None
    priority: int
    max_attempts: int

    if policy == RoutingPolicy.ESCALATION:
        priority = 100
        max_attempts = 5
    elif policy == RoutingPolicy.LARGE_TASK:
        priority = 60
        max_attempts = 4
        scheduled_at = now + timedelta(seconds=15)
    elif policy == RoutingPolicy.RETRY:
        priority = 70 + min(20, attempts * 5)
        max_attempts = 4
        scheduled_at = now + timedelta(seconds=_RETRY_BACKOFF_SECONDS * max(1, attempts))
    else:  # SMALL_TASK
        priority = 80
        max_attempts = 3

    metadata: Dict[str, Any] = {
        "routing_policy": policy.value,
        "attempt": attempts,
        "max_attempts": max_attempts,
        "escalated": policy == RoutingPolicy.ESCALATION,
    }

    if policy == RoutingPolicy.RETRY:
        metadata["retry"] = attempts
    if policy == RoutingPolicy.LARGE_TASK:
        metadata["notes"] = "Large task - allow terminal warm up"

    return WorkflowPlan(priority=priority, scheduled_at=scheduled_at, metadata=metadata)
