# Task: Backend API Endpoints for Inbox Message Visualization

## Task ID
`inbox-backend-api-2025-11-04`

## Priority
High - Required for F2.1 (Inbox Message Visualization)

## Overview
Implement backend API endpoints to support the Inbox Message Visualization feature in the UI. The frontend is currently using mock data and needs real API endpoints to fetch and display actual inbox messages from the database.

## Background

### Existing Backend Infrastructure
The backend already has the foundation for inbox messaging:

1. **Database Model** (`src/cli_agent_orchestrator/clients/database.py:34-44`):
   ```python
   class InboxModel(Base):
       __tablename__ = "inbox"
       id = Column(Integer, primary_key=True, autoincrement=True)
       sender_id = Column(String, nullable=False)
       receiver_id = Column(String, nullable=False)
       message = Column(String, nullable=False)
       status = Column(String, nullable=False)  # MessageStatus enum
       created_at = Column(DateTime, default=datetime.now)
   ```

2. **Database Functions** (`src/cli_agent_orchestrator/clients/database.py`):
   - `create_inbox_message()` (lines 195-214) - Creates new messages
   - `get_pending_messages()` (lines 217-238) - Fetches pending messages
   - `update_message_status()` (lines 241-249) - Updates message status

3. **Inbox Service** (`src/cli_agent_orchestrator/services/inbox_service.py`):
   - Handles automatic message delivery when terminals are IDLE
   - Monitors terminal logs for delivery opportunities

4. **Existing API Endpoint** (`src/cli_agent_orchestrator/api/main.py:307-329`):
   - `POST /terminals/{receiver_id}/inbox/messages` - Create and send message

### What's Missing
We need **read endpoints** to fetch inbox messages:
- Endpoint to get all messages for a terminal (sent and received)
- Endpoint to get pending message counts
- Proper filtering by status
- Response format matching frontend expectations

## Requirements

### 1. Get Inbox Messages Endpoint

**Endpoint:** `GET /api/terminals/{terminal_id}/inbox/messages`

**Purpose:** Fetch all inbox messages for a specific terminal (both sent and received)

**Parameters:**
- `terminal_id` (path parameter, required): Terminal ID to fetch messages for
- `status` (query parameter, optional): Filter by message status ('pending', 'delivered', 'failed')
- `direction` (query parameter, optional): Filter by direction ('sent', 'received', 'all' - default: 'all')

**Response Format:**
```json
{
  "messages": [
    {
      "id": 1,
      "sender_id": "terminal_abc123",
      "receiver_id": "terminal_def456",
      "message": "Task completed successfully",
      "status": "delivered",
      "created_at": "2025-11-04T10:30:00Z"
    }
  ],
  "count": 1
}
```

**Status Codes:**
- 200: Success
- 404: Terminal not found
- 500: Server error

**Business Logic:**
```python
# Fetch messages where terminal is sender OR receiver
messages_sent = query.filter(InboxModel.sender_id == terminal_id)
messages_received = query.filter(InboxModel.receiver_id == terminal_id)

# If direction parameter specified:
# - 'sent': only messages_sent
# - 'received': only messages_received
# - 'all' or None: union of both

# If status parameter specified:
query = query.filter(InboxModel.status == status)

# Order by created_at DESC (newest first)
query = query.order_by(InboxModel.created_at.desc())
```

### 2. Get Pending Messages Count Endpoint

**Endpoint:** `GET /api/inbox/messages/pending/count`

**Purpose:** Get total count of pending messages across ALL terminals

**Parameters:** None

**Response Format:**
```json
{
  "count": 5,
  "pending_messages": 5
}
```

**Status Codes:**
- 200: Success
- 500: Server error

**Business Logic:**
```python
# Count all messages with status = 'pending'
count = session.query(InboxModel).filter(InboxModel.status == 'pending').count()
```

### 3. Get Terminal Pending Messages Count Endpoint

**Endpoint:** `GET /api/terminals/{terminal_id}/inbox/messages/pending/count`

**Purpose:** Get count of pending messages for a specific terminal

**Parameters:**
- `terminal_id` (path parameter, required): Terminal ID

**Response Format:**
```json
{
  "terminal_id": "terminal_abc123",
  "count": 2,
  "pending_messages": 2
}
```

**Status Codes:**
- 200: Success
- 404: Terminal not found
- 500: Server error

**Business Logic:**
```python
# Count pending messages where terminal is receiver
count = session.query(InboxModel).filter(
    InboxModel.receiver_id == terminal_id,
    InboxModel.status == 'pending'
).count()
```

## Implementation Details

### File to Modify
`src/cli_agent_orchestrator/api/main.py`

### Location in File
Add the new endpoints after the existing inbox endpoint (after line 329).

