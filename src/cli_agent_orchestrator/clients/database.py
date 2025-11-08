"""Minimal database client with only terminal metadata."""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, String, create_engine, text
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
    created_at = Column(DateTime, default=datetime.now)
    delivered_at = Column(DateTime, nullable=True)


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


def create_inbox_message(sender_id: str, receiver_id: str, message: str) -> InboxMessage:
    """Create inbox message with status=MessageStatus.PENDING."""
    with SessionLocal() as db:
        inbox_msg = InboxModel(
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message,
            status=MessageStatus.PENDING.value,
        )
        db.add(inbox_msg)
        db.commit()
        db.refresh(inbox_msg)
        return InboxMessage(
            id=inbox_msg.id,
            sender_id=inbox_msg.sender_id,
            receiver_id=inbox_msg.receiver_id,
            message=inbox_msg.message,
            status=MessageStatus(inbox_msg.status),
            created_at=inbox_msg.created_at,
            delivered_at=inbox_msg.delivered_at,
        )


def get_pending_messages(receiver_id: str, limit: int = 1) -> List[InboxMessage]:
    """Get pending messages ordered by created_at ASC (oldest first)."""
    with SessionLocal() as db:
        messages = (
            db.query(InboxModel)
            .filter(InboxModel.receiver_id == receiver_id)
            .filter(InboxModel.status == MessageStatus.PENDING.value)
            .order_by(InboxModel.created_at.asc())
            .limit(limit)
            .all()
        )
        return [
            InboxMessage(
                id=msg.id,
                sender_id=msg.sender_id,
                receiver_id=msg.receiver_id,
                message=msg.message,
                status=MessageStatus(msg.status),
                created_at=msg.created_at,
                delivered_at=msg.delivered_at,
            )
            for msg in messages
        ]


def update_message_status(message_id: int, status: MessageStatus) -> bool:
    """Update message status to MessageStatus.DELIVERED or MessageStatus.FAILED."""
    with SessionLocal() as db:
        message = db.query(InboxModel).filter(InboxModel.id == message_id).first()
        if message:
            message.status = status.value
            if status == MessageStatus.DELIVERED:
                message.delivered_at = datetime.now()
            db.commit()
            return True
        return False


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
