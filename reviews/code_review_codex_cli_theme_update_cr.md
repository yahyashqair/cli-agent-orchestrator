# Code Review – Codex CLI & Theme Extensibility

## Findings

- **Major – Functionality** (`src/cli_agent_orchestrator/providers/codex_cli.py:94-105`): Initialization now only forwards the agent profile's `system_prompt` when it is truthy. Profiles whose markdown body is intentionally left empty (front matter only) or programmatic profiles that never set `system_prompt` will have an empty string here. Prior logic still delivered a minimal "You are a …" message built from the profile metadata, so Codex entered the session with guardrails. With this change those agents launch with no initial instructions at all, leaving Codex without role context. Please keep the new system-prompt delivery, but fall back to the name/description text whenever `system_prompt` is missing.

## Additional Observations

- The more flexible MCP registration (custom command parsing, optional `--type`, additional logging) looks solid and is exercised by the updated unit test.
- UI theme expansion is cleanly centralized around `THEMES`/`THEME_CLASS_NAMES`, which should keep future palette additions low maintenance.

## Testing

- Not run (review only).