### Database Access Pattern
Use the existing database session pattern from other endpoints:
```python
from ..clients.database import get_session, InboxModel

@router.get("/terminals/{terminal_id}/inbox/messages")
async def get_inbox_messages(
    terminal_id: str,
    status: Optional[str] = None,
    direction: Optional[str] = "all"
):
    try:
        with get_session() as session:
            # Query logic here
            pass
    except Exception as e:
        logger.error(f"Error fetching inbox messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

### Response Model
You may want to create a Pydantic response model for type safety:

```python
# In src/cli_agent_orchestrator/models/inbox.py

class InboxMessagesResponse(BaseModel):
    messages: List[InboxMessage]
    count: int

class PendingCountResponse(BaseModel):
    count: int
    pending_messages: int

class TerminalPendingCountResponse(BaseModel):
    terminal_id: str
    count: int
    pending_messages: int
```

### Error Handling
- Validate terminal_id exists before querying (use terminal_service.get_terminal_status())
- Handle invalid status parameter (must be 'pending', 'delivered', or 'failed')
- Handle invalid direction parameter (must be 'sent', 'received', or 'all')
- Catch database exceptions and return appropriate HTTP errors
- Log errors using the existing logger

### Database Query Optimization
- Use SQLAlchemy's `.all()` to fetch results
- Consider adding LIMIT parameter for pagination (optional for v1)
- Use `.count()` efficiently for count endpoints
- Index on `sender_id`, `receiver_id`, `status`, `created_at` columns (check if indexes exist)

## Testing Requirements

### Manual Testing with curl

#### Test 1: Get all messages for a terminal
```bash
curl http://localhost:8000/api/terminals/{terminal_id}/inbox/messages
```
Expected: JSON response with all messages (sent and received)

#### Test 2: Get only received messages
```bash
curl "http://localhost:8000/api/terminals/{terminal_id}/inbox/messages?direction=received"
```
Expected: Only messages where terminal is receiver

#### Test 3: Get only pending messages
```bash
curl "http://localhost:8000/api/terminals/{terminal_id}/inbox/messages?status=pending"
```
Expected: Only messages with status='pending'

#### Test 4: Get pending count (all terminals)
```bash
curl http://localhost:8000/api/inbox/messages/pending/count
```
Expected: {"count": N, "pending_messages": N}

#### Test 5: Get pending count (specific terminal)
```bash
curl http://localhost:8000/api/terminals/{terminal_id}/inbox/messages/pending/count
```
Expected: {"terminal_id": "...", "count": N, "pending_messages": N}

### Test Data Setup
Create test messages using the existing MCP tool or POST endpoint:
```bash
# Send a message to create test data
curl -X POST "http://localhost:8000/api/terminals/{receiver_id}/inbox/messages?sender_id={sender_id}&message=Test+message"
```

### Verification Checklist
- [ ] Endpoints return correct HTTP status codes
- [ ] Response JSON matches expected format
- [ ] Filtering by status works correctly
- [ ] Filtering by direction works correctly
- [ ] Count endpoints return accurate counts
- [ ] Error handling works (invalid terminal_id, invalid parameters)
- [ ] Empty results handled correctly (empty array, count=0)
- [ ] Timestamps are ISO 8601 format
- [ ] No database connection leaks (sessions are closed)
- [ ] Logging works for errors

## Integration with Frontend

### Frontend API Client Changes Required
After backend endpoints are implemented, update `ui/src/api/client.ts`:

```typescript
// REMOVE mock data and replace with real API calls:

getInboxMessages: async (terminalId: string, status?: string, direction?: string) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (direction) params.append('direction', direction);

  const { data } = await axios.get(
    `${API_BASE}/terminals/${terminalId}/inbox/messages?${params.toString()}`
  );
  return data.messages; // Extract messages array from response
},

