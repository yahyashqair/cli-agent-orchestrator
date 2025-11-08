# Session Archiving

## Overview

The CLI Agent Orchestrator supports archiving of completed sessions. This feature allows you to preserve session metadata and terminal information without keeping the tmux session running or cluttering your active sessions list.

## Features

- **Archive Sessions**: Snapshot all terminals in a session and remove it from the active list
- **View Archived Sessions**: Browse all archived sessions with their terminal metadata
- **Separate Archive List**: Archived sessions appear in a dedicated section in the UI
- **Status Preservation**: Terminal statuses are captured at the time of archiving
- **Pending Message Filtering**: Dashboard counts only show pending messages for active sessions

## How to Archive a Session

### Via UI

1. Navigate to the Sessions view in the web UI
2. Find the session you want to archive
3. Click the Archive icon (📦) next to the session name
4. Confirm the archival action

The session will be removed from the active sessions list and will appear in the "Archived Sessions" section below.

### Via API

Archive a session using the POST endpoint:

```bash
curl -X POST http://127.0.0.1:9889/sessions/{session_name}/archive
```

Optional parameter:
- `archived_by`: String identifier for who/what triggered the archive

## Viewing Archived Sessions

### Via UI

Archived sessions appear in a collapsible section below the active sessions list. Click on an archived session to view:
- Archive timestamp
- Original creation date
- All terminals that were part of the session
- Terminal statuses at the time of archiving

### Via API

List all archived sessions:

```bash
curl http://127.0.0.1:9889/sessions/archived
```

Get a specific archived session:

```bash
curl http://127.0.0.1:9889/sessions/archived/{session_name}
```

## Data Preserved in Archives

When a session is archived, the following information is preserved:

### Session Level
- Session name
- Archive timestamp
- Original creation date
- User/system that triggered the archive

### Terminal Level
- Terminal ID
- Provider (e.g., q_cli, claude_code)
- Agent profile
- Status at time of archiving
- Creation timestamp
- Last active timestamp
- Full permissions setting
- Working directory

## Technical Details

### Database Schema

**archived_sessions table:**
- `id`: Primary key
- `name`: Session name (unique)
- `archived_at`: Timestamp when archived
- `archived_by`: Optional identifier
- `original_created_at`: Original session creation date
- `extra_metadata`: JSON blob for future extensibility

**archived_terminals table:**
- `id`: Primary key
- `session_name`: Foreign key to archived session
- `terminal_id`: Original terminal ID
- `provider`: Provider name
- `agent_profile`: Agent profile name
- `status`: Terminal status at archiving
- `created_at`: Terminal creation timestamp
- `last_active`: Last activity timestamp
- `full_permissions`: Permissions flag
- `working_directory`: Working directory path

### API Endpoints

- `POST /sessions/{session_name}/archive` - Archive a session
- `GET /sessions/archived` - List all archived sessions
- `GET /sessions/archived/{session_name}` - Get specific archived session
- `GET /inbox/messages/pending/count?include_archived=false` - Count pending messages (excluding archived)

### Status Normalization

All terminal statuses are normalized to uppercase (IDLE, PROCESSING, COMPLETED, etc.) to ensure consistency across the system. This affects:
- Active session status display
- Dashboard Active/Idle counters
- Archived terminal status preservation

## Best Practices

1. **Archive completed sessions** to keep your active sessions list clean
2. **Don't archive active work** - only archive sessions where work is complete
3. **Use meaningful identifiers** in the `archived_by` parameter for audit trails
4. **Review archives periodically** to delete very old archives if needed

## Differences from Deletion

| Action | Archives Session | Deletes Tmux Session | Preserves Metadata | Reversible |
|--------|------------------|----------------------|---------------------|------------|
| **Archive** | Yes | Yes | Yes | No* |
| **Delete** | No | Yes | No | No |

*Note: Archiving is not reversible - you cannot restore an archived session to active status. However, all metadata is preserved for reference.

## Troubleshooting

### Session already archived error
If you try to archive a session that's already been archived, you'll receive an error. Check the archived sessions list to confirm.

### Archived session still appears in tmux
The archiving process should kill the tmux session. If it still appears, you can manually kill it with:
```bash
tmux kill-session -t {session-name}
```

### Pending message count seems wrong
Ensure you're using `include_archived=false` when querying pending messages for active work only. The default is `true` for backward compatibility.

## Future Enhancements

Potential future improvements to the archiving system:
- Export archived sessions to JSON/CSV
- Search and filter archived sessions
- Automatic archiving based on age or inactivity
- Archive restoration (convert back to active session)
- Archive compression for long-term storage
