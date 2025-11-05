"""Unit tests for Claude Code provider."""

from unittest.mock import patch

from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.providers.claude_code import ClaudeCodeProvider


CLAUDE_IDLE_OUTPUT = "> \n"
CLAUDE_PROCESSING_OUTPUT = "✶ Working... (esc to interrupt)\n> \n"
CLAUDE_WAITING_OUTPUT = "❯ 1. Ask a follow-up\n> \n"
CLAUDE_COMPLETED_OUTPUT = "⏺ Final answer provided\n> \n"


class TestClaudeCodeStatusDetection:
    """Status detection scenarios for Claude Code."""

    @patch("cli_agent_orchestrator.providers.claude_code.tmux_client")
    def test_status_idle(self, mock_tmux):
        mock_tmux.get_history.return_value = CLAUDE_IDLE_OUTPUT
        provider = ClaudeCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.IDLE

    @patch("cli_agent_orchestrator.providers.claude_code.tmux_client")
    def test_status_processing(self, mock_tmux):
        mock_tmux.get_history.return_value = CLAUDE_PROCESSING_OUTPUT
        provider = ClaudeCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.PROCESSING

    @patch("cli_agent_orchestrator.providers.claude_code.tmux_client")
    def test_status_waiting_for_user(self, mock_tmux):
        mock_tmux.get_history.return_value = CLAUDE_WAITING_OUTPUT
        provider = ClaudeCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.WAITING_USER_ANSWER

    @patch("cli_agent_orchestrator.providers.claude_code.tmux_client")
    def test_status_completed(self, mock_tmux):
        mock_tmux.get_history.return_value = CLAUDE_COMPLETED_OUTPUT
        provider = ClaudeCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.COMPLETED
