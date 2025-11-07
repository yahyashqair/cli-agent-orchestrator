# Task: Full-permission flag for Claude agents

## Overview
Add a "Full permissions" toggle when launching a new agent from the UI and plumb the value through the API/backend so that Claude agents can be started with `claude --dangerously-skip-permissions`. The toggle should only enable the extra CLI flag for Claude for now, but the plumbing should store the boolean on the terminal record so other providers can opt-in later.

## Requirements
1. **UI (`/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/components/ControlPanel.tsx`)**
   - Introduce a `fullPermissions` checkbox that is visible when the provider is `claude_code`.
   - Persist the selection in `recentConfigs` and include it when launching a new session or attaching to an existing one.
   - Update the submit handler to pass the flag into the API client for both `createSession` and `createTerminal` calls.
   - Add any minimal styling/help text to clarify that enabling it skips Claude permission prompts.

2. **API client + types (`ui/src/api/client.ts`, `ui/src/types.ts`)**
   - Accept/forward a `full_permissions` boolean param for session + terminal creation endpoints.
   - Surface the flag on the `Terminal` type so the dashboard can render it later (even if not used yet).

3. **FastAPI endpoints (`src/cli_agent_orchestrator/api/main.py`)**
   - Accept the new query parameter (default `False`) on `/sessions` and `/sessions/{session_name}/terminals` and pass it to the terminal service.

4. **Terminal service + DB (`src/cli_agent_orchestrator/services/terminal_service.py`, `src/cli_agent_orchestrator/clients/database.py`, `src/cli_agent_orchestrator/models/terminal.py`)**
   - Thread the `full_permissions` flag through `create_terminal`, persist it on `TerminalModel` (add a Boolean column with a lightweight PRAGMA migration in `init_db`), and expose it on `Terminal` responses/metadata.
   - Ensure `session_service.list_sessions` includes the flag in the terminal dictionaries it returns.

5. **Provider plumbing (`src/cli_agent_orchestrator/providers/base.py`, `src/cli_agent_orchestrator/providers/manager.py`, and each provider class)**
   - Allow provider instances to know whether `full_permissions` is enabled. It’s fine to extend the base constructor with an optional bool defaulting to `False`.
   - Update `ClaudeCodeProvider` so `_build_claude_command` appends `--dangerously-skip-permissions` when the flag is set. Other providers can ignore the value for now.

6. **Tests**
   - Extend `test/providers/test_claude_code_unit.py` with coverage that confirms the dangerous flag gets appended only when requested (mock `_build_claude_command` or instantiate with the flag and inspect the generated command string).
   - Update/extend any impacted tests or fixtures that construct providers/terminal metadata.

## Acceptance Criteria
- Launch modal shows the new toggle when `claude_code` is selected and the state is sent to the backend.
- POSTing to `/sessions` or `/sessions/{session}/terminals` with `full_permissions=true` results in Claude launching with `claude --dangerously-skip-permissions` (verified via unit test/mocks).
- New column exists in the SQLite `terminals` table with backfill migration logic, and API responses/`Session` payloads include the boolean.
- CI suite continues to pass (`uv run pytest -k claude_code` at minimum for backend, plus `npm run build` or `npm run test -- --runInBand` for the UI as needed).