getPendingMessagesCount: async (terminalId?: string) => {
  if (terminalId) {
    const { data } = await axios.get(
      `${API_BASE}/terminals/${terminalId}/inbox/messages/pending/count`
    );
    return data.count;
  } else {
    const { data } = await axios.get(
      `${API_BASE}/inbox/messages/pending/count`
    );
    return data.count;
  }
},
```

## Code Quality Requirements

### 1. Follow Existing Patterns
- Match coding style of other endpoints in main.py
- Use same error handling patterns
- Follow same logging conventions
- Use consistent response formats

### 2. Type Safety
- Use Pydantic models for request/response validation
- Properly type all function parameters
- Return type hints for all functions

### 3. Documentation
- Add docstrings to all endpoint functions
- Include parameter descriptions
- Document response format
- Add inline comments for complex logic

### 4. Security
- Validate all input parameters
- Sanitize terminal_id to prevent injection
- Use parameterized queries (SQLAlchemy handles this)
- Don't expose sensitive information in errors

### 5. Performance
- Use efficient database queries
- Avoid N+1 query problems
- Consider pagination for large result sets (optional v1)
- Properly index database columns

## Acceptance Criteria

### Must Have:
1. All three endpoints implemented and working
2. Endpoints return data in specified JSON format
3. Filtering by status works correctly
4. Filtering by direction works correctly
5. Count endpoints return accurate counts
6. Error handling implemented with proper HTTP status codes
7. Code follows existing project patterns
8. Manual testing with curl successful for all endpoints
9. No TypeScript/Python errors or warnings
10. Database queries are efficient

### Nice to Have:
1. Pagination support (limit, offset parameters)
2. Sorting parameter (by date, status)
3. Search/filter by message content
4. Bulk operations (mark multiple as read, delete)
5. Response caching for performance
6. API endpoint documentation (OpenAPI/Swagger)

## Files to Modify/Create

### Modify:
1. `src/cli_agent_orchestrator/api/main.py` - Add three new endpoints

### Optionally Modify:
1. `src/cli_agent_orchestrator/models/inbox.py` - Add response models (if needed)
2. `src/cli_agent_orchestrator/clients/database.py` - Add helper functions (if needed)

## Expected Deliverables

1. **Code Implementation:**
   - Three new GET endpoints in main.py
   - Response models (if created)
   - Error handling for all endpoints

2. **Testing Evidence:**
   - curl command outputs showing successful responses
   - Examples of error handling (invalid terminal_id, etc.)
   - Screenshots or logs of testing

3. **Documentation:**
   - Docstrings for all new functions
   - Comments explaining complex logic
   - Notes on any design decisions

4. **Integration Notes:**
   - Instructions for frontend team to integrate
   - Example API responses
   - Any breaking changes or considerations

## Example Implementation Skeleton

```python
# In src/cli_agent_orchestrator/api/main.py

from typing import Optional, List
from sqlalchemy import or_, and_

@router.get("/terminals/{terminal_id}/inbox/messages")
async def get_inbox_messages(
    terminal_id: str,
    status: Optional[str] = None,
    direction: Optional[str] = "all"
):
    """
    Get all inbox messages for a terminal.

    Args:
        terminal_id: Terminal ID to fetch messages for
        status: Filter by message status (pending/delivered/failed)
        direction: Filter by direction (sent/received/all)

    Returns:
        JSON with messages array and count
    """
    try:
        # Validate parameters
        if status and status not in ['pending', 'delivered', 'failed']:
            raise HTTPException(status_code=400, detail="Invalid status parameter")

        if direction not in ['sent', 'received', 'all']:
            raise HTTPException(status_code=400, detail="Invalid direction parameter")

        with get_session() as session:
            # Build query based on direction
            query = session.query(InboxModel)

            if direction == 'sent':
                query = query.filter(InboxModel.sender_id == terminal_id)
            elif direction == 'received':
                query = query.filter(InboxModel.receiver_id == terminal_id)
            else:  # 'all'
                query = query.filter(
                    or_(
                        InboxModel.sender_id == terminal_id,
                        InboxModel.receiver_id == terminal_id
                    )
                )

            # Apply status filter if provided
            if status:
                query = query.filter(InboxModel.status == status)

            # Order by created_at DESC (newest first)
            query = query.order_by(InboxModel.created_at.desc())

            # Execute query
            db_messages = query.all()

            # Convert to response format
            messages = [
                {
                    "id": msg.id,
                    "sender_id": msg.sender_id,
                    "receiver_id": msg.receiver_id,
                    "message": msg.message,
                    "status": msg.status,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in db_messages
            ]

            return {
                "messages": messages,
                "count": len(messages)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching inbox messages for terminal {terminal_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inbox/messages/pending/count")
async def get_pending_messages_count():
    """Get total count of pending messages across all terminals."""
    try:
        with get_session() as session:
            count = session.query(InboxModel).filter(
                InboxModel.status == 'pending'
            ).count()

            return {
                "count": count,
                "pending_messages": count
            }
    except Exception as e:
        logger.error(f"Error fetching pending messages count: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/terminals/{terminal_id}/inbox/messages/pending/count")
async def get_terminal_pending_messages_count(terminal_id: str):
    """Get count of pending messages for a specific terminal."""
    try:
        with get_session() as session:
            count = session.query(InboxModel).filter(
                and_(
                    InboxModel.receiver_id == terminal_id,
                    InboxModel.status == 'pending'
                )
            ).count()

            return {
                "terminal_id": terminal_id,
                "count": count,
                "pending_messages": count
            }
    except Exception as e:
        logger.error(f"Error fetching pending count for terminal {terminal_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

## Notes

1. **CORS:** Ensure CORS settings in main.py allow GET requests from frontend
2. **Database Session:** Use `with get_session()` context manager for automatic cleanup
3. **Logging:** Use the existing logger instance from main.py
4. **Testing:** Server must be running - start with `python -m cli_agent_orchestrator.api.main`
5. **Frontend Integration:** Coordinate with frontend developer to remove mock data once endpoints are live

---

**Estimated Effort:** 2-3 hours

**Dependencies:**
- Existing database models and functions
- Existing API infrastructure

**Risks:**
- Database query performance with many messages (consider pagination in future)
- Frontend may need updates to handle new response format
