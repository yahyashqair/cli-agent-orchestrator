"""Unit tests for Codex CLI provider."""

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import call, patch

import pytest

from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.providers.codex_cli import CodexCliProvider

# Fixtures are tmux capture logs recorded from real Codex CLI sessions.
FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixture(filename: str) -> str:
    with open(FIXTURES_DIR / filename, "r") as fh:
        return fh.read()


class TestCodexCliInitialization:
    """Initialization scenarios."""

    @patch("cli_agent_orchestrator.providers.codex_cli.wait_for_shell")
    @patch("cli_agent_orchestrator.providers.codex_cli.wait_until_status")
    @patch("cli_agent_orchestrator.providers.codex_cli.tmux_client")
    def test_initialize_success(self, mock_tmux, mock_wait_status, mock_wait_shell):
        mock_wait_shell.return_value = True
        mock_wait_status.return_value = True

        provider = CodexCliProvider("abcd1234", "session", "window")
        assert provider.initialize() is True

        mock_wait_shell.assert_called_once()
        assert mock_tmux.send_keys.call_args_list == [
            call("session", "window", "export CAO_TERMINAL_ID=abcd1234"),
            call("session", "window", "export CAO_SESSION_NAME=session"),
            call("session", "window", "export CAO_PROVIDER=codex_cli"),
            call("session", "window", "codex"),
        ]
        assert mock_wait_status.call_count == 1

    @patch("cli_agent_orchestrator.providers.codex_cli.wait_for_shell")
    @patch("cli_agent_orchestrator.providers.codex_cli.tmux_client")
    def test_initialize_shell_timeout(self, mock_tmux, mock_wait_shell):
        mock_wait_shell.return_value = False
        provider = CodexCliProvider("abcd1234", "session", "window")

        with pytest.raises(TimeoutError, match="Shell initialization timed out"):
            provider.initialize()

    @patch("cli_agent_orchestrator.providers.codex_cli.wait_for_shell")
    @patch("cli_agent_orchestrator.providers.codex_cli.wait_until_status")
    @patch("cli_agent_orchestrator.providers.codex_cli.tmux_client")
    def test_initialize_with_working_directory(
        self, mock_tmux, mock_wait_status, mock_wait_shell
    ):
        mock_wait_shell.return_value = True
        mock_wait_status.return_value = True

        provider = CodexCliProvider(
            "abcd1234", "session", "window", working_directory="/tmp/workspace"
        )
        provider.initialize()

        assert mock_tmux.send_keys.call_args_list[-1] == call(
            "session", "window", "codex --cd /tmp/workspace"
        )

    @patch("cli_agent_orchestrator.providers.codex_cli.subprocess.run")
    @patch("cli_agent_orchestrator.providers.codex_cli.load_agent_profile")
    @patch("cli_agent_orchestrator.providers.codex_cli.wait_for_shell")
    @patch("cli_agent_orchestrator.providers.codex_cli.wait_until_status")
    @patch("cli_agent_orchestrator.providers.codex_cli.tmux_client")
    def test_initialize_registers_mcp_servers(
        self,
        mock_tmux,
        mock_wait_status,
        mock_wait_shell,
        mock_load_profile,
        mock_subprocess,
    ):
        mock_wait_shell.return_value = True
        mock_wait_status.return_value = True
        mock_load_profile.return_value = SimpleNamespace(
            mcpServers={
                "cao-mcp-server": {
                    "command": "uvx",
                    "args": ["--from", "git+https://example", "cao-mcp-server"],
                    "env": {"OBJC_DISABLE_INITIALIZE_FORK_SAFETY": "YES"},
                }
            }
        )

        provider = CodexCliProvider(
            "abcd1234", "session", "window", agent_profile="product_supervisor"
        )
        provider.initialize()

        mock_subprocess.assert_called_once()
        cmd_args = mock_subprocess.call_args[0][0]
        assert cmd_args[:3] == ["codex", "mcp", "add"]
        expected_env = [
            ["--env", "OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES"],
            ["--env", "CAO_TERMINAL_ID=abcd1234"],
            ["--env", "CAO_SESSION_NAME=session"],
            ["--env", "CAO_PROVIDER=codex_cli"],
        ]
        env_args = [cmd_args[i : i + 2] for i in range(3, 3 + len(expected_env) * 2, 2)]
        assert env_args == expected_env
        trailing = cmd_args[3 + len(expected_env) * 2 :]
        assert trailing[0] == "uvx"
        assert trailing[1] == "--"
        assert trailing[2:5] == ["--from", "git+https://example", "cao-mcp-server"]
        assert trailing[-1] == "cao-mcp-server"
        # First send_keys exports env, second launches Codex
        assert mock_tmux.send_keys.call_args_list[0].args[2] == "export CAO_TERMINAL_ID=abcd1234"
        assert mock_tmux.send_keys.call_args_list[1].args[2] == "export CAO_SESSION_NAME=session"
        assert mock_tmux.send_keys.call_args_list[2].args[2] == "export CAO_PROVIDER=codex_cli"
        assert (
            mock_tmux.send_keys.call_args_list[3]
            .args[2]
            .startswith("export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=")
        )
        assert mock_tmux.send_keys.call_args_list[4] == call("session", "window", "codex")

    @patch("cli_agent_orchestrator.providers.codex_cli.load_agent_profile")
    @patch("cli_agent_orchestrator.providers.codex_cli.wait_for_shell")
    @patch("cli_agent_orchestrator.providers.codex_cli.wait_until_status")
    @patch("cli_agent_orchestrator.providers.codex_cli.tmux_client")
    def test_initialize_sends_system_prompt(
        self,
        mock_tmux,
        mock_wait_status,
        mock_wait_shell,
        mock_load_profile,
    ):
        mock_wait_shell.return_value = True
        mock_wait_status.side_effect = [True, True]
        mock_load_profile.return_value = SimpleNamespace(
            system_prompt="Full supervisor instructions.\nFollow them all.",
            mcpServers=None,
        )

        provider = CodexCliProvider(
            "abcd1234",
            "session",
            "window",
            agent_profile="code_supervisor",
        )

        assert provider.initialize() is True

        assert mock_tmux.send_keys.call_args_list[0] == call(
            "session", "window", "export CAO_TERMINAL_ID=abcd1234"
        )
        assert mock_tmux.send_keys.call_args_list[1] == call(
            "session", "window", "export CAO_SESSION_NAME=session"
        )
        assert mock_tmux.send_keys.call_args_list[2] == call(
            "session", "window", "export CAO_PROVIDER=codex_cli"
        )
        assert mock_tmux.send_keys.call_args_list[3] == call("session", "window", "codex")
        assert mock_tmux.send_keys.call_args_list[4] == call(
            "session", "window", "Full supervisor instructions.\nFollow them all."
        )
        assert mock_tmux.send_keys.call_args_list[5] == call("session", "window", "")


