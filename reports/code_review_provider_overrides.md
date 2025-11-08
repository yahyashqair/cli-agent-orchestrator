# Code Review – Provider Overrides & UI Enhancements

## Findings

1. **Functionality – Terminal metadata omits `working_directory`, so supervisors cannot inherit paths**
   - Code refs: `src/cli_agent_orchestrator/services/terminal_service.py:158-178`, `src/cli_agent_orchestrator/mcp_server/server.py:66-120`
   - `_create_terminal` expects `/terminals/{id}` to return a `working_directory`, but `terminal_service.get_terminal` never includes that field (nor does the `Terminal` model expose it). As a result `working_directory = terminal_metadata.get("working_directory")` always resolves to `None`, so delegated workers never inherit the parent’s cwd and start in `$HOME`. Any flow that depends on relative paths or repo state will immediately fail outside the UI because the supervisor gives workers the wrong workspace.
   - **Fix**: extend `Terminal`/`get_terminal` (and the API schema) to return the stored `working_directory`, and propagate it through `_create_terminal`. Add a regression test in `test/mcp_server/test_server_terminal_creation.py` asserting that an inherited working directory is carried through.

2. **Functionality – Changing agent profiles in the Control Panel leaves a stale provider when no override exists**
   - Code refs: `ui/src/components/ControlPanel.tsx:90-101`, `ui/src/components/ControlPanel.tsx:188-197`
   - `handleAgentProfileChange` clears the “manually set” flag even when the newly selected profile has no override, but it never resets the provider to the default. Because the subsequent `useEffect` bails out when `override` is falsy, the previous profile’s provider sticks around and the form happily launches the new agent under the wrong CLI without any manual opt-in.
   - **Fix**: whenever `override` is `undefined`, explicitly reset `provider` to `DEFAULT_PROVIDER` (and only flip `providerManuallySet` to `false` after applying either an override or that default). A quick RTL test for “switching developer → reviewer clears provider back to q_cli” would prevent regressions.

3. **Maintainability – `CAO_REPO_ROOT` override is unreachable due to a casing typo**
   - Code ref: `src/cli_agent_orchestrator/utils/mcp_config.py:28-31`
   - The auto-detection path reads `os.environ.get("caO_REPO_ROOT")`, so the documented `CAO_REPO_ROOT` variable never takes effect. Developers running the CLI from a local checkout fall back to the `uvx` download path, which is noticeably slower and won’t pick up local changes.
   - **Fix**: change the lookup to `os.environ.get("CAO_REPO_ROOT")` and add a unit test that stubs the env var to guarantee the regression never returns.

4. **Process alignment – `handoff` MCP tool still registers despite the “DO NOT USE” directive**
   - Code ref: `src/cli_agent_orchestrator/mcp_server/server.py:200-320`
   - The new supervisor instructions (e.g., `agent_store/code_supervisor.md` and `AGENTS.md`) forbid `handoff` because Codex supervisors poll workers incorrectly, yet the server still advertises the tool and nothing blocks agents from calling it. That mismatch guarantees ongoing misuse—especially from legacy flows or auto-complete—undermining the documented change.
   - **Fix**: either remove/export-gate the `handoff` tool or update it to implement the assign+inbox pattern so its behavior matches the documentation. A test asserting that `handoff` is unavailable (or that it now forwards through `assign`) would keep the guidance and implementation in sync.

5. **Functionality – `cao launch` ignores persisted provider overrides**
   - Code refs: `src/cli_agent_orchestrator/cli/commands/launch.py:94-133`, `src/cli_agent_orchestrator/services/agent_config_service.py:17-60`
   - The CLI only reads `--provider` or the static profile metadata; it never consults `agent_config_service`/the new `/agent-provider-configs` state. Users who set an override in the UI (or via API) expect that preference to apply everywhere, but launching from the CLI still falls back to `profile.provider` → `q_cli`, causing inconsistent behavior between UI, MCP flows, and direct CLI usage.
   - **Fix**: before defaulting to `profile.provider`, fetch the configured override (either via a lightweight API call or by sharing the service/DB layer) so `cao launch` honors the same precedence as `_create_terminal`. Add a CLI unit test that stubs `agent_config_service.get_provider_for_profile` to ensure the override wins.

## Suggestions
- Add end-to-end coverage that exercises agent launch via UI, CLI, and MCP to make sure provider precedence and working-directory inheritance stay aligned.
- Consider surfacing a notice or telemetry when `handoff` is invoked so you can confirm the deprecation has truly stuck once the tool is gated.
