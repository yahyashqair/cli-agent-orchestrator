## Task: Harden Codex CLI MCP command parsing

- **Context**: Code review identified a blocker where `_ensure_mcp_servers_registered` can crash on malformed `command` strings because `shlex.split` raises `ValueError`. We also need unit coverage for `--type` propagation and to deduplicate Codex test setup when possible.
- **Objective**: Make the Codex CLI provider resilient to bad MCP server commands and ensure tests cover the new scenarios.
- **Primary Files**:
  - `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/providers/codex_cli.py`
  - `/home/yahyashqair/anonDev/cli-agent-orchestrator/test/providers/test_codex_cli_unit.py`
- **Requirements**:
  1. In `_ensure_mcp_servers_registered`, wrap the `shlex.split(command)` call in a `try`/`except ValueError`. If splitting fails, log a warning (consistent with existing logging style) and `continue` without raising so other servers still register.
  2. Add/adjust unit tests to cover:
     - A malformed command triggering the new warning path without raising.
     - Passing through the `--type` flag when the profile metadata includes a `type`.
  3. Keep logging concise; include enough context (server name/identifier) to debug misconfigurations.
  4. Ensure the new tests use fixture patterns already present in the file.
- **Validation**:
  - Run the relevant unit tests (`uv run pytest test/providers/test_codex_cli_unit.py -k codex`) to confirm coverage.
  - Note any unrelated failures if they remain.

Summarize the code changes and validation output when reporting back.
