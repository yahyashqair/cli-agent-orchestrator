"""OpenCode provider implementation."""

import re
import shlex
import shutil

from cli_agent_orchestrator.clients.tmux import tmux_client
from cli_agent_orchestrator.constants import STATUS_CHECK_LINES
from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.providers.base import BaseProvider
from cli_agent_orchestrator.utils.agent_profiles import load_agent_profile
from cli_agent_orchestrator.utils.terminal import wait_until_status


# Custom exception for provider errors
class ProviderError(Exception):
    """Exception raised for provider-specific errors."""

    pass


# Regex patterns for OpenCode output analysis
ANSI_CODE_PATTERN = r"\x1b\[[0-9;]*m"
RESPONSE_PATTERN = r"✓(?:\x1b\[[0-9;]*m)*\s+"  # Handle any ANSI codes between marker and text
PROCESSING_PATTERN = re.compile(
    r"(?:[⚡⚙️🔄⏳])?\s*(?:Working|Thinking|Planning|Coding|Analyzing|Processing)"
    r"[\s\.…(]*(?:esc to interrupt|press esc to (?:cancel|stop))",
    re.IGNORECASE,
)
IDLE_PROMPT_PATTERN = r"→[\s\xa0]"  # OpenCode uses arrow prompt
WAITING_USER_ANSWER_PATTERN = re.compile(
    r"❯.*\d+\."  # Pattern for OpenCode showing selection options with arrow cursor
)
IDLE_PROMPT_PATTERN_LOG = r"→[\s\xa0]"  # Same pattern for log files
PLAN_MODE_PATTERN = r"\[Plan\]"  # OpenCode plan mode indicator
BUILD_MODE_PATTERN = r"\[Build\]"  # OpenCode build mode indicator
AUTH_PROMPT_PATTERN = re.compile(
    r"(?:Add credential|Select provider|Create an api key|Enter your API key)",
    re.IGNORECASE,
)
ERROR_PATTERN = re.compile(
    r"(?:Error|Failed|Authentication required|Please authenticate)",
    re.IGNORECASE,
)


