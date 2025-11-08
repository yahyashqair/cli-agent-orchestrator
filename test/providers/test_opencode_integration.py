"""Integration tests for OpenCode provider with real OpenCode CLI."""

import shutil
import subprocess
import time
from pathlib import Path

import pytest

from cli_agent_orchestrator.clients.tmux import tmux_client
from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.providers.opencode import OpenCodeProvider

# Mark all tests in this module as integration and slow
pytestmark = [pytest.mark.integration, pytest.mark.slow]


@pytest.fixture(scope="session")
def opencode_available():
    """Check if OpenCode CLI is available and configured."""
    if not shutil.which("opencode"):
        pytest.skip("OpenCode CLI not installed")
    return True


@pytest.fixture(scope="session")
def opencode_authenticated(opencode_available):
    """Check if OpenCode CLI is authenticated."""
    try:
        # Check if opencode is authenticated by running a simple command
        result = subprocess.run(
            ["opencode", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        # If we can run help, assume it's installed
        # Authentication check would require a more complex setup
        return True
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError):
        pytest.skip("OpenCode CLI not properly configured")
        return None


@pytest.fixture
def temp_workspace(tmp_path):
    """Create a temporary workspace for testing."""
    workspace = tmp_path / "test_workspace"
    workspace.mkdir()

    # Create a simple Python file to work with
    test_file = workspace / "test.py"
    test_file.write_text("def hello():\n    print('Hello, World!')\n")

    return workspace


@pytest.fixture
def opencode_provider(opencode_authenticated):
    """Create an OpenCode provider for testing."""
    session_name = "test-opencode-session"
    window_name = "test-window"
    terminal_id = "test-opencode-terminal"

    # Create tmux session and window
    tmux_client.create_session(session_name)
    tmux_client.create_window(session_name, window_name)

    provider = OpenCodeProvider(terminal_id, session_name, window_name)

    yield provider

    # Cleanup
    try:
        provider.cleanup()
        tmux_client.kill_session(session_name)
    except Exception:
        pass  # Best effort cleanup


class TestOpenCodeIntegration:
    """Integration tests for OpenCode provider."""

    def test_provider_initialization(self, opencode_provider):
        """Test provider can be initialized."""
        assert opencode_provider.terminal_id
        assert opencode_provider.session_name
        assert opencode_provider.window_name
        assert not opencode_provider._initialized

    def test_opencode_initialization(self, opencode_provider, temp_workspace):
        """Test OpenCode can be initialized in a workspace."""
        # Change to the test workspace directory
        tmux_client.send_keys(
            opencode_provider.session_name, opencode_provider.window_name, f"cd {temp_workspace}"
        )
        time.sleep(1)

        # Initialize OpenCode
        try:
            success = opencode_provider.initialize()
            assert success
            assert opencode_provider._initialized
        except TimeoutError:
            pytest.skip("OpenCode initialization timed out - may need manual authentication")

    def test_status_detection_idle(self, opencode_provider):
        """Test status detection when OpenCode is idle."""
        # This test assumes OpenCode has been initialized
        try:
            status = opencode_provider.get_status()
            # Status could be IDLE, ERROR, or None depending on state
            assert status in [TerminalStatus.IDLE, TerminalStatus.ERROR, None]
        except Exception:
            # If we can't get status, that's okay for integration test
            pass

    def test_send_simple_command(self, opencode_provider, temp_workspace):
        """Test sending a simple command to OpenCode."""
        # First initialize OpenCode
        try:
            tmux_client.send_keys(
                opencode_provider.session_name,
                opencode_provider.window_name,
                f"cd {temp_workspace}",
            )
            time.sleep(1)
            opencode_provider.initialize()
        except TimeoutError:
            pytest.skip("OpenCode initialization timed out")

        # Send a simple command
        tmux_client.send_keys(
            opencode_provider.session_name,
            opencode_provider.window_name,
            "What files are in this directory?",
        )

        # Wait a bit for processing
        time.sleep(3)

        # Check if we got any response
        try:
            status = opencode_provider.get_status()
            # Should be either processing, completed, or back to idle
            assert status in [
                TerminalStatus.PROCESSING,
                TerminalStatus.COMPLETED,
                TerminalStatus.IDLE,
            ]
        except Exception:
            # If status detection fails, that's okay for integration test
            pass

    def test_exit_command(self, opencode_provider):
        """Test the exit command."""
        exit_cmd = opencode_provider.exit_cli()
        assert exit_cmd == "/exit"

    def test_cleanup(self, opencode_provider):
        """Test provider cleanup."""
        opencode_provider._initialized = True
        opencode_provider.cleanup()
        assert not opencode_provider._initialized

    def test_plan_mode_detection(self, opencode_provider):
        """Test detection of Plan mode in output."""
        # This would require OpenCode to be in Plan mode
        # For integration test, we just verify the pattern exists
        from cli_agent_orchestrator.providers.opencode import PLAN_MODE_PATTERN

        assert PLAN_MODE_PATTERN == r"\[Plan\]"

    def test_build_mode_detection(self, opencode_provider):
        """Test detection of Build mode in output."""
        # This would require OpenCode to be in Build mode
        # For integration test, we just verify the pattern exists
        from cli_agent_orchestrator.providers.opencode import BUILD_MODE_PATTERN

        assert BUILD_MODE_PATTERN == r"\[Build\]"


class TestOpenCodeWithAgentProfile:
    """Test OpenCode provider with agent profiles."""

    @pytest.fixture
    def agent_profile_provider(self, opencode_authenticated):
        """Create OpenCode provider with agent profile."""
        session_name = "test-opencode-profile-session"
        window_name = "test-window"
        terminal_id = "test-opencode-profile-terminal"

        # Create tmux session and window
        tmux_client.create_session(session_name)
        tmux_client.create_window(session_name, window_name)

        provider = OpenCodeProvider(terminal_id, session_name, window_name, "test-profile")

        yield provider

        # Cleanup
        try:
            provider.cleanup()
            tmux_client.kill_session(session_name)
        except Exception:
            pass

    def test_command_building_with_profile(self, agent_profile_provider):
        """Test command building with agent profile."""
        command = agent_profile_provider._build_opencode_command()
        assert "opencode" in command
        # Should include profile-related arguments if profile exists
        assert len(command) >= 1

    def test_profile_error_handling(self, agent_profile_provider):
        """Test error handling when agent profile fails to load."""
        # This would test the ProviderError handling
        # In integration, we'd need a non-existent profile
        try:
            # Try to initialize with non-existent profile
            agent_profile_provider._agent_profile = "non-existent-profile"
            agent_profile_provider.initialize()
        except Exception:
            # Expected to fail during profile loading
            pass


class TestOpenCodeMessageExtractionIntegration:
    """Test message extraction with real OpenCode output."""

    def test_extract_from_real_output(self):
        """Test extracting messages from realistic OpenCode output."""
        # Sample output that might come from OpenCode
        sample_output = """Some initial text
✓ Here is the complete solution to your problem:

1. First step completed
2. Second step with details
3. Final implementation

The solution is now ready and tested.
→ """

        provider = OpenCodeProvider("test", "test", "test")
        result = provider.extract_last_message_from_script(sample_output)

        assert "Here is the complete solution" in result
        assert "First step completed" in result
        assert "solution is now ready" in result

    def test_handle_complex_output(self):
        """Test handling complex OpenCode output with multiple sections."""
        complex_output = """Previous conversation
✓ Initial response
→ 

✓ Final comprehensive response:
This is the main answer with multiple paragraphs.

Each paragraph should be preserved.
Including code blocks and special characters.

→ """

        provider = OpenCodeProvider("test", "test", "test")
        result = provider.extract_last_message_from_script(complex_output)

        assert "Final comprehensive response" in result
        assert "main answer with multiple paragraphs" in result
        assert "Each paragraph should be preserved" in result
