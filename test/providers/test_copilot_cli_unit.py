"""Unit tests for Copilot CLI provider."""

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import call, patch

import pytest

from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.providers.copilot_cli import CopilotCliProvider

# Fixtures are tmux capture logs recorded (or approximated) from Copilot CLI sessions.
FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixture(filename: str) -> str:
    with open(FIXTURES_DIR / filename, "r") as fh:
        return fh.read()


class TestCopilotCliInitialization:
    """Initialization scenarios."""

    @patch("cli_agent_orchestrator.providers.copilot_cli.wait_for_shell")
    @patch("cli_agent_orchestrator.providers.copilot_cli.wait_until_status")
    @patch("cli_agent_orchestrator.providers.copilot_cli.tmux_client")
    def test_initialize_success(self, mock_tmux, mock_wait_status, mock_wait_shell):
        mock_wait_shell.return_value = True
        mock_wait_status.return_value = True

        provider = CopilotCliProvider("abcd1234", "session", "window")
        assert provider.initialize() is True

        mock_wait_shell.assert_called_once()
        assert mock_tmux.send_keys.call_args_list == [
            call("session", "window", "export CAO_TERMINAL_ID=abcd1234"),
            call("session", "window", "export CAO_SESSION_NAME=session"),
            call("session", "window", "export CAO_PROVIDER=copilot_cli"),
            call("session", "window", "export COPILOT_ALLOW_ALL=true"),
            call("session", "window", "copilot"),
        ]
        mock_wait_status.assert_called_once()

    @patch("cli_agent_orchestrator.providers.copilot_cli.wait_for_shell")
    @patch("cli_agent_orchestrator.providers.copilot_cli.tmux_client")
    def test_initialize_shell_timeout(self, mock_tmux, mock_wait_shell):
        mock_wait_shell.return_value = False
        provider = CopilotCliProvider("abcd1234", "session", "window")

        with pytest.raises(TimeoutError, match="Shell initialization timed out"):
            provider.initialize()

    @patch("cli_agent_orchestrator.providers.copilot_cli.load_agent_profile")
    @patch("cli_agent_orchestrator.providers.copilot_cli.wait_for_shell")
    @patch("cli_agent_orchestrator.providers.copilot_cli.wait_until_status")
    @patch("cli_agent_orchestrator.providers.copilot_cli.tmux_client")
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
            system_prompt="Follow these agent rules.",
            mcpServers=None,
        )

        provider = CopilotCliProvider(
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
            "session", "window", "export CAO_PROVIDER=copilot_cli"
        )
        assert mock_tmux.send_keys.call_args_list[3] == call(
            "session", "window", "export COPILOT_ALLOW_ALL=true"
        )
        assert mock_tmux.send_keys.call_args_list[4] == call("session", "window", "copilot")
        assert mock_tmux.send_keys.call_args_list[5] == call(
            "session", "window", "Follow these agent rules."
        )
        assert mock_tmux.send_keys.call_args_list[6] == call("session", "window", "")

    @patch("cli_agent_orchestrator.providers.copilot_cli.subprocess.run")
    @patch("cli_agent_orchestrator.providers.copilot_cli.load_agent_profile")
    @patch("cli_agent_orchestrator.providers.copilot_cli.wait_for_shell")
    @patch("cli_agent_orchestrator.providers.copilot_cli.wait_until_status")
    @patch("cli_agent_orchestrator.providers.copilot_cli.tmux_client")
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
        mock_subprocess.return_value = SimpleNamespace(returncode=0, stderr="")
        mock_load_profile.return_value = SimpleNamespace(
            system_prompt=None,
            mcpServers={
                "cao-mcp-server": {
                    "command": "uvx",
                    "args": ["--from", "git+https://example", "cao-mcp-server"],
                    "env": {"OBJC_DISABLE_INITIALIZE_FORK_SAFETY": "YES"},
                }
            },
        )

        provider = CopilotCliProvider(
            "abcd1234",
            "session",
            "window",
            agent_profile="product_supervisor",
        )

        assert provider.initialize() is True

        mock_subprocess.assert_called_once()
        cmd_args = mock_subprocess.call_args[0][0]
        assert cmd_args[:3] == ["copilot", "mcp", "add"]

        env_pairs = []
        for idx, token in enumerate(cmd_args):
            if token == "--env" and idx + 1 < len(cmd_args):
                env_pairs.append(cmd_args[idx + 1])
        assert "OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES" in env_pairs
        assert "CAO_TERMINAL_ID=abcd1234" in env_pairs
        assert "CAO_SESSION_NAME=session" in env_pairs
        assert "CAO_PROVIDER=copilot_cli" in env_pairs

        command_index = cmd_args.index("uvx")
        assert cmd_args[command_index + 1] == "--"
        assert cmd_args[command_index + 2 : command_index + 5] == [
            "--from",
            "git+https://example",
            "cao-mcp-server",
        ]
        assert cmd_args[-1] == "cao-mcp-server"

    @patch("cli_agent_orchestrator.providers.copilot_cli.load_agent_profile")
    @patch("cli_agent_orchestrator.providers.copilot_cli.wait_for_shell")
    @patch("cli_agent_orchestrator.providers.copilot_cli.wait_until_status")
    @patch("cli_agent_orchestrator.providers.copilot_cli.tmux_client")
    def test_initialize_exports_profile_env(
        self,
        mock_tmux,
        mock_wait_status,
        mock_wait_shell,
        mock_load_profile,
    ):
        mock_wait_shell.return_value = True
        mock_wait_status.return_value = True
        mock_load_profile.return_value = SimpleNamespace(
            system_prompt=None,
            mcpServers={
                "cao-mcp-server": {
                    "env": {
                        "OBJC_DISABLE_INITIALIZE_FORK_SAFETY": "YES",
                        "EXTRA_FLAG": "true",
                    }
                }
            },
        )

        provider = CopilotCliProvider(
            "abcd1234",
            "session",
            "window",
            agent_profile="product_supervisor",
        )
        assert provider.initialize() is True

        # Expect exports for CAO metadata, COPILOT_ALLOW_ALL, and profile env variables
        exports = [
            call_args.args[2]
            for call_args in mock_tmux.send_keys.call_args_list
            if call_args.args[2].startswith("export")
        ]
        assert "export CAO_TERMINAL_ID=abcd1234" in exports
        assert "export CAO_SESSION_NAME=session" in exports
        assert "export CAO_PROVIDER=copilot_cli" in exports
        assert "export COPILOT_ALLOW_ALL=true" in exports
        assert any(cmd.startswith("export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=") for cmd in exports)
        assert "export EXTRA_FLAG=true" in exports


