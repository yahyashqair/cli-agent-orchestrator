import time
from pathlib import Path

from fastapi.testclient import TestClient

from cli_agent_orchestrator.api.main import app, ws_manager


def _write_log(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


def _append_log(path: Path, content: str) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(content)
        handle.flush()


def test_websocket_streams_snapshot_updates(tmp_path, monkeypatch) -> None:
    original_interval = ws_manager.config.poll_interval
    ws_manager.set_poll_interval(0.05)

    terminal_id = "test-terminal-stream"
    monkeypatch.setattr(
        "cli_agent_orchestrator.constants.TERMINAL_LOG_DIR", tmp_path, raising=False
    )
    monkeypatch.setattr(
        "cli_agent_orchestrator.api.websocket_manager.TERMINAL_LOG_DIR", tmp_path, raising=False
    )
    log_path = tmp_path / f"{terminal_id}.log"

    try:
        _write_log(log_path, "Initial line\n")

        with TestClient(app) as client:
            with client.websocket_connect("/ws") as websocket:
                websocket.send_json({"action": "subscribe_terminal", "terminal_id": terminal_id})

                init_message = websocket.receive_json()
                assert init_message["type"] == "terminal_update"
                assert init_message["event"] == "init"
                assert init_message["terminal_id"] == terminal_id

                _append_log(log_path, "Follow up line\n")

                update_message = websocket.receive_json()
                assert update_message["type"] == "terminal_update"
                assert update_message["event"] in {"changed", "init"}
                assert update_message["terminal_id"] == terminal_id
                websocket.send_json({"action": "unsubscribe_terminal", "terminal_id": terminal_id})
    finally:
        ws_manager.set_poll_interval(original_interval)
        try:
            log_path.unlink()
        except FileNotFoundError:
            pass
