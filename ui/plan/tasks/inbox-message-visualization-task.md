# Task: Inbox Message Visualization Feature Implementation

## Task ID
`inbox-viz-2025-11-04`

## Priority
High - Phase 2 Feature (F2.1)

## Overview
Implement a comprehensive inbox/messaging visualization system in the CLI Agent Orchestrator UI to display and manage inter-agent messages. Currently, the messaging system exists entirely in the backend, and users have no visibility into message flow between agents.

## Background Research Summary

### Current Backend Implementation
- **API Endpoint:** `POST /terminals/{receiver_id}/inbox/messages` (main.py:307-329)
- **Database Model:** `InboxModel` with fields: id, sender_id, receiver_id, message, status, created_at (database.py:34-44)
- **Message Status:** PENDING, PROCESSING, COMPLETED, FAILED (inbox.py:9-32)
- **Delivery:** Automatic FIFO delivery when receiver terminal is IDLE (inbox_service.py:46-82)
- **MCP Tools:** send_message, handoff, assign (server.py:147-306)
- **Frontend Type:** `InboxMessage` interface exists but is UNUSED (ui/src/types.ts:27-34)

### Current Gaps
- No UI component to view inbox messages
- No visualization of message threads between agents
- No pending message indicators
- No message history or search
- No real-time notifications for new messages

## Requirements

### 1. Message List Component
Create a new component to display inbox messages with the following features:

#### Features:
- **Display all messages** for a selected terminal (both sent and received)
- **Three tabs:**
  - "Received" - messages where terminal is receiver
  - "Sent" - messages where terminal is sender
  - "All" - combined view
- **Message card showing:**
  - Sender ID (with badge/color)
  - Receiver ID (with badge/color)
  - Message content (formatted/truncated if long)
  - Status badge (PENDING, PROCESSING, COMPLETED, FAILED with appropriate colors)
  - Timestamp (relative format: "2 minutes ago")
  - Message ID
- **Sorting options:**
  - By date (newest/oldest first)
  - By status
- **Filtering:**
  - By status (PENDING/PROCESSING/COMPLETED/FAILED)
  - By sender or receiver
- **Empty states:**
  - "No messages yet" when no messages exist
  - Appropriate illustrations/icons

#### Technical Implementation:
- Component file: `ui/src/components/InboxViewer.tsx`
- Use React Query for data fetching with auto-refresh (every 5s)
- Use existing UI components from shadcn/ui
- Responsive design (mobile-friendly)

### 2. Message API Integration

#### New API Methods Required in `ui/src/api/client.ts`:
```typescript
// Get all messages for a terminal
getInboxMessages: async (terminalId: string) => {
  // GET /api/terminals/{terminalId}/inbox/messages
  // Returns: InboxMessage[]
}

// Get pending messages count
getPendingMessagesCount: async (terminalId: string) => {
  // GET /api/terminals/{terminalId}/inbox/messages?status=pending
  // Returns: number
}
```

**NOTE:** These API endpoints DO NOT currently exist in the backend. You must:
1. **Document the required endpoints** in your implementation notes
2. **Use mock data** for development/testing
3. **Add placeholder comments** in the API client where real endpoints will be integrated

Mock data structure:
```typescript
const mockInboxMessages: InboxMessage[] = [
  {
    id: "1",
    sender_id: "terminal_abc123",
    receiver_id: "terminal_def456",
    message: "Task completed successfully. Results saved to output.json",
    status: "delivered",
    created_at: "2025-11-04T10:30:00Z",
    delivered_at: "2025-11-04T10:30:05Z"
  },
  {
    id: "2",
    sender_id: "terminal_def456",
    receiver_id: "terminal_abc123",
    message: "Please analyze the logs in /var/logs/app.log and send back a summary",
    status: "pending",
    created_at: "2025-11-04T10:35:00Z"
  }
]
```

### 3. Dashboard Integration

#### Update Dashboard Component (`ui/src/components/Dashboard.tsx`):
- Add "Pending Messages" count card to statistics section
- Show total number of undelivered messages across all terminals
- Click on count to navigate to inbox view (optional enhancement)

### 4. Terminal Viewer Integration

#### Update TerminalViewer Component (`ui/src/components/TerminalViewer.tsx`):
- Add "Messages" tab alongside "Output" and "Input"
- Display inbox messages for the current terminal in the Messages tab
- Show badge with pending message count on Messages tab (e.g., "Messages (3)")
- Use the new InboxViewer component within this tab

#### Example Tab Structure:
```
[Output] [Input] [Messages (2)] ← New tab with badge
```

### 5. Message Thread View (Optional Enhancement)

Create a conversation-style thread view:
- Group messages by sender-receiver pairs
- Display as chat bubbles (sent messages on right, received on left)
- Auto-scroll to latest message
- Expandable/collapsible threads

### 6. Send Message UI (Optional Enhancement)

Add UI to send messages from the interface:
- "Send Message" button in TerminalViewer
- Modal dialog with:
  - Receiver terminal ID dropdown (list all active terminals)
  - Message text area
  - Send button
- Uses existing `apiClient.sendMessage()` method

## Technical Specifications

### Component Structure
```
ui/src/components/
├── InboxViewer.tsx          (NEW - Main inbox display component)
├── MessageCard.tsx          (NEW - Individual message card)
├── MessageThreadView.tsx    (NEW - Thread/conversation view)
├── SendMessageModal.tsx     (NEW - Send message dialog)
├── Dashboard.tsx            (MODIFY - Add pending messages count)
└── TerminalViewer.tsx       (MODIFY - Add Messages tab)
```

