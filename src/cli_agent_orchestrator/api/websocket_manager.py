"""WebSocket manager that streams incremental terminal output."""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Optional, Set

from fastapi import WebSocket

from cli_agent_orchestrator.constants import TERMINAL_LOG_DIR
from cli_agent_orchestrator.services import session_service

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class StreamConfig:
    """Configuration for terminal streaming behaviour."""

    poll_interval: float = 0.5


class TerminalWebSocketManager:
    """Manage WebSocket subscriptions and terminal log streaming."""

    def __init__(self, config: Optional[StreamConfig] = None) -> None:
        self._config = config or StreamConfig()
        self._connections: Set[WebSocket] = set()
        self._terminal_subscriptions: Dict[str, Set[WebSocket]] = defaultdict(set)
        self._connection_topics: Dict[WebSocket, Set[str]] = defaultdict(set)
        self._tail_tasks: Dict[str, asyncio.Task] = {}
        self._last_sizes: Dict[str, int] = {}
        self._state_lock = asyncio.Lock()

    @property
    def config(self) -> StreamConfig:
        return self._config

    def set_poll_interval(self, poll_interval: float) -> None:
        """Adjust polling interval; primarily useful in tests."""
        self._config = StreamConfig(poll_interval=poll_interval)

    async def connect(self, websocket: WebSocket) -> None:
        """Accept connection and register it."""
        await websocket.accept()
        async with self._state_lock:
            self._connections.add(websocket)
        logger.info("WebSocket connected. Total connections: %s", len(self._connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        """Clean up connection and all associated subscriptions."""
        async with self._state_lock:
            self._connections.discard(websocket)
            subscribed_terminals = self._connection_topics.pop(websocket, set())
            for terminal_id in subscribed_terminals:
                subscribers = self._terminal_subscriptions.get(terminal_id)
                if subscribers:
                    subscribers.discard(websocket)
                    if not subscribers:
                        self._terminal_subscriptions.pop(terminal_id, None)
                        self._cancel_tail_task(terminal_id)
                        self._last_sizes.pop(terminal_id, None)
        logger.info("WebSocket disconnected. Total connections: %s", len(self._connections))

    async def handle_message(self, websocket: WebSocket, raw_message: str) -> None:
        """Route incoming message payloads."""
        if raw_message == "get_sessions":
            sessions = session_service.list_sessions()
            await self._safe_send_json(
                websocket,
                {"type": "sessions", "payload": sessions},
            )
            return

        try:
            payload = json.loads(raw_message)
        except json.JSONDecodeError:
            logger.warning("Received non-JSON message: %s", raw_message)
            return

        action = payload.get("action")
        if action == "subscribe_terminal":
            terminal_id = payload.get("terminal_id")
            if terminal_id:
                await self.subscribe_terminal(websocket, terminal_id)
            else:
                logger.warning("Missing terminal_id in subscribe message: %s", payload)
        elif action == "unsubscribe_terminal":
            terminal_id = payload.get("terminal_id")
            if terminal_id:
                await self.unsubscribe_terminal(websocket, terminal_id)
        elif action == "ping":
            await self._safe_send_json(websocket, {"type": "pong"})
        else:
            logger.debug("Ignoring unsupported WebSocket action: %s", payload)

    async def subscribe_terminal(self, websocket: WebSocket, terminal_id: str) -> None:
        """Subscribe websocket to terminal updates and send initial snapshot."""
        async with self._state_lock:
            self._terminal_subscriptions[terminal_id].add(websocket)
            self._connection_topics[websocket].add(terminal_id)
            start_tail = terminal_id not in self._tail_tasks

        current_size = self._get_log_size(terminal_id)
        async with self._state_lock:
            self._last_sizes[terminal_id] = current_size

        await self._broadcast_update(terminal_id, "init")

        if start_tail:
            async with self._state_lock:
                self._tail_tasks[terminal_id] = asyncio.create_task(
                    self._tail_loop(terminal_id),
                    name=f"terminal-tail-{terminal_id}",
                )

    async def unsubscribe_terminal(self, websocket: WebSocket, terminal_id: str) -> None:
        """Unsubscribe websocket from terminal updates."""
        async with self._state_lock:
            subscribers = self._terminal_subscriptions.get(terminal_id)
            if subscribers:
                subscribers.discard(websocket)
                if not subscribers:
                    self._terminal_subscriptions.pop(terminal_id, None)
                    self._cancel_tail_task(terminal_id)
                    self._last_sizes.pop(terminal_id, None)
            topics = self._connection_topics.get(websocket)
            if topics:
                topics.discard(terminal_id)
                if not topics:
                    self._connection_topics.pop(websocket, None)

    async def _tail_loop(self, terminal_id: str) -> None:
        """Continuously read terminal log snapshots and broadcast updates."""
        try:
            while True:
                await asyncio.sleep(self._config.poll_interval)

                if not self._has_subscribers(terminal_id):
                    break

                current_size = self._get_log_size(terminal_id)
                previous_size = self._last_sizes.get(terminal_id)
                if previous_size is None or current_size != previous_size:
                    async with self._state_lock:
                        self._last_sizes[terminal_id] = current_size
                    await self._broadcast_update(
                        terminal_id,
                        "changed" if previous_size is not None else "init",
                    )
        except asyncio.CancelledError:
            logger.debug("Tail task cancelled for terminal %s", terminal_id)
        finally:
            async with self._state_lock:
                self._tail_tasks.pop(terminal_id, None)
                self._last_sizes.pop(terminal_id, None)

    def _cancel_tail_task(self, terminal_id: str) -> None:
        """Cancel tail task and cleanup offsets if it exists."""
        task: Optional[asyncio.Task] = self._tail_tasks.pop(terminal_id, None)
        if task:
            task.cancel()
        self._last_sizes.pop(terminal_id, None)

    def _has_subscribers(self, terminal_id: str) -> bool:
        """Check if terminal still has active subscribers."""
        subscribers = self._terminal_subscriptions.get(terminal_id)
        return bool(subscribers)

    def _get_log_size(self, terminal_id: str) -> int:
        """Return the current log file size for the terminal (0 if missing)."""
        log_path = TERMINAL_LOG_DIR / f"{terminal_id}.log"
        try:
            return log_path.stat().st_size
        except FileNotFoundError:
            return 0

    async def _broadcast_update(self, terminal_id: str, event: str) -> None:
        """Notify subscribers that terminal output changed."""
        targets = await self._get_subscribers_snapshot(terminal_id)
        if not targets:
            return

        payload = {
            "type": "terminal_update",
            "terminal_id": terminal_id,
            "event": event,
        }

        await asyncio.gather(*(self._safe_send_json(ws, payload) for ws in targets))

    async def _get_subscribers_snapshot(self, terminal_id: str) -> Set[WebSocket]:
        """Take snapshot of subscribers for broadcasting outside of lock."""
        async with self._state_lock:
            return set(self._terminal_subscriptions.get(terminal_id, set()))

    async def _safe_send_json(self, websocket: WebSocket, payload: dict) -> None:
        """Send payload to websocket, cleaning up on failure."""
        try:
            await websocket.send_json(payload)
        except Exception:
            logger.debug("Failed sending to websocket; performing cleanup", exc_info=True)
            await self.disconnect(websocket)
