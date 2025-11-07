# Codex Developer Assignment and Session Creation Analysis

## Overview
This document details how codex handles developer assignment, session creation, and terminal messaging between developers and supervisors.

---

## 1. DEVELOPER ASSIGNMENT MECHANISM

### Entry Point: `assign()` MCP Tool
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/mcp_server/server.py`
**Lines:** 246-284

```python
@mcp.tool()
async def assign(
    agent_profile: str = Field(
        description='The agent profile for the worker agent (e.g., "developer", "analyst")'
    ),
    message: str = Field(
        description="The task message to send. Include callback instructions for the worker to send results back."
    ),
) -> Dict[str, Any]:
    """Assigns a task to another agent without blocking.
    
    In the message to the worker agent include instruction to send results back via send_message tool.
    **IMPORTANT**: The terminal id of each agent is available in environment variable CAO_TERMINAL_ID.
    When assigning, first find out your own CAO_TERMINAL_ID value, then include the terminal_id value 
    in the message to the worker agent to allow callback.
    Example message: "Analyze the logs. When done, send results back to terminal ee3f93b3 using send_message tool."
    
    Args:
        agent_profile: Agent profile for the worker terminal
        message: Task message (include callback instructions)
        
    Returns:
        Dict with success status, worker terminal_id, and message
    """
    try:
        # Create terminal
        terminal_id, _ = _create_terminal(agent_profile)
        
        # Send message immediately
        _send_direct_input(terminal_id, message)
        
        return {
            "success": True,
            "terminal_id": terminal_id,
            "message": f"Task assigned to {agent_profile} (terminal: {terminal_id})",
        }
    
    except Exception as e:
        return {"success": False, "terminal_id": None, "message": f"Assignment failed: {str(e)}"}
```

**Key Points:**
- Non-blocking assignment (unlike `handoff()` which waits for completion)
- Creates a new terminal with the specified agent profile
- Sends task immediately via direct input
- Returns the worker's terminal ID for callback communication
- Requires callback instructions in the message for bidirectional communication

---

## 2. SESSION CREATION FLOW

### Terminal Creation: `_create_terminal()` Helper
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/mcp_server/server.py`
**Lines:** 36-102

#### Flow Diagram:
```
_create_terminal(agent_profile)
    ↓
Check CAO_TERMINAL_ID environment variable
    ↓
    ├─ If SET (called from within a terminal):
    │  ├─ Get parent terminal metadata via API
    │  ├─ Extract session_name and working_directory
    │  └─ Create NEW TERMINAL in EXISTING SESSION
    │     POST /sessions/{session_name}/terminals
    │
    └─ If NOT SET (called from outside):
       ├─ Generate new session name
       ├─ Use current working directory
       └─ Create NEW SESSION with NEW TERMINAL
          POST /sessions
```

#### Code Implementation:
```python
def _create_terminal(agent_profile: str) -> Tuple[str, str]:
    """Create a new terminal with the specified agent profile.
    
    Args:
        agent_profile: Agent profile for the terminal
        
    Returns:
        Tuple of (terminal_id, provider)
        
    Raises:
        Exception: If terminal creation fails
    """
    provider = DEFAULT_PROVIDER
    profile_provider = None
    
    try:
        profile = load_agent_profile(agent_profile)
        profile_provider = getattr(profile, "provider", None)
    except Exception as exc:
        raise RuntimeError(
            f"Agent profile '{agent_profile}' is not installed. Run `cao install` before invoking it."
        ) from exc
    
    if profile_provider:
        provider = profile_provider
    
    # Get current terminal ID from environment
    current_terminal_id = os.environ.get("CAO_TERMINAL_ID")
    if current_terminal_id:
        # Get terminal metadata via API
        response = requests.get(f"{API_BASE_URL}/terminals/{current_terminal_id}")
        response.raise_for_status()
        terminal_metadata = response.json()
        
        session_name = terminal_metadata["session_name"]
        working_directory = terminal_metadata.get("working_directory")  # Inherit from parent
        
        if not profile_provider:
            provider = terminal_metadata["provider"]
        
        # Create new terminal in existing session
        params = {"provider": provider, "agent_profile": agent_profile}
        if working_directory:
            params["working_directory"] = working_directory
        response = requests.post(
            f"{API_BASE_URL}/sessions/{session_name}/terminals",
            params=params,
        )
        response.raise_for_status()
        terminal = response.json()
    else:
        # Create new session with terminal - use current working directory
        session_name = generate_session_name()
        working_directory = os.getcwd()
        response = requests.post(
            f"{API_BASE_URL}/sessions",
            params={
                "provider": provider,
                "agent_profile": agent_profile,
                "session_name": session_name,
                "working_directory": working_directory,
            },
        )
        response.raise_for_status()
        terminal = response.json()
    
    return terminal["id"], provider
```

