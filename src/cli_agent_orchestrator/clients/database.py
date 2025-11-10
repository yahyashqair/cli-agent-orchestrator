"""Minimal database client with only terminal metadata."""

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from cli_agent_orchestrator.constants import DATABASE_URL, DB_DIR
from cli_agent_orchestrator.models.flow import Flow
from cli_agent_orchestrator.models.inbox import InboxMessage, MessageStatus

logger = logging.getLogger(__name__)

Base = declarative_base()


class TerminalModel(Base):
    """SQLAlchemy model for terminal metadata only."""

    __tablename__ = "terminals"

    id = Column(String, primary_key=True)  # "abc123ef"
    tmux_session = Column(String, nullable=False)  # "cao-session-name"
    tmux_window = Column(String, nullable=False)  # "window-name"
    provider = Column(String, nullable=False)  # "q_cli", "claude_code"
    agent_profile = Column(String)  # "developer", "reviewer" (optional)
    working_directory = Column(String)  # working directory path (optional)
    full_permissions = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.now)
    last_active = Column(DateTime, default=datetime.now)


class InboxModel(Base):
    """SQLAlchemy model for inbox messages."""

    __tablename__ = "inbox"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sender_id = Column(String, nullable=False)
    receiver_id = Column(String, nullable=False)
    message = Column(String, nullable=False)
    status = Column(String, nullable=False)  # MessageStatus enum value
    priority = Column(Integer, nullable=False, default=0)
    scheduled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    delivered_at = Column(DateTime, nullable=True)
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    workflow_metadata = Column(Text, nullable=True)  # JSON encoded workflow metadata


class FlowModel(Base):
    """SQLAlchemy model for flow metadata."""

    __tablename__ = "flows"

    name = Column(String, primary_key=True)
    file_path = Column(String, nullable=False)
    schedule = Column(String, nullable=False)
    agent_profile = Column(String, nullable=False)
    provider = Column(String, nullable=False, default="q_cli")
    script = Column(String, nullable=True)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)
    enabled = Column(Boolean, default=True)


class AgentProviderConfigModel(Base):
    """SQLAlchemy model for per-agent provider overrides."""

    __tablename__ = "agent_provider_configs"

    agent_profile = Column(String, primary_key=True)
    provider = Column(String, nullable=False)


class ArchivedSessionModel(Base):
    """SQLAlchemy model for archived sessions."""

    __tablename__ = "archived_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    archived_at = Column(DateTime, default=datetime.now, nullable=False)
    archived_by = Column(String, nullable=True)
    original_created_at = Column(DateTime, nullable=True)
    extra_metadata = Column(Text, nullable=True)  # JSON blob for future use


class ArchivedTerminalModel(Base):
    """SQLAlchemy model for archived terminals."""

    __tablename__ = "archived_terminals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_name = Column(String, nullable=False)  # FK via plain string
    terminal_id = Column(String, nullable=False)  # original terminal id
    provider = Column(String, nullable=False)
    agent_profile = Column(String, nullable=True)
    status = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=True)
    last_active = Column(DateTime, nullable=True)
    full_permissions = Column(Boolean, nullable=False, default=False)
    working_directory = Column(String, nullable=True)


# Helper utilities ---------------------------------------------------------


def _serialize_metadata(metadata: Optional[Dict[str, Any]]) -> Optional[str]:
    """Serialize workflow metadata to JSON for persistence."""

    if not metadata:
        return None
    try:
        return json.dumps(metadata)
    except (TypeError, ValueError) as exc:
        logger.warning("Failed to serialize inbox metadata: %s", exc)
        return None


def _deserialize_metadata(metadata: Optional[str]) -> Dict[str, Any]:
    """Deserialize workflow metadata JSON into a dictionary."""

    if not metadata:
        return {}
    try:
        return json.loads(metadata)
    except (TypeError, ValueError) as exc:
        logger.warning("Failed to deserialize inbox metadata: %s", exc)
        return {}


def _model_to_inbox_message(model: InboxModel) -> InboxMessage:
    """Convert ORM model to pydantic InboxMessage."""

    return InboxMessage(
        id=model.id,
        sender_id=model.sender_id,
        receiver_id=model.receiver_id,
        message=model.message,
        status=MessageStatus(model.status),
        priority=model.priority,
        scheduled_at=model.scheduled_at,
        created_at=model.created_at,
        delivered_at=model.delivered_at,
        processing_started_at=model.processing_started_at,
        processing_completed_at=model.processing_completed_at,
        metadata=_deserialize_metadata(model.workflow_metadata),
    )


