"""GitHub Copilot CLI provider implementation."""

import logging
import re
import shlex
from typing import Dict, Optional

from cli_agent_orchestrator.clients.tmux import tmux_client
from cli_agent_orchestrator.models.terminal import TerminalStatus
from cli_agent_orchestrator.providers.base import BaseProvider
from cli_agent_orchestrator.utils.agent_profiles import load_agent_profile
from cli_agent_orchestrator.utils.terminal import wait_for_shell, wait_until_status

logger = logging.getLogger(__name__)

# Regular expressions for stripping ANSI/terminal control sequences
CSI_PATTERN = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]")
OSC_PATTERN = re.compile(r"\x1b\][^\x07]*\x07")
ST_PATTERN = re.compile(r"\x1b\][^\x1b]*\x1b\\")
SINGLE_ESCAPE_PATTERN = re.compile(r"\x1b[@-Z\\-_]")
CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")

# Copilot-specific markers
PROMPT_PATTERN = re.compile(r"(?:^|\n)(?:copilot|you)\s*>\s*$", re.IGNORECASE)
ASSISTANT_PATTERN = re.compile(
    r"(?:^|\n)(?:copilot|assistant|ai)\s*(?:[:>\-])\s*", re.IGNORECASE
)
PROCESSING_TOKENS = (
    "copilot is thinking",
    "thinking...",
    "generating",
    "working...",
    "processing",
    "drafting",
)
WAITING_TOKENS = (
    "requires your approval",
    "confirm",
    "[y/n]",
    "enter y to continue",
    "press y to allow",
)
ERROR_TOKENS = (
    "error:",
    "failed",
    "unauthorized",
    "rate limit",
    "network error",
)


class CopilotCliProvider(BaseProvider):
    """Provider for GitHub Copilot CLI integration."""

    def __init__(
        self,
        terminal_id: str,
        session_name: str,
        window_name: str,
        working_directory: Optional[str] = None,
        agent_profile: Optional[str] = None,
    ):
        super().__init__(terminal_id, session_name, window_name, working_directory)
        self._initialized = False
        self._agent_profile = agent_profile
        self._env_exports: Dict[str, str] = {}
        self._profile = None

        if self._agent_profile:
            try:
                self._profile = load_agent_profile(self._agent_profile)
                if self._profile.mcpServers:
                    for server in self._profile.mcpServers.values():
                        for key, value in (server.get("env") or {}).items():
                            self._env_exports[key] = value
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Failed to load agent profile '%s': %s", self._agent_profile, exc)

    def initialize(self) -> bool:
        """Launch Copilot CLI inside the tmux pane and wait until it's idle."""
        if not wait_for_shell(tmux_client, self.session_name, self.window_name, timeout=10.0):
            raise TimeoutError("Shell initialization timed out after 10 seconds")

        runtime_env = {"CAO_TERMINAL_ID": self.terminal_id}
        runtime_env.update(self._env_exports)

        for key, value in runtime_env.items():
            quoted = shlex.quote(str(value))
            tmux_client.send_keys(self.session_name, self.window_name, f"export {key}={quoted}")

        command = "copilot chat"
        tmux_client.send_keys(self.session_name, self.window_name, command)

        if not wait_until_status(self, TerminalStatus.IDLE, timeout=45.0):
            raise TimeoutError("Copilot CLI initialization timed out after 45 seconds")

        if self._profile:
            system_prompt = getattr(self._profile, "system_prompt", None)
            if system_prompt:
                tmux_client.send_keys(self.session_name, self.window_name, system_prompt)
                tmux_client.send_keys(self.session_name, self.window_name, "")
                if not wait_until_status(self, TerminalStatus.IDLE, timeout=10.0):
                    logger.warning(
                        "Copilot CLI did not return to idle after sending system prompt"
                    )

        self._initialized = True
        return True

    def get_status(self, tail_lines: int = None) -> TerminalStatus:
        """Determine Copilot CLI status from tmux history."""
        output = tmux_client.get_history(self.session_name, self.window_name, tail_lines=tail_lines)
        if not output:
            return TerminalStatus.ERROR

        clean = self._strip_output(output)
        lower = clean.lower()

        if not clean.strip():
            return TerminalStatus.ERROR

        if any(token in lower for token in ERROR_TOKENS):
            return TerminalStatus.ERROR

        if any(token in lower for token in WAITING_TOKENS):
            return TerminalStatus.WAITING_USER_ANSWER

        prompt_matches = list(PROMPT_PATTERN.finditer(clean))
        last_prompt = prompt_matches[-1] if prompt_matches else None

        assistant_matches = [
            match for match in ASSISTANT_PATTERN.finditer(clean) if not last_prompt or match.start() < last_prompt.start()
        ]
        last_assistant = assistant_matches[-1] if assistant_matches else None

        if last_prompt:
            if last_assistant:
                response = clean[last_assistant.end() : last_prompt.start()].strip()
                if response:
                    if any(token in response.lower() for token in PROCESSING_TOKENS):
                        return TerminalStatus.PROCESSING
                    return TerminalStatus.COMPLETED
            return TerminalStatus.IDLE

        if any(token in lower for token in PROCESSING_TOKENS):
            return TerminalStatus.PROCESSING

        return TerminalStatus.PROCESSING

    def get_idle_pattern_for_log(self) -> str:
        """Return pattern that indicates Copilot is idle in log tails."""
        return r"You>"

    def extract_last_message_from_script(self, script_output: str) -> str:
        """Extract the last Copilot response from full tmux history."""
        clean = self._strip_output(script_output)

        prompt_matches = list(PROMPT_PATTERN.finditer(clean))
        if not prompt_matches:
            raise ValueError("Incomplete Copilot CLI response - no final prompt detected")
        last_prompt = prompt_matches[-1]

        assistant_matches = [
            match for match in ASSISTANT_PATTERN.finditer(clean) if match.start() < last_prompt.start()
        ]
        if not assistant_matches:
            raise ValueError("No Copilot CLI response found - no assistant output detected")

        last_assistant = assistant_matches[-1]
        message_block = clean[last_assistant.end() : last_prompt.start()]
        message = message_block.strip()

        if not message:
            raise ValueError("Empty Copilot CLI response - no content found")

        lower_message = message.lower()
        if any(token in lower_message for token in PROCESSING_TOKENS):
            raise ValueError("Copilot CLI response still processing")

        return message

    def exit_cli(self) -> str:
        """Return command to terminate Copilot CLI."""
        return "exit"

    def cleanup(self) -> None:
        """Reset initialization flag."""
        self._initialized = False

    @staticmethod
    def _strip_output(output: str) -> str:
        """Remove ANSI escape sequences and control characters."""
        text = CSI_PATTERN.sub("", output)
        text = OSC_PATTERN.sub("", text)
        text = ST_PATTERN.sub("", text)
        text = SINGLE_ESCAPE_PATTERN.sub("", text)
        text = CONTROL_CHAR_PATTERN.sub("", text)
        return text.replace("\r", "")
