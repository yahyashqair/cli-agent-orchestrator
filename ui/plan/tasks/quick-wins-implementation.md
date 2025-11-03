# Task: Quick Wins Implementation for CLI Agent Orchestrator UI

## Overview
Implement 8 quick UI enhancements that provide immediate value with minimal effort. These improvements focus on usability, user feedback, and polish.

## Working Directory
`/home/yahyashqair/anonDev/cli-agent-orchestrator/ui`

## Requirements

### 1. Add Copy Button to Terminal Output
**File**: `src/components/TerminalViewer.tsx`

- Add a "Copy" button above the terminal output section
- Use `lucide-react` Copy icon
- Copy the terminal output (raw text without HTML/ANSI) to clipboard
- Show visual feedback on copy (e.g., "Copied!" tooltip or icon change to CheckIcon)
- Position button in the terminal header area

**Acceptance Criteria**:
- Click copy button copies terminal output to clipboard
- Visual feedback appears for 2 seconds after copying
- Button is clearly visible but doesn't obstruct content

### 2. Terminal Auto-Focus When Clicking Terminal Card
**File**: `src/components/TerminalViewer.tsx`

- When user clicks anywhere in the TerminalViewer area, focus the input field
- Should not interfere with text selection in terminal output
- Only trigger on clicks outside the terminal output text area

**Acceptance Criteria**:
- Clicking terminal viewer card focuses the input field
- Text selection in output still works normally
- Doesn't create UX issues with existing click handlers

### 3. Status Badge Animations (Pulsing for PROCESSING)
**File**: `src/components/TerminalViewer.tsx` and/or `src/components/SessionList.tsx`

- Add CSS animation for PROCESSING status badges
- Pulsing/breathing animation to indicate active processing
- Subtle animation that doesn't distract
- Use CSS keyframes for performance

**Acceptance Criteria**:
- PROCESSING status badges pulse/breathe smoothly
- Animation is smooth and performant (CSS-based, no JS)
- Other status badges remain static
- Animation stops when status changes from PROCESSING

### 4. Recent Configurations Dropdown in Launch Modal
**File**: `src/components/ControlPanel.tsx`

- Save last 5 agent launch configurations to localStorage
- Add dropdown/quick-select above the form to load recent configs
- Each entry shows: provider + agent profile + (optional) session name
- Clicking a recent config populates the form

**Acceptance Criteria**:
- Recent configurations are saved to localStorage after launch
- Dropdown shows up to 5 most recent configs
- Clicking a config populates the form fields
- Works across browser sessions (persists)

### 5. Clear Terminal Button
**File**: `src/components/TerminalViewer.tsx`

- Add "Clear" button next to Copy button in terminal header
- Clears the displayed terminal output (visual only, not server-side)
- Use Trash2 or X icon from lucide-react
- Add confirmation or just clear immediately (your choice based on UX)

**Acceptance Criteria**:
- Clear button removes displayed terminal output
- Terminal can still fetch new output after clearing
- Button is clearly labeled/iconified

### 6. Session Duration Display
**File**: `src/components/SessionList.tsx` and `src/components/TerminalViewer.tsx`

- Show "Created: X minutes ago" or "Duration: Xm Ys" for each terminal
- Use `date-fns` to format relative time (already installed)
- Display in terminal card and/or terminal viewer header
- Update periodically (can use existing query refetch intervals)

**Acceptance Criteria**:
- Duration/created time shown for each terminal
- Time updates automatically as query refreshes
- Format is human-readable (e.g., "2m ago", "1h 5m ago")

### 7. Export Sessions List as CSV/JSON
**File**: `src/components/Dashboard.tsx` or new utility

- Add "Export" button in Dashboard component
- Exports current sessions and terminals list
- Support both CSV and JSON formats
- Include: session name, terminal ID, status, provider, profile, created time

**Acceptance Criteria**:
- Export button triggers download of sessions data
- User can choose CSV or JSON format (simple dropdown or two buttons)
- Downloaded file contains all relevant session/terminal information
- Filename includes timestamp (e.g., `cao-sessions-2024-01-15.json`)

### 8. Keyboard Shortcuts (ESC to Close Modals)
**File**: `src/components/ControlPanel.tsx`

- Add ESC key handler to close the Launch Agent modal
- Ensure it only closes when modal is open (don't interfere with other inputs)
- Can be expanded later for more shortcuts

**Acceptance Criteria**:
- Pressing ESC closes the Launch Agent modal
- ESC doesn't interfere when typing in form fields (only closes modal, doesn't clear input)
- Works consistently across browsers

## Technical Guidelines

### Code Quality
- Use TypeScript with proper types
- Follow existing code patterns in the codebase
- Use existing dependencies (lucide-react, date-fns, clsx, etc.)
- Add comments for complex logic

### UI/UX Considerations
- Maintain consistency with existing UI style
- Use existing CSS variable theming (dark/light theme support)
- Ensure all features work in both themes
- Maintain responsive design principles

### Testing
- Test each feature manually after implementation
- Test in both dark and light themes
- Test edge cases (empty terminal output, no recent configs, etc.)

## Files to Modify

Primary files:
- `src/components/TerminalViewer.tsx` - Copy, Clear, Auto-focus, Animations, Duration
- `src/components/ControlPanel.tsx` - Recent configs, ESC handler
- `src/components/Dashboard.tsx` - Export functionality
- `src/components/SessionList.tsx` - Duration display, Animations

You may need to:
- Add utility functions (e.g., for clipboard, export, localStorage)
- Add/modify CSS files for animations
- Create helper hooks if needed

## Deliverables

1. Modified source files implementing all 8 quick wins
2. Any new utility files/functions created
3. CSS changes for animations
4. Brief summary of what was implemented and any notes/caveats

## Notes

- Prioritize user experience and polish
- Keep implementations simple and maintainable
- If any requirement is ambiguous, make reasonable UX decisions
- Ensure backward compatibility (don't break existing functionality)

## Success Criteria

All 8 quick wins are implemented and working:
1. Copy button works and shows feedback
2. Terminal auto-focuses on click
3. Processing status animates
4. Recent configs save and load
5. Clear button clears output
6. Duration displays correctly
7. Export downloads CSV/JSON
8. ESC closes modal

Ready for code review after implementation.
