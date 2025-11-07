# Task: Refresh UI with Glassy, Trendy Theme

## Context
The current CAO UI leans on flat, blocky components defined in `ui/src/App.css`, `ui/src/styles/global.css`, and the component-level styles under `ui/src/components/`. We need to elevate the UX with a glassmorphic, premium feel that still respects the existing light/dark themes.

## Goals
1. Introduce a frosted-glass visual language (translucent panels, backdrop blur, layered glows) without sacrificing readability.
2. Update the overall page chrome (background, header, nav, buttons) to feel modern and "trendy".
3. Ensure lists, dashboards, terminals, and flow views adopt the new surfaces for a cohesive experience across the app.

## Implementation Requirements
- **Global tokens & background** (`/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/styles/global.css`):
  - Add CSS variables for glass surfaces, borders, shadows, and glow accents that derive from existing theme colors (e.g., `--glass-panel`, `--glass-panel-strong`, `--glass-border`, `--glass-shadow`, `--glow-primary`).
  - Update `body` to render a subtle radial-gradient background plus a translucent noise/mesh overlay (pseudo-element) so content floats above it. Keep support for theme switching.
  - Add utility classes such as `.glass-panel`, `.frosted-card`, `.glow-ring`, `.glass-divider`, and a `.visually-hidden` helper so components can reuse consistent effects.

- **App chrome & layout**:
  - `App.tsx` (`/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/App.tsx`): wrap the existing `.app` markup with a shell that renders decorative gradient orbs (e.g., `.app-shell` containing `.app-background` with multiple `.orb` elements) and an `.app-surface` that holds the previous layout.
  - `App.css` (`/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/App.css`):
    - Define the new `.app-shell`, `.app-background`, `.app-surface`, and `.orb` styles (radial gradients + blur).
    - Restyle `.app-header`, `.app-navigation`, `.sidebar`, `.main-content`, `.session-column`, `.terminal-column`, `.btn`, `.nav-tab`, and `.empty-state` to use the glass variables, increased border radii, drop shadows, and animated hover/focus states.
    - Refresh buttons (primary/secondary/danger) with gradients, inner glows, and focus outlines that match the trendy aesthetic.

- **Component surfaces** (adjust CSS + markup only where necessary to leverage new classes; avoid logic changes):
  - Dashboard & Agent status (`/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/components/Dashboard.css`): convert cards and status breakdowns to `.glass-panel` / `.frosted-card`, add accent gradients to `.stat-card` borders, tighten typography, and add animated progress bars.
  - Session list (`/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/components/SessionList.css`): ensure headers, export buttons, session headers, and terminal rows use translucent panels with backdrop blur, glowing selection states, and clearer hierarchy between rows.
  - Terminal viewer (`/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/components/TerminalViewer.css`): apply glass treatment to the header, tabs, and input bar; give the terminal output area a dark frosted surface, rounded corners, and softer scrollbars. Keep ANSI output readable.
  - Flow viewer/editor + control panel (`/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/components/FlowViewer.css`, `FlowEditor.css`, `ControlPanel.css`): match the new system by replacing flat backgrounds with `.glass-panel` styles, adding section dividers, and aligning button spacing.
  - Theme toggle (`/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/components/ThemeToggle.css`): restyle the select to feel like a pill-shaped frosted control that reacts on hover/focus.
  - If other high-visibility components (e.g., `MessageCard.css`, `InboxViewer.css`) clash with the new visuals, give them consistent glass treatments to avoid regressions.

## UX Notes
- Preserve existing layout hierarchy/responsiveness, but increase breathing room where it improves readability.
- Make sure contrasts meet accessibility guidelines (use `var(--text-primary)`/`--text-secondary` appropriately over translucent backgrounds).
- Retain current functionality (no behavior or data flow changes) and keep TypeScript logic intact besides wrapping the new shell markup.

## Definition of Done
- All affected files compile via `npm run build` (or `pnpm`/`yarn` equivalent) inside `/home/yahyashqair/anonDev/cli-agent-orchestrator/ui`.
- Theme switcher still works and each theme inherits the new glass tokens without unreadable color clashes.
- The UI shows visible glassmorphism: gradient background, frosted panels, glowing primary actions, and polished nav tabs.
- Provide a short summary of key visual changes plus any tradeoffs.

## Suggested Verification
From `/home/yahyashqair/anonDev/cli-agent-orchestrator/ui`:
```
npm install   # if needed
npm run build
```
Document any additional manual checks (e.g., screenshot notes) in your handoff.