# Module-level singletons
DB_DIR.mkdir(parents=True, exist_ok=True)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)

    # Lightweight migration: ensure flows table has provider column
    try:
        with engine.begin() as connection:
            columns = connection.execute(text("PRAGMA table_info(flows)")).fetchall()
            if columns and not any(column[1] == "provider" for column in columns):
                connection.execute(
                    text("ALTER TABLE flows ADD COLUMN provider TEXT DEFAULT 'q_cli'")
                )
    except Exception as exc:
        logger.warning("Failed to ensure flows.provider column exists: %s", exc)

    # Lightweight migration: ensure terminals table has working_directory column
    try:
        with engine.begin() as connection:
            columns = connection.execute(text("PRAGMA table_info(terminals)")).fetchall()
            if columns and not any(column[1] == "working_directory" for column in columns):
                connection.execute(text("ALTER TABLE terminals ADD COLUMN working_directory TEXT"))
                logger.info("Added working_directory column to terminals table")
    except Exception as exc:
        logger.warning("Failed to ensure terminals.working_directory column exists: %s", exc)

    # Lightweight migration: ensure terminals table has full_permissions column
    try:
        with engine.begin() as connection:
            columns = connection.execute(text("PRAGMA table_info(terminals)")).fetchall()
            if columns and not any(column[1] == "full_permissions" for column in columns):
                connection.execute(
                    text(
                        "ALTER TABLE terminals ADD COLUMN full_permissions BOOLEAN NOT NULL DEFAULT 0"
                    )
                )
                logger.info("Added full_permissions column to terminals table")
    except Exception as exc:
        logger.warning("Failed to ensure terminals.full_permissions column exists: %s", exc)

    # Lightweight migration: ensure inbox table has delivered_at column
    try:
        with engine.begin() as connection:
            columns = connection.execute(text("PRAGMA table_info(inbox)")).fetchall()
            if columns and not any(column[1] == "delivered_at" for column in columns):
                connection.execute(text("ALTER TABLE inbox ADD COLUMN delivered_at TEXT"))
                logger.info("Added delivered_at column to inbox table")
    except Exception as exc:
        logger.warning("Failed to ensure inbox.delivered_at column exists: %s", exc)

    # Lightweight migration: ensure inbox workflow columns exist
    try:
        with engine.begin() as connection:
            columns = connection.execute(text("PRAGMA table_info(inbox)")).fetchall()
            existing = {column[1] for column in columns} if columns else set()
            if "priority" not in existing:
                connection.execute(
                    text("ALTER TABLE inbox ADD COLUMN priority INTEGER NOT NULL DEFAULT 0")
                )
                logger.info("Added priority column to inbox table")
            if "scheduled_at" not in existing:
                connection.execute(text("ALTER TABLE inbox ADD COLUMN scheduled_at TEXT"))
                logger.info("Added scheduled_at column to inbox table")
            if "processing_started_at" not in existing:
                connection.execute(
                    text("ALTER TABLE inbox ADD COLUMN processing_started_at TEXT")
                )
                logger.info("Added processing_started_at column to inbox table")
            if "processing_completed_at" not in existing:
                connection.execute(
                    text("ALTER TABLE inbox ADD COLUMN processing_completed_at TEXT")
                )
                logger.info("Added processing_completed_at column to inbox table")
            if "workflow_metadata" not in existing:
                connection.execute(
                    text("ALTER TABLE inbox ADD COLUMN workflow_metadata TEXT")
                )
                if "metadata" in existing:
                    connection.execute(
                        text(
                            "UPDATE inbox SET workflow_metadata = metadata WHERE metadata IS NOT NULL"
                        )
                    )
                logger.info("Ensured workflow_metadata column exists on inbox table")
    except Exception as exc:
        logger.warning("Failed to ensure inbox workflow columns exist: %s", exc)

    # Lightweight migration: ensure agent_provider_configs table exists
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS agent_provider_configs (
                        agent_profile TEXT PRIMARY KEY,
                        provider TEXT NOT NULL
                    )
                    """
                )
            )
            logger.info("Ensured agent_provider_configs table exists")
    except Exception as exc:
        logger.warning("Failed to ensure agent_provider_configs table exists: %s", exc)

    # Lightweight migration: ensure archived_sessions table exists
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS archived_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        archived_at TEXT NOT NULL,
                        archived_by TEXT,
                        original_created_at TEXT,
                        extra_metadata TEXT
                    )
                    """
                )
            )
            logger.info("Ensured archived_sessions table exists")
    except Exception as exc:
        logger.warning("Failed to ensure archived_sessions table exists: %s", exc)

    # Lightweight migration: ensure archived_terminals table exists
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS archived_terminals (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_name TEXT NOT NULL,
                        terminal_id TEXT NOT NULL,
                        provider TEXT NOT NULL,
                        agent_profile TEXT,
                        status TEXT,
                        created_at TEXT,
                        last_active TEXT,
                        full_permissions BOOLEAN NOT NULL DEFAULT 0,
                        working_directory TEXT
                    )
                    """
                )
            )
            logger.info("Ensured archived_terminals table exists")
    except Exception as exc:
        logger.warning("Failed to ensure archived_terminals table exists: %s", exc)


def create_terminal(
    terminal_id: str,
    tmux_session: str,
    tmux_window: str,
    provider: str,
    agent_profile: str = None,
    working_directory: str = None,
    full_permissions: bool = False,
) -> Dict:
    """Create terminal metadata record."""
    with SessionLocal() as db:
        terminal = TerminalModel(
            id=terminal_id,
            tmux_session=tmux_session,
            tmux_window=tmux_window,
            provider=provider,
            agent_profile=agent_profile,
            working_directory=working_directory,
            full_permissions=full_permissions,
        )
        db.add(terminal)
        db.commit()
        return {
            "id": terminal.id,
            "tmux_session": terminal.tmux_session,
            "tmux_window": terminal.tmux_window,
            "provider": terminal.provider,
            "agent_profile": terminal.agent_profile,
            "working_directory": terminal.working_directory,
            "full_permissions": terminal.full_permissions,
            "created_at": terminal.created_at,
            "last_active": terminal.last_active,
        }


def get_terminal_metadata(terminal_id: str) -> Optional[Dict]:
    """Get terminal metadata by ID."""
    with SessionLocal() as db:
        terminal = db.query(TerminalModel).filter(TerminalModel.id == terminal_id).first()
        if not terminal:
            logger.warning(f"Terminal metadata not found for terminal_id: {terminal_id}")
            return None
        logger.debug(
            f"Retrieved terminal metadata for {terminal_id}: provider={terminal.provider}, session={terminal.tmux_session}"
        )
        return {
            "id": terminal.id,
            "tmux_session": terminal.tmux_session,
            "tmux_window": terminal.tmux_window,
            "provider": terminal.provider,
            "agent_profile": terminal.agent_profile,
            "working_directory": terminal.working_directory,
            "full_permissions": terminal.full_permissions,
            "last_active": terminal.last_active,
        }


def list_terminals_by_session(tmux_session: str) -> List[Dict]:
    """List all terminals in a tmux session."""
    with SessionLocal() as db:
        terminals = db.query(TerminalModel).filter(TerminalModel.tmux_session == tmux_session).all()
        return [
            {
                "id": t.id,
                "tmux_session": t.tmux_session,
                "tmux_window": t.tmux_window,
                "provider": t.provider,
                "agent_profile": t.agent_profile,
                "created_at": t.created_at,
                "last_active": t.last_active,
                "full_permissions": t.full_permissions,
                "working_directory": t.working_directory,
            }
            for t in terminals
        ]


def update_last_active(terminal_id: str) -> bool:
    """Update last active timestamp."""
    with SessionLocal() as db:
        terminal = db.query(TerminalModel).filter(TerminalModel.id == terminal_id).first()
        if terminal:
            terminal.last_active = datetime.now()
            db.commit()
            return True
        return False


def delete_terminal(terminal_id: str) -> bool:
    """Delete terminal metadata."""
    with SessionLocal() as db:
        deleted = db.query(TerminalModel).filter(TerminalModel.id == terminal_id).delete()
        db.commit()
        return deleted > 0


def delete_terminals_by_session(tmux_session: str) -> int:
    """Delete all terminals in a session."""
    with SessionLocal() as db:
        deleted = (
            db.query(TerminalModel).filter(TerminalModel.tmux_session == tmux_session).delete()
        )
        db.commit()
        return deleted


def create_inbox_message(
    sender_id: str,
    receiver_id: str,
    message: str,
    *,
    priority: int = 0,
    scheduled_at: datetime | None = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> InboxMessage:
    """Create inbox message with status=MessageStatus.PENDING."""

    with SessionLocal() as db:
        inbox_msg = InboxModel(
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message,
            status=MessageStatus.PENDING.value,
            priority=priority,
            scheduled_at=scheduled_at,
            workflow_metadata=_serialize_metadata(metadata),
        )
        db.add(inbox_msg)
        db.commit()
        db.refresh(inbox_msg)
        return _model_to_inbox_message(inbox_msg)


def get_pending_messages(receiver_id: str, limit: int = 1) -> List[InboxMessage]:
    """Get pending messages ordered by created_at ASC (oldest first)."""
    with SessionLocal() as db:
        messages = (
            db.query(InboxModel)
            .filter(InboxModel.receiver_id == receiver_id)
            .filter(InboxModel.status == MessageStatus.PENDING.value)
            .filter(
                (InboxModel.scheduled_at.is_(None))
                | (InboxModel.scheduled_at <= datetime.now())
            )
            .order_by(InboxModel.priority.desc(), InboxModel.created_at.asc())
            .limit(limit)
            .all()
        )
        return [_model_to_inbox_message(msg) for msg in messages]


def update_message_status(
    message_id: int,
    status: MessageStatus,
    *,
    metadata: Optional[Dict[str, Any]] = None,
    scheduled_at: datetime | None = None,
    priority: Optional[int] = None,
) -> bool:
    """Update message status and optional metadata."""

    with SessionLocal() as db:
        message = db.query(InboxModel).filter(InboxModel.id == message_id).first()
        if not message:
            return False

        now = datetime.now()
        message.status = status.value

        if status == MessageStatus.PROCESSING:
            message.delivered_at = now
            message.processing_started_at = now
            message.processing_completed_at = None
        elif status == MessageStatus.COMPLETED:
            message.processing_completed_at = now
        elif status == MessageStatus.PENDING:
            message.processing_started_at = None
            message.processing_completed_at = None
            message.delivered_at = None
        elif status == MessageStatus.FAILED:
            message.processing_completed_at = now

        if metadata is not None:
            existing = _deserialize_metadata(message.workflow_metadata)
            existing.update(metadata)
            message.workflow_metadata = _serialize_metadata(existing)

        if scheduled_at is not None:
            message.scheduled_at = scheduled_at

        if priority is not None:
            message.priority = priority

        db.commit()
        return True


# Inbox workflow helpers ----------------------------------------------------


def get_inbox_message(message_id: int) -> Optional[InboxMessage]:
    """Fetch a single inbox message by id."""

    with SessionLocal() as db:
        message = db.query(InboxModel).filter(InboxModel.id == message_id).first()
        if not message:
            return None
        return _model_to_inbox_message(message)


def dequeue_next_message(receiver_id: str) -> Optional[InboxMessage]:
    """Atomically dequeue the highest priority pending message for a terminal."""

    now = datetime.now()
    with SessionLocal() as db:
        connection = db.connection()
        connection.execute(text("BEGIN IMMEDIATE"))

        row = connection.execute(
            text(
                """
                SELECT id, workflow_metadata
                FROM inbox
                WHERE receiver_id = :receiver_id
                  AND status = :pending
                  AND (scheduled_at IS NULL OR scheduled_at <= :now)
                ORDER BY priority DESC, created_at ASC, id ASC
                LIMIT 1
                """
            ),
            {
                "receiver_id": receiver_id,
                "pending": MessageStatus.PENDING.value,
                "now": now,
            },
        ).fetchone()

        if not row:
            db.rollback()
            return None

        mapping = getattr(row, "_mapping", None)
        if mapping is not None:
            message_id = mapping.get("id")
            metadata_raw = mapping.get("workflow_metadata")
        else:
            message_id = row[0]
            metadata_raw = row[1] if len(row) > 1 else None

        if message_id is None:
            db.rollback()
            return None
        metadata_dict = _deserialize_metadata(metadata_raw)
        attempts = metadata_dict.get("attempt", 0) + 1
        metadata_dict["attempt"] = attempts
        metadata_dict["last_dispatch_at"] = now.isoformat()

        update_result = connection.execute(
            text(
                """
                UPDATE inbox
                   SET status = :processing,
                       delivered_at = :now,
                       processing_started_at = :now,
                       workflow_metadata = :metadata
                 WHERE id = :message_id
                   AND status = :pending
                """
            ),
            {
                "processing": MessageStatus.PROCESSING.value,
                "now": now,
                "metadata": _serialize_metadata(metadata_dict),
                "message_id": message_id,
                "pending": MessageStatus.PENDING.value,
            },
        )

        if update_result.rowcount == 0:
            db.rollback()
            return None

        db.commit()

    return get_inbox_message(message_id)


def record_processing_failure(
    message: InboxMessage,
    *,
    error: str,
    backoff: timedelta = timedelta(seconds=30),
) -> None:
    """Update metadata and reschedule or fail a message after delivery failure."""

    metadata = dict(message.metadata)
    failures = metadata.setdefault("failures", [])
    failures.append({"at": datetime.now().isoformat(), "error": error})

    attempts = metadata.get("attempt", 1)
    max_attempts = metadata.get("max_attempts", 3)
    metadata["attempt"] = attempts
    metadata["last_error"] = error

    if attempts >= max_attempts:
        update_message_status(
            message.id,
            MessageStatus.FAILED,
            metadata=metadata,
        )
        return

    delay_seconds = metadata.get("backoff_seconds", int(backoff.total_seconds()))
    delay_seconds = max(delay_seconds, int(backoff.total_seconds()))
    scheduled_at = datetime.now() + timedelta(seconds=delay_seconds * attempts)
    metadata["backoff_seconds"] = delay_seconds

    update_message_status(
        message.id,
        MessageStatus.PENDING,
        metadata=metadata,
        scheduled_at=scheduled_at,
        priority=max(message.priority - 1, 0),
    )


# Flow database functions


def create_flow(
    name: str,
    file_path: str,
    schedule: str,
    agent_profile: str,
    provider: str,
    script: str,
    next_run: datetime,
) -> Flow:
    """Create flow record."""
    with SessionLocal() as db:
        flow = FlowModel(
            name=name,
            file_path=file_path,
            schedule=schedule,
            agent_profile=agent_profile,
            provider=provider,
            script=script,
            next_run=next_run,
        )
        db.add(flow)
        db.commit()
        db.refresh(flow)
        return Flow(
            name=flow.name,
            file_path=flow.file_path,
            schedule=flow.schedule,
            agent_profile=flow.agent_profile,
            provider=flow.provider,
            script=flow.script,
            last_run=flow.last_run,
            next_run=flow.next_run,
            enabled=flow.enabled,
        )


def get_flow(name: str) -> Optional[Flow]:
    """Get flow by name."""
    with SessionLocal() as db:
        flow = db.query(FlowModel).filter(FlowModel.name == name).first()
        if not flow:
            return None
        return Flow(
            name=flow.name,
            file_path=flow.file_path,
            schedule=flow.schedule,
            agent_profile=flow.agent_profile,
            provider=flow.provider,
            script=flow.script,
            last_run=flow.last_run,
            next_run=flow.next_run,
            enabled=flow.enabled,
        )


def list_flows() -> List[Flow]:
    """List all flows."""
    with SessionLocal() as db:
        flows = db.query(FlowModel).order_by(FlowModel.next_run).all()
        return [
            Flow(
                name=f.name,
                file_path=f.file_path,
                schedule=f.schedule,
                agent_profile=f.agent_profile,
                provider=f.provider,
                script=f.script,
                last_run=f.last_run,
                next_run=f.next_run,
                enabled=f.enabled,
            )
            for f in flows
        ]


def update_flow_run_times(name: str, last_run: datetime, next_run: datetime) -> bool:
    """Update flow run times after execution."""
    with SessionLocal() as db:
        flow = db.query(FlowModel).filter(FlowModel.name == name).first()
        if flow:
            flow.last_run = last_run
            flow.next_run = next_run
            db.commit()
            return True
        return False


def update_flow_enabled(name: str, enabled: bool, next_run: Optional[datetime] = None) -> bool:
    """Update flow enabled status and optionally next_run."""
    with SessionLocal() as db:
        flow = db.query(FlowModel).filter(FlowModel.name == name).first()
        if flow:
            flow.enabled = enabled
            if next_run is not None:
                flow.next_run = next_run
            db.commit()
            return True
        return False


def delete_flow(name: str) -> bool:
    """Delete flow."""
    with SessionLocal() as db:
        deleted = db.query(FlowModel).filter(FlowModel.name == name).delete()
        db.commit()
        return deleted > 0


def get_flows_to_run() -> List[Flow]:
    """Get enabled flows where next_run <= now."""
    with SessionLocal() as db:
        now = datetime.now()
        flows = (
            db.query(FlowModel).filter(FlowModel.enabled == True, FlowModel.next_run <= now).all()
        )
        return [
            Flow(
                name=f.name,
                file_path=f.file_path,
                schedule=f.schedule,
                agent_profile=f.agent_profile,
                provider=f.provider,
                script=f.script,
                last_run=f.last_run,
                next_run=f.next_run,
                enabled=f.enabled,
            )
            for f in flows
        ]


# Agent provider config functions
def list_agent_provider_configs() -> List[Dict[str, str]]:
    """List all configured agent provider overrides."""
    with SessionLocal() as db:
        configs = (
            db.query(AgentProviderConfigModel)
            .order_by(AgentProviderConfigModel.agent_profile.asc())
            .all()
        )
        return [
            {"agent_profile": config.agent_profile, "provider": config.provider}
            for config in configs
        ]


def get_agent_provider_config(agent_profile: str) -> Optional[Dict[str, str]]:
    """Get provider override for a specific agent profile."""
    with SessionLocal() as db:
        config = (
            db.query(AgentProviderConfigModel)
            .filter(AgentProviderConfigModel.agent_profile == agent_profile)
            .first()
        )
        if not config:
            return None
        return {"agent_profile": config.agent_profile, "provider": config.provider}


def set_agent_provider_config(agent_profile: str, provider: str) -> Dict[str, str]:
    """Upsert provider override for an agent profile."""
    with SessionLocal() as db:
        config = (
            db.query(AgentProviderConfigModel)
            .filter(AgentProviderConfigModel.agent_profile == agent_profile)
            .first()
        )
        if config:
            config.provider = provider
        else:
            config = AgentProviderConfigModel(agent_profile=agent_profile, provider=provider)
            db.add(config)
        db.commit()
        return {"agent_profile": config.agent_profile, "provider": config.provider}


def delete_agent_provider_config(agent_profile: str) -> bool:
    """Delete provider override for an agent profile."""
    with SessionLocal() as db:
        deleted = (
            db.query(AgentProviderConfigModel)
            .filter(AgentProviderConfigModel.agent_profile == agent_profile)
            .delete()
        )
        db.commit()
        return deleted > 0


# Archive functions
def archive_session(session_name: str, archived_by: Optional[str] = None) -> Dict:
    """
    Archive a session by snapshotting all terminals and creating archive records.
    Does not delete tmux session or terminals - caller must handle that.
    Returns the archived session data.
    """
    with SessionLocal() as db:
        # Check if session is already archived
        existing = (
            db.query(ArchivedSessionModel).filter(ArchivedSessionModel.name == session_name).first()
        )
        if existing:
            raise ValueError(f"Session '{session_name}' is already archived")

        # Get all terminals for this session
        terminals = db.query(TerminalModel).filter(TerminalModel.tmux_session == session_name).all()

        # Determine original created_at (use earliest terminal created_at)
        original_created_at = None
        if terminals:
            original_created_at = min(t.created_at for t in terminals if t.created_at)

        # Create archived session record
        archived_session = ArchivedSessionModel(
            name=session_name,
            archived_by=archived_by,
            original_created_at=original_created_at,
        )
        db.add(archived_session)
        db.flush()  # Get the ID

        # Create archived terminal records
        archived_terminals = []
        for terminal in terminals:
            archived_terminal = ArchivedTerminalModel(
                session_name=session_name,
                terminal_id=terminal.id,
                provider=terminal.provider,
                agent_profile=terminal.agent_profile,
                status="UNKNOWN",  # Will be updated by caller with actual status
                created_at=terminal.created_at,
                last_active=terminal.last_active,
                full_permissions=terminal.full_permissions,
                working_directory=terminal.working_directory,
            )
            db.add(archived_terminal)
            archived_terminals.append(archived_terminal)

        # Delete original terminal records
        db.query(TerminalModel).filter(TerminalModel.tmux_session == session_name).delete()

        db.commit()

        # Return archived session data
        return {
            "id": archived_session.id,
            "name": archived_session.name,
            "archived_at": archived_session.archived_at.isoformat(),
            "archived_by": archived_session.archived_by,
            "original_created_at": (
                original_created_at.isoformat() if original_created_at else None
            ),
            "terminals": [
                {
                    "id": t.terminal_id,
                    "provider": t.provider,
                    "agent_profile": t.agent_profile,
                    "status": t.status,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "last_active": t.last_active.isoformat() if t.last_active else None,
                    "full_permissions": t.full_permissions,
                    "working_directory": t.working_directory,
                }
                for t in archived_terminals
            ],
        }


def update_archived_terminal_status(session_name: str, terminal_id: str, status: str) -> bool:
    """Update status for an archived terminal."""
    with SessionLocal() as db:
        terminal = (
            db.query(ArchivedTerminalModel)
            .filter(
                ArchivedTerminalModel.session_name == session_name,
                ArchivedTerminalModel.terminal_id == terminal_id,
            )
            .first()
        )
        if terminal:
            terminal.status = status
            db.commit()
            return True
        return False


def list_archived_sessions() -> List[Dict]:
    """List all archived sessions with their terminals."""
    with SessionLocal() as db:
        sessions = (
            db.query(ArchivedSessionModel).order_by(ArchivedSessionModel.archived_at.desc()).all()
        )

        result = []
        for session in sessions:
            terminals = (
                db.query(ArchivedTerminalModel)
                .filter(ArchivedTerminalModel.session_name == session.name)
                .all()
            )

            result.append(
                {
                    "name": session.name,
                    "archived_at": session.archived_at.isoformat(),
                    "archived_by": session.archived_by,
                    "original_created_at": (
                        session.original_created_at.isoformat()
                        if session.original_created_at
                        else None
                    ),
                    "terminal_count": len(terminals),
                    "terminals": [
                        {
                            "id": t.terminal_id,
                            "provider": t.provider,
                            "agent_profile": t.agent_profile,
                            "status": t.status,
                            "created_at": t.created_at.isoformat() if t.created_at else None,
                            "last_active": t.last_active.isoformat() if t.last_active else None,
                            "full_permissions": t.full_permissions,
                            "working_directory": t.working_directory,
                        }
                        for t in terminals
                    ],
                }
            )

        return result


def get_archived_session(session_name: str) -> Optional[Dict]:
    """Get a single archived session by name."""
    with SessionLocal() as db:
        session = (
            db.query(ArchivedSessionModel).filter(ArchivedSessionModel.name == session_name).first()
        )

        if not session:
            return None

        terminals = (
            db.query(ArchivedTerminalModel)
            .filter(ArchivedTerminalModel.session_name == session_name)
            .all()
        )

        return {
            "name": session.name,
            "archived_at": session.archived_at.isoformat(),
            "archived_by": session.archived_by,
            "original_created_at": (
                session.original_created_at.isoformat() if session.original_created_at else None
            ),
            "terminal_count": len(terminals),
            "terminals": [
                {
                    "id": t.terminal_id,
                    "provider": t.provider,
                    "agent_profile": t.agent_profile,
                    "status": t.status,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "last_active": t.last_active.isoformat() if t.last_active else None,
                    "full_permissions": t.full_permissions,
                    "working_directory": t.working_directory,
                }
                for t in terminals
            ],
        }


def delete_archived_session(session_name: str) -> bool:
    """Delete an archived session and all its terminals."""
    with SessionLocal() as db:
        # Delete terminals first
        db.query(ArchivedTerminalModel).filter(
            ArchivedTerminalModel.session_name == session_name
        ).delete()

        # Delete session
        deleted = (
            db.query(ArchivedSessionModel)
            .filter(ArchivedSessionModel.name == session_name)
            .delete()
        )

        db.commit()
        return deleted > 0


def get_archived_session_names() -> List[str]:
    """Get list of all archived session names."""
    with SessionLocal() as db:
        sessions = db.query(ArchivedSessionModel.name).all()
        return [s.name for s in sessions]
