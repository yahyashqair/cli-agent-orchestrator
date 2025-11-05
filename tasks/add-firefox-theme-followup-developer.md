## Follow-up Task: Refactor Theme Constants

- **Context**: Reviewer requested removing the duplicated theme allowlists in the Firefox theme change (`ui/src/App.tsx`).
- **Objective**: Introduce a single source of truth for available themes and ensure all existing references use it.
- **Primary Files**:
  - `/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/types.ts`
  - `/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/App.tsx`
- **Requirements**:
  1. Define an exported constant array in `types.ts` (e.g., `export const THEMES: Theme[] = [...]`) that lists every theme string including `firefox`.
  2. Import and reuse this constant in `App.tsx` wherever the valid themes array is currently hard-coded, including the DOM class list removal logic (derive the `theme-` version from the constant when needed).
  3. Keep the logic compatible with SSR guards already present (avoid referencing `window`/`document` at module scope).
  4. Ensure typing remains correct (`Theme` union stays in sync with the constant).
- **Validation**:
  - Re-run any quick lint or type check available (`npm run lint` if feasible) and report back, even if unrelated pre-existing warnings remain.

Document the changes and validation results when you send the update back.