### Backend: Terminal Service
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/services/terminal_service.py`
**Lines:** 33-119

```python
def create_terminal(
    provider: str,
    agent_profile: str,
    session_name: str = None,
    new_session: bool = False,
    working_directory: str = None,
    full_permissions: bool = False,
) -> Terminal:
    """Create terminal, optionally creating new session with it."""
    try:
        terminal_id = generate_terminal_id()
        
        # Generate session name if not provided
        if not session_name:
            session_name = generate_session_name()
        
        window_name = generate_window_name(agent_profile)
        
        if new_session:
            # Apply SESSION_PREFIX if not already present
            if not session_name.startswith(SESSION_PREFIX):
                session_name = f"{SESSION_PREFIX}{session_name}"
            
            # Check if session already exists
            if tmux_client.session_exists(session_name):
                raise ValueError(f"Session '{session_name}' already exists")
            
            # Create new tmux session with this terminal as the initial window
            tmux_client.create_session(session_name, window_name, terminal_id, working_directory)
        else:
            # Add window to existing session
            if not tmux_client.session_exists(session_name):
                raise ValueError(f"Session '{session_name}' not found")
            window_name = tmux_client.create_window(
                session_name, window_name, terminal_id, working_directory
            )
        
        # Save terminal metadata to database
        db_create_terminal(
            terminal_id,
            session_name,
            window_name,
            provider,
            agent_profile,
            working_directory,
            full_permissions,
        )
        
        # Initialize provider
        provider_instance = provider_manager.create_provider(
            provider,
            terminal_id,
            session_name,
            window_name,
            agent_profile,
            working_directory,
            full_permissions=full_permissions,
        )
        provider_instance.initialize()
        
        # Create log file and start pipe-pane
        log_path = TERMINAL_LOG_DIR / f"{terminal_id}.log"
        log_path.touch()  # Ensure file exists before watching
        tmux_client.pipe_pane(session_name, window_name, str(log_path))
        
        # Return terminal model
        terminal = Terminal(
            id=terminal_id,
            name=window_name,
            provider=provider,
            session_name=session_name,
            agent_profile=agent_profile,
            full_permissions=full_permissions,
        )
        
        logger.info(
            f"Created terminal: {terminal_id} in session: {session_name} (new_session={new_session})"
        )
        return terminal
    
    except Exception as e:
        logger.error(f"Failed to create terminal: {e}")
        if new_session:
            try:
                tmux_client.kill_session(session_name)
            except:
                pass
        raise
```

---

## 3. TERMINAL ENVIRONMENT SETUP

### CAO_TERMINAL_ID Environment Variable
The `CAO_TERMINAL_ID` environment variable is set at multiple levels:

#### A. During Session Creation (tmux)
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/clients/tmux.py`
**Lines:** 25-51

```python
def create_session(
    self, session_name: str, window_name: str, terminal_id: str, working_directory: str = None
) -> str:
    """Create detached tmux session with initial window and return window name."""
    try:
        environment = os.environ.copy()
        environment["CAO_TERMINAL_ID"] = terminal_id
        
        kwargs = {
            "session_name": session_name,
            "window_name": window_name,
            "detach": True,
            "environment": environment,
        }
        
        if working_directory:
            kwargs["start_directory"] = working_directory
        
        session = self.server.new_session(**kwargs)
        logger.info(
            f"Created tmux session: {session_name} with window: {window_name}"
            + (f" in directory: {working_directory}" if working_directory else "")
        )
        return session.windows[0].name
    except Exception as e:
        logger.error(f"Failed to create session {session_name}: {e}")
        raise
```

