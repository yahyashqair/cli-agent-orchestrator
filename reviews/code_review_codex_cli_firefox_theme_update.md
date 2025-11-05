# Code Review – Codex CLI System Prompt & Theme Expansion

## Findings
- **Medium – src/cli_agent_orchestrator/providers/codex_cli.py:121**  
  Switching to `shlex.split()` is great for respecting the profile-supplied command, but it can raise a `ValueError` when the command string has unmatched quotes. Because this path runs during provider initialization, a single malformed profile would now throw and abort the session (previous behaviour silently ignored the field). Please wrap the split in a try/except so we can log and skip the bad server instead of crashing.

## Suggestions
- **Low – src/cli_agent_orchestrator/providers/codex_cli.py:94**  
  We now rely entirely on `system_prompt`. For profiles created programmatically (or front-matter that intentionally leaves the body empty) we will no longer send any role hint whereas we previously fell back to `name`/`description`. Consider keeping that minimal fallback so Codex still receives context when the markdown body is absent.

## Highlights
- The new unit coverage in `test/providers/test_codex_cli_unit.py` exercises both the full system prompt hand-off and the updated MCP command construction—great to see the edge cases locked down.
- Centralising theme metadata in `ui/src/types.ts` plus using `THEME_CLASS_NAMES` in `ui/src/App.tsx` cleans up the UI nicely and prevents future drift between available themes and CSS.

## Category Assessment
- **Functionality:** Apart from the `shlex.split` crash scenario noted above, behaviour looks correct—the provider now honours full prompts and richer server definitions, and the UI reliably applies all themes.  
- **Readability:** The extracted `THEMES` constant and the streamlined initialization logic improve clarity.  
- **Maintainability:** Tests cover the new Python logic; the shared theme list should prevent future mismatches.  
- **Performance:** Unchanged; the additional logic does not add noticeable overhead.  
- **Security:** No new concerns—the MCP env handling still scopes variables explicitly.  
- **Testing:** New unit coverage is in place; UI changes remain untested but were previously untested as well.  
- **Documentation:** Consider updating any user-facing theme documentation when convenient.  
- **Error Handling:** Please add the proposed guard around `shlex.split` to avoid user-visible crashes.
