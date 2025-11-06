"""Unit tests for OpenCode provider."""

import os
from unittest.mock import patch

from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.providers.opencode import OpenCodeProvider


OPENCODE_IDLE_OUTPUT = "→ \n"
OPENCODE_PROCESSING_OUTPUT = "⚡ Working... (esc to interrupt)\n→ \n"
OPENCODE_WAITING_OUTPUT = "❯ 1. Ask a follow-up\n→ \n"
OPENCODE_COMPLETED_OUTPUT = "✓ Final answer provided\n→ \n"
OPENCODE_PLAN_MODE_OUTPUT = "[Plan] Mode active\n→ \n"
OPENCODE_BUILD_MODE_OUTPUT = "[Build] Mode active\n→ \n"


class TestOpenCodeStatusDetection:
    """Status detection scenarios for OpenCode."""

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    def test_status_idle(self, mock_tmux):
        mock_tmux.get_history.return_value = OPENCODE_IDLE_OUTPUT
        provider = OpenCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.IDLE

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    def test_status_processing(self, mock_tmux):
        mock_tmux.get_history.return_value = OPENCODE_PROCESSING_OUTPUT
        provider = OpenCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.PROCESSING

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    def test_status_waiting_for_user(self, mock_tmux):
        mock_tmux.get_history.return_value = OPENCODE_WAITING_OUTPUT
        provider = OpenCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.WAITING_USER_ANSWER

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    def test_status_completed(self, mock_tmux):
        mock_tmux.get_history.return_value = OPENCODE_COMPLETED_OUTPUT
        provider = OpenCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.COMPLETED

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    def test_status_authentication_prompt(self, mock_tmux):
        mock_tmux.get_history.return_value = "┌  Add credential│◇  Select provider│  opencode│●  Create an api key at https://opencode.ai/auth│◆  Enter your API key│  _"
        provider = OpenCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.WAITING_USER_ANSWER

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    def test_status_error_condition(self, mock_tmux):
        mock_tmux.get_history.return_value = "Error: Authentication failed\nPlease authenticate first"
        provider = OpenCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.ERROR

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    def test_status_plan_mode(self, mock_tmux):
        mock_tmux.get_history.return_value = OPENCODE_PLAN_MODE_OUTPUT
        provider = OpenCodeProvider("abcd1234", "session", "window")

        # Plan mode should still be considered idle (ready for input)
        assert provider.get_status() == TerminalStatus.IDLE

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    def test_status_build_mode(self, mock_tmux):
        mock_tmux.get_history.return_value = OPENCODE_BUILD_MODE_OUTPUT
        provider = OpenCodeProvider("abcd1234", "session", "window")

        # Build mode should still be considered idle (ready for input)
        assert provider.get_status() == TerminalStatus.IDLE

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    def test_status_empty_output(self, mock_tmux):
        mock_tmux.get_history.return_value = ""
        provider = OpenCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.ERROR

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    def test_status_none_output(self, mock_tmux):
        mock_tmux.get_history.return_value = None
        provider = OpenCodeProvider("abcd1234", "session", "window")

        assert provider.get_status() == TerminalStatus.ERROR


class TestOpenCodeMessageExtraction:
    """Message extraction scenarios for OpenCode."""

    def test_extract_simple_response(self):
        script_output = "✓ This is the answer\n→ "
        provider = OpenCodeProvider("abcd1234", "session", "window")
        
        result = provider.extract_last_message_from_script(script_output)
        assert result == "This is the answer"

    def test_extract_multiline_response(self):
        script_output = "✓ This is line 1\nThis is line 2\nThis is line 3\n→ "
        provider = OpenCodeProvider("abcd1234", "session", "window")
        
        result = provider.extract_last_message_from_script(script_output)
        assert result == "This is line 1\nThis is line 2\nThis is line 3"

    def test_extract_with_ansi_codes(self):
        script_output = "✓ \x1b[32mThis is colored\x1b[0m\n→ "
        provider = OpenCodeProvider("abcd1234", "session", "window")
        
        result = provider.extract_last_message_from_script(script_output)
        assert result == "This is colored"

    def test_extract_last_response_when_multiple(self):
        script_output = "✓ First answer\n→ \n✓ Second answer\n→ "
        provider = OpenCodeProvider("abcd1234", "session", "window")
        
        result = provider.extract_last_message_from_script(script_output)
        assert result == "Second answer"

    def test_extract_no_response_marker(self):
        script_output = "No response marker here\n→ "
        provider = OpenCodeProvider("abcd1234", "session", "window")
        
        try:
            provider.extract_last_message_from_script(script_output)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "No OpenCode response found" in str(e)

    def test_extract_empty_response(self):
        script_output = "✓ \n→ "
        provider = OpenCodeProvider("abcd1234", "session", "window")
        
        try:
            provider.extract_last_message_from_script(script_output)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Empty OpenCode response" in str(e)


class TestOpenCodeProviderBasics:
    """Basic provider functionality tests."""

    def test_provider_initialization(self):
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        
        assert provider.terminal_id == "test-id"
        assert provider.session_name == "test-session"
        assert provider.window_name == "test-window"
        assert not provider._initialized

    def test_provider_initialization_with_profile(self):
        provider = OpenCodeProvider("test-id", "test-session", "test-window", "test-profile")
        
        assert provider._agent_profile == "test-profile"

    def test_get_idle_pattern_for_log(self):
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        
        pattern = provider.get_idle_pattern_for_log()
        assert pattern == "→[\\s\\xa0]"

    def test_exit_cli(self):
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        
        exit_command = provider.exit_cli()
        assert exit_command == "/exit"

    def test_cleanup(self):
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        provider._initialized = True
        
        provider.cleanup()
        
        assert not provider._initialized


