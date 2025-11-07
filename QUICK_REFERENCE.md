# Quick Reference: Developer Assignment and Messaging

## Core Concepts

### Three Key Components:
1. **Terminal**: Isolated tmux window with a specific provider (q_cli, codex_cli, etc.)
2. **Session**: Container of multiple terminals (multiple developers/agents can run in same session)
3. **CAO_TERMINAL_ID**: Environment variable uniquely identifying each terminal

---

## How Assignment Works

### Step 1: Supervisor Initiates Assignment
```python
result = assign(
    agent_profile="developer",
    message="Fix the authentication bug. When done, send results to supervisor123"
)
# Returns: {"success": True, "terminal_id": "dev456", ...}
```

### Step 2: Behind the Scenes - Terminal Creation
1. **Check CAO_TERMINAL_ID** in supervisor's environment
2. **If SET**: Get parent terminal's session → Create new terminal in SAME session
3. **If NOT SET**: Generate new session → Create new terminal with new session

### Step 3: Message Delivery Path
```
Message sent → Direct input to new terminal (immediate execution)
              → Developer terminal receives command
              → Developer does work
              → Developer sends results via send_message()
              → Results queued in Inbox
              → Log watchdog detects terminal became IDLE
              → Inbox message delivered to supervisor
```

---

## Key Differences: assign() vs handoff()

| Feature | assign() | handoff() |
|---------|----------|-----------|
| **Blocking** | No (non-blocking) | Yes (waits for completion) |
| **Message Delivery** | Immediate | Immediate |
| **Result Handling** | Manual via send_message() | Automatic (waits for COMPLETED status) |
| **Use Case** | Long-running tasks, parallel work | Short tasks needing immediate response |

---

## Messaging Mechanisms

### Direct Input (Immediate)
```
POST /terminals/{terminal_id}/input?message=...
```
- Used by: assign(), handoff()
- No prerequisites
- Message executed immediately
- Terminal status doesn't matter

### Inbox (Queued Delivery)
```
POST /terminals/{receiver_id}/inbox/messages?sender_id=...&message=...
```
- Requires: CAO_TERMINAL_ID environment variable set
- Message stored as PENDING
- Delivered when receiver reaches IDLE/COMPLETED status
- Automatic watchdog monitors log files for IDLE pattern

---

## Critical Environment Variables

### CAO_TERMINAL_ID
- **Set at**: Terminal creation time (by tmux client)
- **Available in**: All terminal shells and child processes
- **Used for**: 
  - Detecting parent terminal when creating children
  - Identifying sender in inbox messages
  - Callback communication between agents

### Setup in Different Providers

**Q CLI:**
- Set at session/window creation by tmux
- Available as environment variable

**Codex CLI:**
- Set at session/window creation by tmux
- Re-exported during initialization: `export CAO_TERMINAL_ID=...`

**Claude Code & Copilot:**
- Set at session/window creation by tmux
- Available through standard environment

---

## Error Cases and Solutions

### "Parent Terminal Not Found"
**Cause**: CAO_TERMINAL_ID points to non-existent terminal
**Solution**: Check parent terminal is still alive
**Where**: `_create_terminal()` → `requests.get("/terminals/{terminal_id}")`

### "Session Not Found"
**Cause**: Trying to add terminal to session that doesn't exist
**Solution**: Create session first with `POST /sessions`
**Where**: `terminal_service.create_terminal()` → `tmux_client.session_exists()`

### "CAO_TERMINAL_ID not set" (for send_message)
**Cause**: Called `send_message()` from outside a CAO terminal
**Solution**: Only use `send_message()` from within a terminal (inside agent/developer code)
**Alternative**: Use API directly with explicit sender_id parameter
**Where**: `_send_to_inbox()` → `os.getenv("CAO_TERMINAL_ID")`

---

## Session Hierarchy Example

```
cao-main-session (parent session)
├── supervisor (terminal: sup123, provider: q_cli)
└── dev1 (terminal: dev456, provider: q_cli)

When dev1 calls assign(agent_profile="reviewer"):
  └── cao-main-session
      ├── supervisor (sup123)
      ├── dev1 (dev456)
      └── reviewer (rev789) ← NEW terminal in SAME session

When supervisor calls assign() from outside terminal:
  └── cao-new-session (NEW session created)
      └── developer (dev999, provider: q_cli)
```

---

## Testing Assignment Flow

### Test 1: Parent Terminal Lookup
```bash
# Start supervisor terminal
export CAO_TERMINAL_ID=sup123

# Simulate assign() call - check parent metadata lookup
curl http://localhost:9889/terminals/sup123

# Should return metadata with session_name and working_directory
```

### Test 2: Session-based Creation
```bash
# From terminal with CAO_TERMINAL_ID set:
curl -X POST http://localhost:9889/sessions/cao-main-session/terminals \
  -d "provider=q_cli&agent_profile=developer"

# Should create new window in existing session
```

### Test 3: Message Delivery
```bash
# Send message to receiver
curl -X POST http://localhost:9889/terminals/dev456/inbox/messages \
  -d "sender_id=sup123&message=Hello"

# Check message status
curl http://localhost:9889/terminals/dev456/inbox/messages

# Should show status=PENDING initially, then DELIVERED when receiver is IDLE
```

---

## File Locations Summary

| What | Where |
|------|-------|
| MCP Tools (assign, send_message) | `/mcp_server/server.py` |
| Terminal Creation Logic | `/services/terminal_service.py` |
| Session Management | `/services/session_service.py` |
| Message Delivery | `/services/inbox_service.py` |
| Tmux Operations | `/clients/tmux.py` |
| Database Models | `/clients/database.py` |
| API Endpoints | `/api/main.py` |
| Provider Management | `/providers/manager.py` |

---

## Quick Debug Checklist

When assignment fails:

1. Check CAO_TERMINAL_ID is set in calling terminal
   ```bash
   echo $CAO_TERMINAL_ID
   ```

2. Verify parent terminal exists
   ```bash
   curl http://localhost:9889/terminals/<CAO_TERMINAL_ID>
   ```

3. Check session still exists
   ```bash
   curl http://localhost:9889/sessions
   ```

4. Verify new terminal was created
   ```bash
   tmux list-windows -t cao-main-session
   ```

5. Check logs for detailed error
   ```bash
   tail -f .logs/cao-server.log
   ```

6. Verify inbox messages status
   ```bash
   curl http://localhost:9889/terminals/<terminal_id>/inbox/messages
   ```

