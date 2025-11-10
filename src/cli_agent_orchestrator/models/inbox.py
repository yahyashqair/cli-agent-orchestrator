"""Inbox message models."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict

from pydantic import BaseModel, Field


class MessageStatus(str, Enum):
    """Message status enumeration for actor workflows."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RoutingPolicy(str, Enum):
    """High level routing policies for actor scheduling."""

    SMALL_TASK = "small_task"
    LARGE_TASK = "large_task"
    RETRY = "retry"
    ESCALATION = "escalation"


class InboxMessage(BaseModel):
    """Inbox message model with workflow metadata."""

    id: int = Field(..., description="Message ID")
    sender_id: str = Field(..., description="Sender terminal ID")
    receiver_id: str = Field(..., description="Receiver terminal ID")
    message: str = Field(..., description="Message content")
    status: MessageStatus = Field(..., description="Message status")
    priority: int = Field(0, description="Priority for scheduling (higher runs first)")
    scheduled_at: datetime | None = Field(
        None, description="Optional schedule for deferred delivery"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    delivered_at: datetime | None = Field(None, description="Delivery timestamp")
    processing_started_at: datetime | None = Field(
        None, description="When the actor began processing the message"
    )
    processing_completed_at: datetime | None = Field(
        None, description="When the actor completed the work"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Routing metadata (policy, attempts, escalation details)",
    )