#### B. During Window Creation (within existing session)
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/clients/tmux.py`
**Lines:** 53-76

```python
def create_window(
    self, session_name: str, window_name: str, terminal_id: str, working_directory: str = None
) -> str:
    """Create window in session and return window name."""
    try:
        session = self.server.sessions.get(session_name=session_name)
        if not session:
            raise ValueError(f"Session '{session_name}' not found")
        
        kwargs = {"window_name": window_name, "environment": {"CAO_TERMINAL_ID": terminal_id}}
        
        if working_directory:
            kwargs["start_directory"] = working_directory
        
        window = session.new_window(**kwargs)
        
        logger.info(
            f"Created window '{window.name}' in session '{session_name}'"
            + (f" in directory: {working_directory}" if working_directory else "")
        )
        return window.name
    except Exception as e:
        logger.error(f"Failed to create window in session {session_name}: {e}")
        raise
```

#### C. Per-Provider Initialization
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/providers/codex_cli.py`
**Lines:** 87-92

```python
# Export environment variables so Codex inherits terminal metadata and MCP settings.
runtime_env = {"CAO_TERMINAL_ID": self.terminal_id}
runtime_env.update(self._env_exports)

for key, value in runtime_env.items():
    quoted = shlex.quote(str(value))
    tmux_client.send_keys(self.session_name, self.window_name, f"export {key}={quoted}")
```

---

## 4. MESSAGING BETWEEN DEVELOPER AND SUPERVISOR

### Two Communication Mechanisms:

#### A. Direct Input (Immediate Execution)
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/mcp_server/server.py`
**Lines:** 105-118

```python
def _send_direct_input(terminal_id: str, message: str) -> None:
    """Send input directly to a terminal (bypasses inbox).
    
    Args:
        terminal_id: Terminal ID
        message: Message to send
        
    Raises:
        Exception: If sending fails
    """
    response = requests.post(
        f"{API_BASE_URL}/terminals/{terminal_id}/input", params={"message": message}
    )
    response.raise_for_status()
```

**Used by:**
- `assign()` - Send task to worker immediately
- `handoff()` - Send message to newly created terminal
- Direct API endpoint: `POST /terminals/{terminal_id}/input`

#### B. Inbox Message (Queued Delivery)
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/mcp_server/server.py`
**Lines:** 121-144

```python
def _send_to_inbox(receiver_id: str, message: str) -> Dict[str, Any]:
    """Send message to another terminal's inbox (queued delivery when IDLE).
    
    Args:
        receiver_id: Target terminal ID
        message: Message content
        
    Returns:
        Dict with message details
        
    Raises:
        ValueError: If CAO_TERMINAL_ID not set
        Exception: If API call fails
    """
    sender_id = os.getenv("CAO_TERMINAL_ID")
    if not sender_id:
        raise ValueError("CAO_TERMINAL_ID not set - cannot determine sender")
    
    response = requests.post(
        f"{API_BASE_URL}/terminals/{receiver_id}/inbox/messages",
        params={"sender_id": sender_id, "message": message},
    )
    response.raise_for_status()
    return response.json()
```

**MCP Tool Wrapper:**
**Lines:** 286-306

```python
@mcp.tool()
async def send_message(
    receiver_id: str = Field(description="Target terminal ID to send message to"),
    message: str = Field(description="Message content to send"),
) -> Dict[str, Any]:
    """Send a message to another terminal's inbox.
    
    The message will be delivered when the destination terminal is IDLE.
    Messages are delivered in order (oldest first).
    
    Args:
        receiver_id: Terminal ID of the receiver
        message: Message content to send
        
    Returns:
        Dict with success status and message details
    """
    try:
        return _send_to_inbox(receiver_id, message)
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### Backend: Inbox Service
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/services/inbox_service.py`
**Lines:** 46-86

