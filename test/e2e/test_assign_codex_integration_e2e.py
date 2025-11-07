"""Real Codex CLI E2E assign flow test."""

from __future__ import annotations

import asyncio
import os
import shutil
import signal
import subprocess
import time
from pathlib import Path
from typing import Dict, List, Optional

import pytest
import requests

from cli_agent_orchestrator.constants import API_BASE_URL
from cli_agent_orchestrator.mcp_server import server

pytestmark = [pytest.mark.e2e, pytest.mark.integration, pytest.mark.slow]

# Allow ample time for Codex CLI to initialize within tmux.
SERVER_READY_TIMEOUT = 120
TERMINAL_IDLE_TIMEOUT = 300
WORKER_TIMEOUT = 360
POLL_INTERVAL = 5
HELLO_SENTINEL = "HELLO_WORLD_TASK_DONE"
E2E_AGENT_PROFILE = "codex_e2e_smoke"


@pytest.fixture(scope="module", autouse=True)
def cao_server() -> None:
    """Launch the CAO API server for the duration of the module."""

    if shutil.which("codex") is None:
        pytest.skip("Codex CLI is not available on PATH")

    if _server_is_responsive(timeout=1):
        # Another test run or user session already has the server online.
        yield
        return

    env = os.environ.copy()
    stdout_path = Path("tmp/codex_e2e_server_stdout.log")
    stderr_path = Path("tmp/codex_e2e_server_stderr.log")
    stdout_path.parent.mkdir(parents=True, exist_ok=True)
    with stdout_path.open("wb") as stdout_file, stderr_path.open("wb") as stderr_file:
        process = subprocess.Popen(  # noqa: S603
            ["uv", "run", "cao-server"],
            env=env,
            stdout=stdout_file,
            stderr=stderr_file,
        )

        try:
            _wait_for_server_ready()
            yield
        finally:
            process.send_signal(signal.SIGINT)
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()


def test_assign_codex_cli_creates_worker_in_same_session(tmp_path: Path) -> None:
    """Assign a real Codex worker and verify it completes a hello-world task."""

    workspace = tmp_path / "codex_e2e_workspace"
    workspace.mkdir()

    supervisor = _create_supervisor_terminal(workspace, agent_profile=E2E_AGENT_PROFILE)
    supervisor_id = supervisor["id"]
    session_name = supervisor["session_name"]

    try:
        _wait_for_terminal_status(
            supervisor_id, target_status="IDLE", timeout=TERMINAL_IDLE_TIMEOUT
        )

        prompt = (
            "This is an automated end-to-end test. Respond with exactly two lines:\n"
            "hello world from codex\n"
            f"{HELLO_SENTINEL}\n"
            "Do not include backticks, bullets, or commentary."
        )

        previous_terminal_env = os.environ.get("CAO_TERMINAL_ID")
        os.environ["CAO_TERMINAL_ID"] = supervisor_id

        try:
            assign_result = asyncio.run(
                server.assign.fn(agent_profile=E2E_AGENT_PROFILE, message=prompt)
            )
        finally:
            if previous_terminal_env is None:
                os.environ.pop("CAO_TERMINAL_ID", None)
            else:
                os.environ["CAO_TERMINAL_ID"] = previous_terminal_env

        assert assign_result["success"] is True
        worker_id = assign_result["terminal_id"]

        worker_metadata = _get_terminal(worker_id)
        assert worker_metadata["session_name"] == session_name

        statuses = _wait_for_worker_completion(worker_id)
        assert statuses[-1] == "completed"
        assert any(status == "processing" for status in statuses)

        output = _get_terminal_output(worker_id)
        assert "hello world from codex" in output.lower()
        assert HELLO_SENTINEL in output
    finally:
        _cleanup_session(session_name)


def _wait_for_server_ready() -> None:
    start = time.time()
    while time.time() - start < SERVER_READY_TIMEOUT:
        if _server_is_responsive(timeout=1):
            return
        time.sleep(1)
    raise TimeoutError("CAO server did not become ready in time")


def _server_is_responsive(timeout: int) -> bool:
    try:
        response = requests.get(f"{API_BASE_URL}/sessions", timeout=timeout)
        return response.status_code == 200
    except requests.ConnectionError:
        return False


def _create_supervisor_terminal(workspace: Path, agent_profile: str) -> Dict[str, str]:
    params = {
        "provider": "codex_cli",
        "agent_profile": agent_profile,
        "working_directory": str(workspace),
    }
    response = requests.post(f"{API_BASE_URL}/sessions", params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def _get_terminal(terminal_id: str) -> Dict[str, str]:
    response = requests.get(f"{API_BASE_URL}/terminals/{terminal_id}", timeout=30)
    response.raise_for_status()
    return response.json()


def _wait_for_terminal_status(terminal_id: str, target_status: str, timeout: int) -> None:
    start = time.time()
    observed: List[str] = []
    target_lower = target_status.lower()
    while time.time() - start < timeout:
        metadata = _get_terminal(terminal_id)
        status = metadata.get("status")
        observed.append(status)
        normalized = status.lower() if isinstance(status, str) else status
        if normalized == target_lower:
            return
        if normalized == "error":
            raise AssertionError(f"Terminal {terminal_id} entered ERROR state")
        time.sleep(POLL_INTERVAL)
    raise TimeoutError(
        f"Terminal {terminal_id} did not reach {target_status} within timeout."
        f" Observed statuses: {observed}"
    )


def _wait_for_worker_completion(terminal_id: str) -> List[str]:
    statuses: List[str] = []
    start = time.time()
    while time.time() - start < WORKER_TIMEOUT:
        metadata = _get_terminal(terminal_id)
        status = metadata.get("status")
        normalized = status.lower() if isinstance(status, str) else status
        statuses.append(normalized)
        if normalized == "completed":
            return statuses
        if normalized == "error":
            raise AssertionError(f"Worker terminal {terminal_id} reported ERROR state")
        time.sleep(POLL_INTERVAL)
    raise TimeoutError(f"Worker terminal {terminal_id} did not complete within timeout")


def _get_terminal_output(terminal_id: str) -> str:
    response = requests.get(
        f"{API_BASE_URL}/terminals/{terminal_id}/output",
        params={"mode": "last"},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    return data["output"]


def _cleanup_session(session_name: Optional[str]) -> None:
    if not session_name:
        return
    try:
        requests.delete(f"{API_BASE_URL}/sessions/{session_name}", timeout=30)
    except requests.RequestException:
        pass
