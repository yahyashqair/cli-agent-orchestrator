## Findings

- None blocking; Firefox theme wiring and Codex MCP updates look functionally correct.

## Suggestions

- **Medium – Maintainability** (`ui/src/App.tsx:20`, `ui/src/App.tsx:27`, `ui/src/App.tsx:80`, `ui/src/components/ThemeToggle.tsx:27`): the valid theme lists are duplicated across state initialisers, the DOM `classList` reset, and the `<select>` options. Consider exporting a single `const THEMES: Theme[]` (and maybe derived `THEME_CLASSNAMES`) so future additions only touch one source of truth.
- **Low – Documentation** (`docs/`): with 11 new palettes landing alongside Firefox, it would help to capture the expanded theme selection in the UI docs or changelog so users know the options exist.

## Positive Notes

- `src/cli_agent_orchestrator/providers/codex_cli.py:95-146` now sends the full agent system prompt and respects the profile’s MCP command/args, which should make Codex sessions align with profile rules and custom server launch instructions out of the box.

## Testing

- Not run. Developer already noted `npm run lint` currently fails due to unrelated pre-existing issues in `ui/src/App.tsx` and `ui/src/components/TerminalViewer.tsx`.

## Category Assessment

- **Functionality**: ✅ Firefox theme is present in the enum, selector, storage guardrails, and CSS tokens; Codex provider change honours profile commands.
- **Readability**: ⚠️ Extra theme variants make the repeated hard-coded arrays harder to scan; would benefit from the shared constant noted above.
- **Maintainability**: ⚠️ Centralising theme metadata will reduce drift as additional palettes ship.
- **Performance**: ✅ No new heavy work introduced; CSS variable approach scales fine.
- **Security**: ✅ Changes are UI styling and CLI command wiring only; no new trust boundaries crossed.
- **Testing**: ⚠️ No automated coverage for theme toggling yet; acceptable but consider adding a simple component test when feasible.
- **Documentation**: ⚠️ Recommend updating UI docs to advertise the expanded theme set.
- **Error Handling**: ✅ System prompt dispatch now reuses existing `wait_until_status` guard; MCP registration logs informative warnings on bad config.