```python
def check_and_send_pending_messages(terminal_id: str) -> bool:
    """Check for pending messages and send if terminal is ready.
    
    Args:
        terminal_id: Terminal ID to check messages for
        
    Returns:
        bool: True if a message was sent, False otherwise
        
    Raises:
        ValueError: If provider not found for terminal
    """
    # Check for pending messages
    messages = get_pending_messages(terminal_id, limit=1)
    if not messages:
        return False
    
    message = messages[0]
    
    # Get provider and check status
    provider = provider_manager.get_provider(terminal_id)
    status = provider.get_status(tail_lines=INBOX_SERVICE_TAIL_LINES)
    
    if status not in (TerminalStatus.IDLE, TerminalStatus.COMPLETED):
        logger.debug(f"Terminal {terminal_id} not ready (status={status})")
        return False
    
    # Send message with notification header
    try:
        # Prepend a clear notification to make the incoming message visible
        notification_header = f"[INBOX MESSAGE FROM {message.sender_id}]"
        formatted_message = f"{notification_header}\n{message.message}"
        
        terminal_service.send_input(terminal_id, formatted_message)
        update_message_status(message.id, MessageStatus.DELIVERED)
        logger.info(f"Delivered message {message.id} to terminal {terminal_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send message {message.id} to {terminal_id}: {e}")
        update_message_status(message.id, MessageStatus.FAILED)
        raise
```

**Automatic Delivery Watchdog:**
**Lines:** 89-120

```python
class LogFileHandler(FileSystemEventHandler):
    """Handler for terminal log file changes."""
    
    def on_modified(self, event):
        """Handle file modification events."""
        if isinstance(event, FileModifiedEvent) and event.src_path.endswith(".log"):
            log_path = Path(event.src_path)
            terminal_id = log_path.stem
            logger.debug(f"Log file modified: {terminal_id}.log")
            self._handle_log_change(terminal_id)
    
    def _handle_log_change(self, terminal_id: str):
        """Handle log file change and attempt message delivery."""
        try:
            # Check for pending messages first
            messages = get_pending_messages(terminal_id, limit=1)
            if not messages:
                logger.debug(f"No pending messages for {terminal_id}, skipping")
                return
            
            # Fast check: does log tail have idle pattern?
            if not _has_idle_pattern(terminal_id):
                logger.debug(
                    f"Terminal {terminal_id} not idle (no idle pattern in log tail), skipping"
                )
                return
            
            # Attempt delivery
            check_and_send_pending_messages(terminal_id)
        
        except Exception as e:
            logger.error(f"Error handling log change for {terminal_id}: {e}")
```

---

## 5. ERROR HANDLING AND EDGE CASES

### A. Parent Terminal Not Found
**Scenario:** When `CAO_TERMINAL_ID` is set but parent terminal doesn't exist

**Code Location:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/mcp_server/server.py` Lines 62-74

```python
current_terminal_id = os.environ.get("CAO_TERMINAL_ID")
if current_terminal_id:
    # Get terminal metadata via API
    response = requests.get(f"{API_BASE_URL}/terminals/{current_terminal_id}")
    response.raise_for_status()  # Will raise HTTPException if terminal not found
    terminal_metadata = response.json()
```

**API Error Response** (from `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/api/main.py` Lines 247-258):

```python
@app.get("/terminals/{terminal_id}", response_model=Terminal)
async def get_terminal(terminal_id: TerminalId) -> Terminal:
    try:
        terminal = terminal_service.get_terminal(terminal_id)
        return Terminal(**terminal)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get terminal: {str(e)}",
        )
```

### B. Session Not Found When Creating Terminal
**Scenario:** When adding a terminal to a non-existent session

**Code Location:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/services/terminal_service.py` Lines 62-68

```python
else:
    # Add window to existing session
    if not tmux_client.session_exists(session_name):
        raise ValueError(f"Session '{session_name}' not found")
    window_name = tmux_client.create_window(
        session_name, window_name, terminal_id, working_directory
    )
```

**API Error Response** (from `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/api/main.py` Lines 206-230):