### Dependencies
- All required dependencies are already installed:
  - React Query (@tanstack/react-query)
  - shadcn/ui components (Button, Card, Badge, Tabs)
  - date-fns (for date formatting)
  - Lucide React (for icons)

### Styling
- Follow existing design system in `ui/src/index.css`
- Use Tailwind CSS classes
- Match color scheme and component styling from existing components
- Status badge colors:
  - PENDING: yellow/amber
  - COMPLETED: green
  - FAILED: red

### Data Flow
```
InboxViewer Component
    ↓
useQuery (React Query)
    ↓
apiClient.getInboxMessages(terminalId)
    ↓
Mock Data (for now) → Backend API (future)
    ↓
Display in UI with auto-refresh every 5s
```

### Error Handling
- Handle API errors gracefully with error states
- Show retry button on error
- Toast notifications for send message success/failure
- Loading states while fetching data

## Acceptance Criteria

### Must Have:
1. InboxViewer component displays messages with all required fields
2. Messages can be filtered by status and sorted by date
3. Dashboard shows pending messages count
4. TerminalViewer has Messages tab with badge count
5. Mock data works correctly with proper TypeScript types
6. Component is responsive and mobile-friendly
7. Loading states and error handling are implemented
8. Code follows existing project conventions and style

### Nice to Have:
1. Message thread/conversation view
2. Send message functionality from UI
3. Real-time updates using WebSocket subscriptions
4. Message search functionality
5. Export messages as JSON/CSV
6. Desktop notifications for new messages

## Implementation Notes

### Backend API Endpoints Needed (Future Work)
The following endpoints need to be implemented in the backend:

```python
# In src/cli_agent_orchestrator/api/main.py

@router.get("/terminals/{terminal_id}/inbox/messages")
async def get_inbox_messages(
    terminal_id: str,
    status: Optional[str] = None  # filter by status
) -> List[InboxMessage]:
    """Get all inbox messages for a terminal"""
    pass

@router.get("/inbox/messages/pending/count")
async def get_pending_messages_count() -> dict:
    """Get count of all pending messages across all terminals"""
    pass
```

Until these endpoints exist, use mock data as specified above.

### WebSocket Integration (Future Enhancement)
When implementing real-time updates:
- Subscribe to inbox events via WebSocket
- Add new message type to websocket_manager.py
- Broadcast inbox updates when messages are created/delivered
- Update InboxViewer to listen for WebSocket events

## File Locations

### Existing Files to Modify:
- `ui/src/components/Dashboard.tsx` - Add pending messages count
- `ui/src/components/TerminalViewer.tsx` - Add Messages tab
- `ui/src/api/client.ts` - Add inbox API methods (with mocks)
- `ui/src/types.ts` - Update InboxMessage type if needed

### New Files to Create:
- `ui/src/components/InboxViewer.tsx`
- `ui/src/components/MessageCard.tsx`
- `ui/src/components/SendMessageModal.tsx` (optional)
- `ui/src/components/MessageThreadView.tsx` (optional)

## Testing Checklist

- [ ] InboxViewer component renders without errors
- [ ] Mock data displays correctly
- [ ] Filtering by status works
- [ ] Sorting by date works (asc/desc)
- [ ] Tab switching (Received/Sent/All) works
- [ ] Dashboard shows pending count correctly
- [ ] TerminalViewer Messages tab displays inbox
- [ ] Badge count updates when messages change
- [ ] Empty states render appropriately
- [ ] Loading states work
- [ ] Error states work with retry functionality
- [ ] Responsive design works on mobile
- [ ] Status badges have correct colors
- [ ] Timestamps format correctly (relative time)
- [ ] No TypeScript errors or warnings
- [ ] No console errors in browser
- [ ] Code follows project linting rules

## Additional Context

### Existing Type Definition (ui/src/types.ts:27-34)
```typescript
export interface InboxMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  delivered_at?: string;
}
```

You may need to add:
```typescript
status: "pending" | "delivered" | "failed";
```

### Example Code Reference
Look at `TerminalViewer.tsx` for patterns:
- How to use React Query with auto-refresh
- How to handle loading/error states
- How to structure tabs and content areas
- Component styling and layout

### Resources
- shadcn/ui docs: https://ui.shadcn.com/
- React Query docs: https://tanstack.com/query/latest
- Tailwind CSS docs: https://tailwindcss.com/

## Questions to Clarify

Before starting implementation, consider:
1. Should the inbox be a separate page or always embedded in TerminalViewer?
2. Should messages be deletable from the UI?
3. What should be the auto-refresh interval? (default: 5s)
4. Should there be pagination for large message lists?
5. Should message content be truncated, and if so, at what length?

---

**Expected Deliverables:**
1. All new component files (InboxViewer.tsx, MessageCard.tsx)
2. Modified existing files (Dashboard.tsx, TerminalViewer.tsx, client.ts)
3. Working mock data integration
4. Documentation comments in code
5. Notes on backend API endpoints needed

**Estimated Effort:** 6-8 hours

**Dependencies:** None - all required packages already installed

**Risks:**
- Backend API endpoints don't exist yet (mitigated by using mocks)
- WebSocket integration may require additional backend work
- UX decisions may need user feedback/iteration