class TestOpenCodeCommandBuilding:
    """Command building scenarios for OpenCode."""

    @patch("cli_agent_orchestrator.providers.opencode.load_agent_profile")
    def test_build_command_without_profile(self, mock_load_profile):
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        
        command = provider._build_opencode_command()
        
        # Should include current directory as project argument
        assert command[0] == "opencode"
        assert len(command) == 2  # opencode + directory
        mock_load_profile.assert_not_called()

    @patch("cli_agent_orchestrator.providers.opencode.load_agent_profile")
    def test_build_command_with_profile(self, mock_load_profile):
        mock_profile = mock_load_profile.return_value
        mock_profile.name = "test-agent-name"
        
        provider = OpenCodeProvider("test-id", "test-session", "test-window", "test-profile")
        
        command = provider._build_opencode_command()
        
        expected = ["opencode", os.getcwd(), "--agent", "test-agent-name"]
        assert command == expected
        mock_load_profile.assert_called_once_with("test-profile")

    @patch("cli_agent_orchestrator.providers.opencode.load_agent_profile")
    def test_build_command_profile_error(self, mock_load_profile):
        mock_load_profile.side_effect = Exception("Profile not found")
        
        provider = OpenCodeProvider("test-id", "test-session", "test-window", "test-profile")
        
        try:
            provider._build_opencode_command()
            assert False, "Should have raised ProviderError"
        except Exception as e:
            assert "Failed to load agent profile" in str(e)


class TestOpenCodeAvailabilityCheck:
    """Tests for OpenCode CLI availability checking."""

    @patch("cli_agent_orchestrator.providers.opencode.shutil.which")
    def test_check_opencode_available_success(self, mock_which):
        mock_which.return_value = "/usr/local/bin/opencode"
        
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        
        # Should not raise any exception
        provider._check_opencode_available()

    @patch("cli_agent_orchestrator.providers.opencode.shutil.which")
    def test_check_opencode_available_not_found(self, mock_which):
        mock_which.return_value = None
        
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        
        try:
            provider._check_opencode_available()
            assert False, "Should have raised ProviderError"
        except Exception as e:
            assert "OpenCode CLI is not installed" in str(e)
            assert "curl -fsSL https://opencode.ai/install" in str(e)


class TestOpenCodeInitializeWithAvailabilityCheck:
    """Tests for initialize method with availability checking."""

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    @patch("cli_agent_orchestrator.providers.opencode.wait_until_status")
    @patch("cli_agent_orchestrator.providers.opencode.shutil.which")
    @patch("cli_agent_orchestrator.providers.opencode.subprocess.run")
    def test_initialize_opencode_available_and_authenticated(self, mock_subprocess, mock_which, mock_wait, mock_tmux):
        mock_which.return_value = "/usr/local/bin/opencode"
        mock_subprocess.return_value.returncode = 0  # Authenticated
        # Mock the status checks during initialization
        mock_tmux.get_history.side_effect = [
            "OpenCode starting...",  # First call
            "→ ",  # Second call - idle prompt detected
            "→ ",  # Third call - still idle after /init
        ]
        
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        
        result = provider.initialize()
        
        assert result is True
        assert provider._initialized is True
        # Should be called for opencode command and /init command
        assert mock_tmux.send_keys.call_count == 2

    @patch("cli_agent_orchestrator.providers.opencode.tmux_client")
    @patch("cli_agent_orchestrator.providers.opencode.shutil.which")
    @patch("cli_agent_orchestrator.providers.opencode.subprocess.run")
    def test_initialize_opencode_shows_auth_prompt(self, mock_subprocess, mock_which, mock_tmux):
        mock_which.return_value = "/usr/local/bin/opencode"
        mock_subprocess.return_value.returncode = 0
        # Mock auth prompt detection
        mock_tmux.get_history.return_value = "┌  Add credential│◇  Select provider│  opencode"
        
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        
        try:
            provider.initialize()
            assert False, "Should have raised ProviderError"
        except Exception as e:
            assert "OpenCode requires authentication" in str(e)
            assert "opencode auth login" in str(e)

    @patch("cli_agent_orchestrator.providers.opencode.shutil.which")
    def test_initialize_opencode_not_available(self, mock_which):
        mock_which.return_value = None
        
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        
        try:
            provider.initialize()
            assert False, "Should have raised ProviderError"
        except Exception as e:
            assert "OpenCode CLI is not installed" in str(e)

    @patch("cli_agent_orchestrator.providers.opencode.shutil.which")
    @patch("cli_agent_orchestrator.providers.opencode.subprocess.run")
    def test_initialize_opencode_not_authenticated(self, mock_subprocess, mock_which):
        mock_which.return_value = "/usr/local/bin/opencode"
        # Simulate no credentials configured
        mock_subprocess.return_value.returncode = 0
        mock_subprocess.return_value.stdout = "No credentials configured"
        
        provider = OpenCodeProvider("test-id", "test-session", "test-window")
        
        try:
            provider.initialize()
            assert False, "Should have raised ProviderError"
        except Exception as e:
            assert "OpenCode is not authenticated" in str(e)
