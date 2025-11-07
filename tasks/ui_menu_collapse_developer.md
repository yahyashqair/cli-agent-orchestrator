## Task: Implement collapsible left and right menus in the UI

**Owner:** Developer Agent  
**Goal:** Allow users to collapse/expand both the left insights sidebar and the right session list within the `sessions` view of the UI.

### Context
- App entry point: `/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/App.tsx`
- Layout + shared styles: `/home/yahyashqair/anonDev/cli-agent-orchestrator/ui/src/App.css`
- The left menu corresponds to the `<aside className="sidebar glass-panel">` that renders `<Dashboard>` and `<AgentStatusPanel>`.
- The right menu corresponds to the `<div className="session-column glass-panel">` that renders `<SessionList>`.

### Requirements
1. **Add collapse state**
   - Track two independent booleans in `App.tsx`: `isSidebarCollapsed` and `isSessionListCollapsed`, both defaulting to `false`.
   - Collapsing one side must not affect the other.

2. **Toggle controls**
   - Each panel needs an always-visible toggle button inside the panel header area (top-right for left menu, top-left for right menu) with clear accessible labels (`aria-label` reflecting the current action, e.g., "Collapse insights panel"/"Expand insights panel").
   - When a panel is collapsed, render a slim floating “rail” button pinned to the respective edge so the panel can be expanded without reopening the full control panel.
   - Buttons can be simple text + chevron symbols; avoid bringing in new icon packs.

3. **Collapsed styles**
   - Introduce CSS modifiers (e.g., `.sidebar-collapsed`, `.session-column-collapsed`) that:
     - Reduce the panel width to a minimal rail (≈56px) while keeping the layout flexible.
     - Hide interior scroll/content but keep the DOM nodes mounted (so expanding retains scroll position).
     - Ensure the central terminal column expands to occupy the freed space via flexbox (no fixed widths).
   - Animations/transitions should be smooth but subtle (width + opacity transition ~200ms).

4. **Responsive behavior**
   - Collapsing should work down to tablet widths (≈1024px). Verify that the toggle rails stay clickable and do not overlap other UI elements.

5. **No impact on flows view**
   - The collapse controls only apply within the `sessions` view. The flows view should remain unchanged.

6. **Testing**
   - Manual verification steps (add to PR/notes): toggle each panel open/closed multiple times, ensure the terminal column stretches correctly, and confirm screen reader labels update.

### Deliverables
- Updated `App.tsx` implementing the state, toggle handlers, and conditional class names/buttons.
- Updated `App.css` with the new collapsed styles and rail buttons.
- Any additional small utility components/styles if needed (keep under `ui/src/components` or `ui/src/styles` as appropriate).

Keep the changes scoped to the UI; no backend updates are required.