class TestCopilotCliStatusDetection:
    """Status detection against captured fixtures."""

    @patch("cli_agent_orchestrator.providers.copilot_cli.tmux_client")
    def test_status_idle(self, mock_tmux):
        mock_tmux.get_history.return_value = load_fixture("copilot_cli_idle_output.txt")
        provider = CopilotCliProvider("abcd1234", "session", "window")
        assert provider.get_status() == TerminalStatus.IDLE

    @patch("cli_agent_orchestrator.providers.copilot_cli.tmux_client")
    def test_status_processing(self, mock_tmux):
        mock_tmux.get_history.return_value = load_fixture("copilot_cli_processing_output.txt")
        provider = CopilotCliProvider("abcd1234", "session", "window")
        assert provider.get_status() == TerminalStatus.PROCESSING

    @patch("cli_agent_orchestrator.providers.copilot_cli.tmux_client")
    def test_status_completed(self, mock_tmux):
        mock_tmux.get_history.return_value = load_fixture("copilot_cli_completed_output.txt")
        provider = CopilotCliProvider("abcd1234", "session", "window")
        assert provider.get_status() == TerminalStatus.COMPLETED

    @patch("cli_agent_orchestrator.providers.copilot_cli.tmux_client")
    def test_status_error_on_empty_output(self, mock_tmux):
        mock_tmux.get_history.return_value = ""
        provider = CopilotCliProvider("abcd1234", "session", "window")
        assert provider.get_status() == TerminalStatus.ERROR


class TestCopilotCliMessageExtraction:
    """Message extraction from history."""

    def test_extract_last_message_success(self):
        output = load_fixture("copilot_cli_completed_output.txt")
        provider = CopilotCliProvider("abcd1234", "session", "window")
        message = provider.extract_last_message_from_script(output)
        assert message.startswith("You can use the following script")
        assert "ls -lah" in message

    def test_extract_while_processing(self):
        output = load_fixture("copilot_cli_processing_output.txt")
        provider = CopilotCliProvider("abcd1234", "session", "window")
        with pytest.raises(ValueError, match="final prompt detected"):
            provider.extract_last_message_from_script(output)