class TestCodexCliStatusDetection:
    """Status detection against captured fixtures."""

    @patch("cli_agent_orchestrator.providers.codex_cli.tmux_client")
    def test_status_idle(self, mock_tmux):
        mock_tmux.get_history.return_value = load_fixture("codex_idle_output.txt")
        provider = CodexCliProvider("abcd1234", "session", "window")
        assert provider.get_status() == TerminalStatus.IDLE

    @patch("cli_agent_orchestrator.providers.codex_cli.tmux_client")
    def test_status_processing(self, mock_tmux):
        mock_tmux.get_history.return_value = load_fixture("codex_processing_output.txt")
        provider = CodexCliProvider("abcd1234", "session", "window")
        assert provider.get_status() == TerminalStatus.PROCESSING

    @patch("cli_agent_orchestrator.providers.codex_cli.tmux_client")
    def test_status_completed(self, mock_tmux):
        mock_tmux.get_history.return_value = load_fixture("codex_completed_output.txt")
        provider = CodexCliProvider("abcd1234", "session", "window")
        assert provider.get_status() == TerminalStatus.COMPLETED

    @patch("cli_agent_orchestrator.providers.codex_cli.tmux_client")
    def test_status_completed_transitions_back_to_idle(self, mock_tmux):
        mock_tmux.get_history.return_value = load_fixture("codex_completed_output.txt")
        provider = CodexCliProvider("abcd1234", "session", "window")
        assert provider.get_status() == TerminalStatus.COMPLETED
        # Repeated status calls after acknowledging the completion should show IDLE
        assert provider.get_status() == TerminalStatus.IDLE

    @patch("cli_agent_orchestrator.providers.codex_cli.tmux_client")
    def test_status_error_on_empty_output(self, mock_tmux):
        mock_tmux.get_history.return_value = ""
        provider = CodexCliProvider("abcd1234", "session", "window")
        assert provider.get_status() == TerminalStatus.ERROR


class TestCodexCliMessageExtraction:
    """Message extraction from history."""

    def test_extract_last_message_success(self):
        output = load_fixture("codex_completed_output.txt")
        provider = CodexCliProvider("abcd1234", "session", "window")
        message = provider.extract_last_message_from_script(output)
        assert "Morning codebirds sing" in message
        assert "Tests bloom into green" in message

    def test_extract_while_processing(self):
        output = load_fixture("codex_processing_output.txt")
        provider = CodexCliProvider("abcd1234", "session", "window")
        with pytest.raises(ValueError, match="still processing"):
            provider.extract_last_message_from_script(output)
