# Code Review Report: Codex CLI System Prompt & Firefox Theme

**Review Date:** 2025-02-14  
**Reviewer:** Code Reviewer Agent  
**Branch:** codex-integration-test  
**Scope:** src/cli_agent_orchestrator/providers/codex_cli.py, test/providers/test_codex_cli_unit.py, ui/src/App.tsx, ui/src/components/ThemeToggle.tsx, ui/src/styles/global.css, ui/src/types.ts, tasks/*

**Overall Recommendation:** ❗ Changes Requested

---

## Summary
- Codex provider now sends the full profile system prompt and allows MCP server commands/types to be configured via profile metadata.
- Unit coverage for initialization paths expanded, including the new prompt delivery.
- UI gains a Firefox-inspired theme with palette definitions and toggle wiring.

## Findings

### Functionality & Error Handling
- **Blocker:** `src/cli_agent_orchestrator/providers/codex_cli.py:121` — `shlex.split(command)` will raise `ValueError` when a profile supplies an ill-quoted command string (for example, an unmatched quote). Because we do not guard that call, the provider initialization will now crash and abort Codex startup instead of skipping the bad MCP server as we do for missing commands. Please wrap the split in a try/except and log/continue (mirroring the earlier guard) so a single misconfigured server does not brick the entire session. Adding a regression test that exercises the malformed command path would keep this covered.

### Maintainability & Readability
- `ui/src/App.tsx:20`, `ui/src/App.tsx:27`, `ui/src/App.tsx:80` — the theme allowlist now lives in three separate literal arrays that all have to be kept in sync. Consider extracting a shared `const THEMES: Theme[] = [...]` (possibly exported from `ui/src/types.ts`) and deriving the string/`theme-` variants so future additions only touch one spot.

### Testing
- `test/providers/test_codex_cli_unit.py:82` exercises the customizable command path nicely. With the new `--type` support at `src/cli_agent_orchestrator/providers/codex_cli.py:137`, please extend the test fixture to include a `type` value and assert the flag is passed through so we do not regress that branch.

### Documentation & Tasks
- The new task files under `/home/yahyashqair/anonDev/cli-agent-orchestrator/tasks/` capture developer and reviewer expectations clearly—thanks for documenting the Firefox theme workflow.

## Strengths
- `src/cli_agent_orchestrator/providers/codex_cli.py:95` delivers the full system prompt, which aligns Codex behaviour with profile rules; the accompanying unit test at `test/providers/test_codex_cli_unit.py:101` keeps this path safe.
- `ui/src/styles/global.css:102` defines a coherent Firefox-inspired palette with matching status tokens, and the toggle wiring at `ui/src/components/ThemeToggle.tsx:37` exposes it cleanly to users.

## Validation Notes
- Developer noted `npm run lint` still fails due to pre-existing lint debt in `ui/src/App.tsx` and `ui/src/components/TerminalViewer.tsx`. Re-running after the above fixes is still worthwhile once the blockers are addressed.

## Next Steps
1. Harden `_ensure_mcp_servers_registered` against malformed `command` strings and cover with a unit test.
2. Decide on a shared source of truth for theme identifiers to reduce duplication.
3. Extend the MCP registration test to assert we propagate `--type` when provided.
4. Re-run the usual `uv`/UI lint checks to confirm no new regressions once updates land.

