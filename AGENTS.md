# Repository Guidelines

## Project Structure & Module Organization
Key modules live in `src/cli_agent_orchestrator/`: `api/` (FastAPI), `cli/` (Click), `providers/` (CLI adapters), `services/` (business logic), `models/`, `agent_store/`, `utils/`, and `constants.py`. Tests mirror the tree under `test/`. Reference material sits in `docs/` and runnable demos in `examples/`.

## Build, Test, and Development Commands
- `uv sync` boots the env with runtime + dev deps.
- `uv run cao --help` confirms entry points resolve.
- `uv run pytest -v` (or `-m "not integration"`) executes suites with configured coverage.
- `uv run black src/ test/` and `uv run isort src/ test/` enforce formatting; `uv run mypy src/` applies strict typing.

## Coding Style & Naming Conventions
Write Python 3.10 with 4-space indents, type hints, snake_case modules/functions, PascalCase classes, and UPPER_SNAKE constants. Keep CLI flags hyphenated (`cao launch --agents`). Update `docs/` when new MCP tools, providers, or agent behaviors ship. Run formatters before review.

## Testing Guidelines
Mirror every provider/service change with tests under `test/`. Unit specs belong in `test_*_unit.py`; integration flows use `*_integration.py` and require tmux plus authenticated Q CLI. Mark long-running scenarios with `slow`, external deps with `integration`, async with `asyncio`. Maintain the default `--cov=src --cov-report=term-missing`.

## Commit & Pull Request Guidelines
Use imperative commit subjects with optional prefixes (`refactor:`) and reference issues/PR numbers (`(#42)`). PRs should outline motivation, verification commands, and user-visible deltas (logs or screenshots). Run `uv run black`, `isort`, `mypy`, and relevant pytest targets before requesting review; justify any skipped checks.

## Security & Configuration Tips
Never commit AWS credentials, MCP secrets, or tmux socket paths. Route configuration through environment variables or ignored `.env` files. Provide safe defaults when documenting agents and flag network-sensitive changes in PR descriptions.

## Codex CLI Integration
`codex_cli` now ships alongside `q_cli` and `claude_code`. The provider strips Codex TUI escape sequences, detects `Working … (esc to interrupt)` status updates (only in last 100 words), surfaces agent output blocks, and sends a double `Ctrl+C` to exit gracefully. `constants.PROVIDERS`, `ProviderType`, and the provider manager accept the new identifier, and flows can opt-in via a `provider` frontmatter key. MCP tools (`assign`, `send_message`) read that metadata so Codex supervisors can spin up Codex-backed workers automatically. Unit fixtures under `test/providers/fixtures/` capture idle, processing, and completed Codex panes; `test/providers/test_codex_cli_unit.py` keeps regressions tight, `test/mcp_server/test_server_terminal_creation.py` covers provider selection in the MCP server, and `test/cli/test_launch.py` makes sure the CLI auto-detects profile providers during `cao launch`. Agent profiles now also set `OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES` to keep `uvx` stable on macOS sandboxes.

## Agent Orchestration Pattern: DO NOT USE HANDOFF

⚠️ **CRITICAL CHANGE**: The `handoff` MCP tool should **NOT be used** with Codex CLI agents, especially supervisors.

**Problem**: When Codex supervisors use `handoff`, they poll and check on sub-agents without waiting for them to finish their work. This causes incomplete results and coordination failures.

**Solution**: Use **ONLY** the `assign` + `send_message` pattern:

1. Supervisor uses `assign(agent_profile="developer", message="Task. When DONE, send_message(receiver_id='{my_id}', message='COMPLETED: ...')")`
2. Supervisor **STOPS and WAITS** - does NOT poll or check
3. Developer completes work
4. Developer notifies supervisor: `send_message(receiver_id=supervisor_id, message="COMPLETED: Results...")`
5. Supervisor receives notification and proceeds

**Key Rules**:
- ❌ Never use `handoff` - causes Codex to poll without waiting
- ✅ Always use `assign` + explicit callback instructions
- ⏸️ Supervisor must STOP and WAIT after `assign` - no polling
- 📬 Only proceed after receiving `send_message` notification

See `src/cli_agent_orchestrator/agent_store/code_supervisor.md` for detailed orchestration patterns.

## GitHub Copilot CLI Integration
`copilot_cli` joins the provider lineup so Copilot chats can run under the same orchestration rules as Q, Claude, and Codex. The provider normalises Copilot output, surfaces processing/idle states, and replays agent system prompts on startup so Copilot adopts profile guidance. Environment variables declared in agent MCP configuration are exported before launch, giving Copilot access to credentials or tool metadata that the profile expects. Regression coverage lives in `test/providers/test_copilot_cli_unit.py` with fixtures under `test/providers/fixtures/`. UI pickers (`ControlPanel` and `FlowEditor`) list the new provider, and API/CLI docs note `copilot_cli` wherever provider values are documented.

## Next Steps
1. Exercise Codex CLI flows end-to-end (including approvals) once integration tests exist so we can validate `codex_cli` in scheduled runs.
2. Document any required Codex auth steps or config profiles in `docs/` if contributors report environment setup hurdles.
3. Capture GitHub Copilot CLI session golden paths (auth prompts, approvals) so we can extend fixtures beyond happy-path transcripts when available.
