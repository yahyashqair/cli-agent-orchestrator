## Task: Add Firefox Theme to Web UI

- **Objective**: Introduce a new selectable `firefox` theme across the Vite/React UI.
- **Primary Files**:
  - `/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/types.ts`
  - `/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/App.tsx`
  - `/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/components/ThemeToggle.tsx`
  - `/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/styles/global.css`
- **Requirements**:
  1. Add `firefox` to the `Theme` union in `types.ts`.
  2. Update the hard-coded theme lists in `App.tsx` to include the new `firefox` value everywhere the valid theme array is defined.
  3. Add a new option to the theme selector in `ThemeToggle.tsx` so users can pick the Firefox theme.
  4. Define a `:root.theme-firefox` block in `global.css` that captures a Firefox-inspired palette. Suggested palette (adjust slightly if needed for better contrast):
     - `--bg-primary: #101820`
     - `--bg-secondary: #1c2733`
     - `--bg-tertiary: #283547`
     - `--text-primary: #fefeff`
     - `--text-secondary: #f5f6f8`
     - `--text-muted: #c7cad1`
     - `--border: #3a475a`
     - `--accent: #ff7139`
     - `--accent-hover: #ff8c5a`
     - `--success: #2ecc71`
     - `--warning: #f1c40f`
     - `--error: #e74c3c`
     - `--idle: #ff7139`
     - `--processing: #ffa364`
     - `--completed: #2ecc71`
  5. Make sure the new CSS block mirrors the structure of the existing themes (including `color-scheme: dark;`).
- **Validation**:
  - Run `npm run lint` or the existing UI build/lint command if available (check package.json) to ensure no type errors.
  - Launch the UI locally (Vite dev server) and sanity-check the Firefox theme toggle for obvious styling issues if time permits.

Produce a short summary of the code changes and any validation you performed when sending the result back.