```python
@app.post(
    "/sessions/{session_name}/terminals",
    response_model=Terminal,
    status_code=status.HTTP_201_CREATED,
)
async def create_terminal_in_session(
    session_name: str,
    provider: str,
    agent_profile: str,
    working_directory: str = None,
    full_permissions: bool = Query(default=False),
) -> Terminal:
    """Create additional terminal in existing session."""
    try:
        result = terminal_service.create_terminal(
            provider=provider,
            agent_profile=agent_profile,
            session_name=session_name,
            new_session=False,
            working_directory=working_directory,
            full_permissions=full_permissions,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create terminal: {str(e)}",
        )
```

### C. CAO_TERMINAL_ID Not Set for Callbacks
**Scenario:** When `send_message()` is called without proper environment variable

**Code Location:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/mcp_server/server.py` Lines 135-137

```python
sender_id = os.getenv("CAO_TERMINAL_ID")
if not sender_id:
    raise ValueError("CAO_TERMINAL_ID not set - cannot determine sender")
```

**Error in MCP Tool Wrapper** (Lines 303-306):

```python
try:
    return _send_to_inbox(receiver_id, message)
except Exception as e:
    return {"success": False, "error": str(e)}
```

---

## 6. API ENDPOINTS

### Session Management
- **Create Session:** `POST /sessions?provider=&agent_profile=&session_name=&working_directory=`
- **List Sessions:** `GET /sessions`
- **Get Session:** `GET /sessions/{session_name}`
- **Delete Session:** `DELETE /sessions/{session_name}`

### Terminal Management
- **Create Terminal in Session:** `POST /sessions/{session_name}/terminals?provider=&agent_profile=&working_directory=`
- **List Terminals in Session:** `GET /sessions/{session_name}/terminals`
- **Get Terminal:** `GET /terminals/{terminal_id}`
- **Send Input:** `POST /terminals/{terminal_id}/input?message=`
- **Get Output:** `GET /terminals/{terminal_id}/output?mode=full|last`
- **Exit Terminal:** `POST /terminals/{terminal_id}/exit`
- **Delete Terminal:** `DELETE /terminals/{terminal_id}`

### Inbox/Messaging
- **Create Inbox Message:** `POST /terminals/{receiver_id}/inbox/messages?sender_id=&message=`
- **Get Inbox Messages:** `GET /terminals/{terminal_id}/inbox/messages?status=&direction=sent|received|all`
- **Get Pending Messages Count:** `GET /inbox/messages/pending/count`
- **Get Terminal Pending Count:** `GET /terminals/{terminal_id}/inbox/messages/pending/count`

---

## 7. DATA MODELS

### Terminal Status Enum
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/models/terminal.py` Lines 14-22

```python
class TerminalStatus(str, Enum):
    """Terminal status enumeration with provider-aware states."""
    
    IDLE = "idle"
    PROCESSING = "processing"
    COMPLETED = "completed"
    WAITING_PERMISSION = "waiting_permission"
    WAITING_USER_ANSWER = "waiting_user_answer"
    ERROR = "error"
```

### Terminal Model
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/models/terminal.py` Lines 25-42

```python
class Terminal(BaseModel):
    """Terminal model - represents a tmux window."""
    
    model_config = ConfigDict(use_enum_values=True)
    
    id: str = Field(..., description="Unique terminal identifier")
    name: str = Field(..., description="Terminal/window name")
    provider: ProviderType = Field(..., description="CLI tool provider")
    session_name: str = Field(..., description="Session name")
    agent_profile: Optional[str] = Field(None, description="Agent profile")
    full_permissions: bool = Field(
        default=False,
        description="Whether the agent was launched with full permissions enabled",
    )
    status: Optional[TerminalStatus] = Field(
        None, description="Current terminal status (live only)"
    )
    last_active: Optional[datetime] = Field(None, description="Last active timestamp")