class OpenCodeProvider(BaseProvider):
    """Provider for OpenCode CLI tool integration."""

    def __init__(
        self, terminal_id: str, session_name: str, window_name: str, agent_profile: str = None
    ):
        super().__init__(terminal_id, session_name, window_name)
        self._initialized = False
        self._agent_profile = agent_profile

    def _check_opencode_available(self) -> None:
        """Check if OpenCode CLI is installed and available."""
        if not shutil.which("opencode"):
            raise ProviderError(
                "OpenCode CLI is not installed. Please install it first:\n"
                "  curl -fsSL https://opencode.ai/install | bash\n"
                "Or visit: https://opencode.ai/docs"
            )

    def _check_opencode_authenticated(self) -> None:
        """Check if OpenCode is properly authenticated."""
        try:
            # Try to run a quick auth list check
            import subprocess
            result = subprocess.run(
                ["opencode", "auth", "list"],
                capture_output=True,
                text=True,
                timeout=10  # Increased timeout
            )
            # If the command succeeds, assume authentication is configured
            # Even if no credentials are shown, let OpenCode handle it during startup
            if result.returncode != 0:
                # Only raise error if command completely fails
                raise ProviderError(
                    "OpenCode authentication check failed. Please run:\n"
                    "  opencode auth login\n"
                    "Then select a provider and enter your API key."
                )
        except subprocess.TimeoutExpired:
            # If auth list times out, don't block initialization
            # Let OpenCode handle authentication during startup
            pass
        except Exception as e:
            # Log the error but don't block initialization
            # OpenCode might still work even if auth check fails
            pass

    def _initialize_project(self) -> None:
        """Initialize OpenCode project by sending /init command."""
        import time
        # Wait a moment for OpenCode to start up
        time.sleep(2)
        # Send /init command
        tmux_client.send_keys(self.session_name, self.window_name, "/init")
        # Wait for initialization to complete
        time.sleep(1)

    def initialize(self) -> bool:
        """Initialize OpenCode provider by starting opencode command."""
        # Check if OpenCode CLI is available
        self._check_opencode_available()

        # Check if OpenCode is authenticated (permissive check)
        self._check_opencode_authenticated()

        # Build command with agent profile support
        command_parts = self._build_opencode_command()
        command = " ".join(command_parts)

        # Send OpenCode command using tmux client
        tmux_client.send_keys(self.session_name, self.window_name, command)

        # Wait for OpenCode to start up (either idle prompt or auth prompt)
        import time
        start_time = time.time()
        while time.time() - start_time < 30.0:  # 30 second timeout
            status = self.get_status()
            
            if status == TerminalStatus.IDLE:
                # OpenCode is ready, proceed with initialization
                break
            elif status == TerminalStatus.WAITING_USER_ANSWER and AUTH_PROMPT_PATTERN.search(
                tmux_client.get_history(self.session_name, self.window_name, tail_lines=10) or ""
            ):
                # OpenCode is asking for authentication
                raise ProviderError(
                    "OpenCode requires authentication. Please run:\n"
                    "  opencode auth login\n"
                    "Then select a provider and configure your API key.\n"
                    "After authentication, try launching the agent again."
                )
            elif status == TerminalStatus.ERROR:
                # Some other error occurred
                output = tmux_client.get_history(self.session_name, self.window_name, tail_lines=20)
                raise ProviderError(f"OpenCode failed to start properly. Output: {output}")
            
            time.sleep(1.0)  # Check every second

        if self.get_status() != TerminalStatus.IDLE:
            raise TimeoutError("OpenCode initialization timed out after 30 seconds")

        # Initialize project
        self._initialize_project()

        # Wait for project initialization to complete
        start_time = time.time()
        while time.time() - start_time < 30.0:  # Additional 30 seconds for /init
            if self.get_status() == TerminalStatus.IDLE:
                break
            time.sleep(1.0)

        if self.get_status() != TerminalStatus.IDLE:
            raise TimeoutError("OpenCode project initialization (/init) timed out after 30 seconds")

        self._initialized = True
        return True

    def _build_opencode_command(self) -> list:
        """Build OpenCode command with agent profile if provided."""
        import os
        command_parts = ["opencode"]
        
        # Add current working directory as project argument
        command_parts.append(os.getcwd())

        if self._agent_profile:
            try:
                profile = load_agent_profile(self._agent_profile)

                # Add system prompt with proper escaping
                command_parts.extend(["--append-system-prompt", shlex.quote(profile.system_prompt)])

                # Add MCP config if present
                if profile.mcpServers:
                    mcp_json = profile.model_dump_json(include={"mcpServers"})
                    command_parts.extend(["--mcp-config", shlex.quote(mcp_json)])

            except Exception as e:
                raise ProviderError(f"Failed to load agent profile '{self._agent_profile}': {e}")

        return command_parts

    def initialize(self) -> bool:
        """Initialize OpenCode provider by starting opencode command."""
        # Check if OpenCode CLI is available
        self._check_opencode_available()

        # Build command with agent profile support
        command_parts = self._build_opencode_command()
        command = " ".join(command_parts)

        # Send OpenCode command using tmux client
        tmux_client.send_keys(self.session_name, self.window_name, command)

        # Wait for OpenCode prompt to be ready
        if not wait_until_status(self, TerminalStatus.IDLE, timeout=30.0, polling_interval=1.0):
            raise TimeoutError("OpenCode initialization timed out after 30 seconds")

        self._initialized = True
        return True

    def get_status(self, tail_lines: int = None) -> TerminalStatus:
        """Get OpenCode status by analyzing terminal output."""

        # Use tmux client singleton to get window history
        output = tmux_client.get_history(self.session_name, self.window_name, tail_lines=tail_lines)

        if not output:
            return TerminalStatus.ERROR

        lines = output.splitlines()
        recent_output = "\n".join(lines[-STATUS_CHECK_LINES:]) if lines else ""

        if not recent_output:
            return TerminalStatus.ERROR

        # Check for error conditions first
        if ERROR_PATTERN.search(recent_output):
            return TerminalStatus.ERROR

        # Check for authentication prompts
        if AUTH_PROMPT_PATTERN.search(recent_output):
            return TerminalStatus.WAITING_USER_ANSWER

        # Check for processing state first
        if PROCESSING_PATTERN.search(recent_output):
            return TerminalStatus.PROCESSING

        # Check for waiting user answer (OpenCode asking for user selection)
        if WAITING_USER_ANSWER_PATTERN.search(recent_output):
            return TerminalStatus.WAITING_USER_ANSWER

        # Check for completed state (has response + ready prompt)
        if re.search(RESPONSE_PATTERN, recent_output) and re.search(
            IDLE_PROMPT_PATTERN, recent_output
        ):
            return TerminalStatus.COMPLETED

        # Check for idle state (just ready prompt, no response)
        if re.search(IDLE_PROMPT_PATTERN, recent_output):
            return TerminalStatus.IDLE

        # If no recognizable state, return None (unknown)
        return None

    def get_idle_pattern_for_log(self) -> str:
        """Return OpenCode IDLE prompt pattern for log files."""
        return IDLE_PROMPT_PATTERN_LOG

    def extract_last_message_from_script(self, script_output: str) -> str:
        """Extract OpenCode's final response message using ✓ indicator."""
        # Find all matches of response pattern
        matches = list(re.finditer(RESPONSE_PATTERN, script_output))

        if not matches:
            raise ValueError("No OpenCode response found - no ✓ pattern detected")

        # Get the last match (final answer)
        last_match = matches[-1]
        start_pos = last_match.end()

        # Extract everything after the last ✓ until next prompt or separator
        remaining_text = script_output[start_pos:]

        # Split by lines and extract response
        lines = remaining_text.split("\n")
        response_lines = []

        for line in lines:
            # Stop at next → prompt or separator line
            if re.match(r"→\s", line) or "────────" in line:
                break

            # Clean the line
            clean_line = line.strip()
            response_lines.append(clean_line)

        if not response_lines or not any(line.strip() for line in response_lines):
            raise ValueError("Empty OpenCode response - no content found after ✓")

        # Join lines and clean up
        final_answer = "\n".join(response_lines).strip()
        # Remove ANSI codes from the final message
        final_answer = re.sub(ANSI_CODE_PATTERN, "", final_answer)
        return final_answer.strip()

    def exit_cli(self) -> str:
        """Get the command to exit OpenCode."""
        return "/exit"

    def cleanup(self) -> None:
        """Clean up OpenCode provider."""
        self._initialized = False