```

### Database Models
**File:** `/home/yahyashqair/anonDev/cli-agent-orchestrator/src/cli_agent_orchestrator/clients/database.py` Lines 19-46

```python
class TerminalModel(Base):
    """SQLAlchemy model for terminal metadata only."""
    
    __tablename__ = "terminals"
    
    id = Column(String, primary_key=True)  # "abc123ef"
    tmux_session = Column(String, nullable=False)  # "cao-session-name"
    tmux_window = Column(String, nullable=False)  # "window-name"
    provider = Column(String, nullable=False)  # "q_cli", "claude_code"
    agent_profile = Column(String)  # "developer", "reviewer" (optional)
    working_directory = Column(String)  # working directory path (optional)
    full_permissions = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.now)
    last_active = Column(DateTime, default=datetime.now)

class InboxModel(Base):
    """SQLAlchemy model for inbox messages."""
    
    __tablename__ = "inbox"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sender_id = Column(String, nullable=False)
    receiver_id = Column(String, nullable=False)
    message = Column(String, nullable=False)
    status = Column(String, nullable=False)  # MessageStatus enum value
    created_at = Column(DateTime, default=datetime.now)
    delivered_at = Column(DateTime, nullable=True)
```

---

## 8. WORKFLOW EXAMPLE: Supervisor Assigning Task to Developer

```
Supervisor Terminal (ID: supervisor123)
    ↓
    assign(agent_profile="developer", message="Fix bug XYZ. When done, send results to supervisor123")
    ↓
    _create_terminal("developer")
    ├─ CAO_TERMINAL_ID env var IS SET (supervisor123)
    ├─ Get parent terminal metadata: session_name="cao-main-session"
    └─ Create new terminal in existing session
        POST /sessions/cao-main-session/terminals
    ↓
    Returns: terminal_id="dev456", provider="q_cli"
    ↓
    _send_direct_input("dev456", "Fix bug XYZ. When done, send results to supervisor123")
    ├─ Send message immediately (no wait for IDLE)
    └─ POST /terminals/dev456/input
    ↓
    Developer Terminal (ID: dev456)
    ├─ CAO_TERMINAL_ID="dev456" (set at creation)
    ├─ Receives task via tmux send-keys
    ├─ Does work...
    └─ When done: send_message(receiver_id="supervisor123", message="Results: ...")
        ├─ Raises ValueError: CAO_TERMINAL_ID not set (needs runtime env)
        ├─ OR uses: CAO_TERMINAL_ID="dev456" from environment
        ├─ POST /terminals/supervisor123/inbox/messages
        └─ Message queued with status=PENDING
    ↓
    Supervisor Terminal
    ├─ Log file watcher detects activity
    ├─ Checks for pending messages → message found!
    ├─ Verifies supervisor terminal is IDLE
    └─ Delivers: [INBOX MESSAGE FROM dev456]\nResults: ...
```

---

## 9. KEY FILES SUMMARY

| File | Purpose | Key Functions/Classes |
|------|---------|----------------------|
| `/mcp_server/server.py` | MCP tools for agent communication | `assign()`, `handoff()`, `send_message()`, `_create_terminal()`, `_send_direct_input()`, `_send_to_inbox()` |
| `/services/terminal_service.py` | Terminal lifecycle management | `create_terminal()`, `send_input()`, `get_terminal()`, `get_output()`, `delete_terminal()` |
| `/services/session_service.py` | Session management | `list_sessions()`, `get_session()`, `delete_session()` |
| `/services/inbox_service.py` | Message delivery and watchdog | `check_and_send_pending_messages()`, `LogFileHandler` |
| `/clients/tmux.py` | Low-level tmux operations | `create_session()`, `create_window()`, `send_keys()`, `get_history()`, `pipe_pane()` |
| `/clients/database.py` | Database models and operations | `TerminalModel`, `InboxModel`, `create_terminal()`, `get_terminal_metadata()`, `create_inbox_message()` |
| `/api/main.py` | FastAPI endpoints | All REST endpoints for terminals, sessions, inbox |
| `/providers/manager.py` | Provider instantiation and management | `ProviderManager`, `create_provider()`, `get_provider()` |
| `/models/terminal.py` | Data models | `Terminal`, `TerminalStatus` |
| `/models/inbox.py` | Inbox data models | `InboxMessage`, `MessageStatus` |

