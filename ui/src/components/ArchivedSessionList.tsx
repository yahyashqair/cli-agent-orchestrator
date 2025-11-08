import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Terminal as TerminalIcon, Clock, Archive } from 'lucide-react'
import './SessionList.css'

interface ArchivedTerminal {
  id: string
  provider: string
  agent_profile: string
  status: string
  created_at: string
  last_active: string
  full_permissions: boolean
  working_directory?: string
}

interface ArchivedSession {
  name: string
  archived_at: string
  archived_by?: string
  original_created_at?: string
  terminal_count: number
  terminals: ArchivedTerminal[]
}

interface ArchivedSessionListProps {
  sessions: ArchivedSession[]
}

/**
 * Format a timestamp to a readable string
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

/**
 * Calculate duration from a timestamp to now
 * @param timestamp ISO timestamp string
 * @returns Formatted duration string
 */
function formatDuration(timestamp: string): string {
  const now = Date.now()
  const created = new Date(timestamp).getTime()
  const diffMs = now - created

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export default function ArchivedSessionList({ sessions }: ArchivedSessionListProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [isCollapsed, setIsCollapsed] = useState(true)

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) =>
      new Date(b.archived_at).getTime() - new Date(a.archived_at).getTime()
    ),
    [sessions]
  )

  const toggleSession = (sessionName: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionName)) {
      newExpanded.delete(sessionName)
    } else {
      newExpanded.add(sessionName)
    }
    setExpandedSessions(newExpanded)
  }

  return (
    <div className="archived-sessions-wrapper">
      <div
        className="archived-header"
        onClick={() => sortedSessions.length > 0 && setIsCollapsed(!isCollapsed)}
        style={{
          cursor: sortedSessions.length > 0 ? 'pointer' : 'default',
          userSelect: 'none'
        }}
      >
        <div className="session-list-title">
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            minWidth: '20px',
            opacity: sortedSessions.length === 0 ? 0.3 : 1
          }}>
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </span>
          <Archive size={16} style={{ marginLeft: '4px', marginRight: '6px', opacity: 0.7 }} />
          <span>Archived Sessions</span>
          <span className="archived-count" style={{
            marginLeft: '8px',
            fontSize: '0.75rem',
            opacity: 0.7,
            background: 'var(--glass-panel)',
            padding: '2px 8px',
            borderRadius: '999px'
          }}>
            {sortedSessions.length}
          </span>
        </div>
      </div>

      {!isCollapsed && sortedSessions.length > 0 && (
        <div className="archived-sessions-content">
      {sortedSessions.map((session, sessionIndex) => {
        const sessionKey = session?.name
          ? `${session.name}-${session.archived_at}`
          : `archived-session-${sessionIndex}`
        const isExpanded = expandedSessions.has(session.name)

        return (
          <div key={sessionKey} className="session-item">
            <div
              className="session-header frosted-card"
              onClick={() => toggleSession(session.name)}
              style={{ cursor: 'pointer' }}
            >
              <div className="session-header-left">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Archive size={14} style={{ marginRight: '4px', opacity: 0.7 }} />
                <span className="session-name">{session.name}</span>
                <span className="terminal-count">{session.terminal_count}</span>
              </div>
              <div className="session-meta" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Archived {formatDuration(session.archived_at)} ago
              </div>
            </div>

            {isExpanded && (
              <div className="archived-session-details" style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
                <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <div>Archived at: {formatTimestamp(session.archived_at)}</div>
                  {session.archived_by && <div>Archived by: {session.archived_by}</div>}
                  {session.original_created_at && <div>Originally created: {formatTimestamp(session.original_created_at)}</div>}
                </div>

                <div className="terminal-list">
                  {(session.terminals || []).map((terminal, terminalIndex) => {
                    const terminalKey =
                      terminal?.id || `${sessionKey}-terminal-${terminalIndex}`

                    return (
                      <div
                        key={terminalKey}
                        className="terminal-item glass-panel"
                        style={{ opacity: 0.8 }}
                      >
                      <div className="terminal-info">
                        <TerminalIcon size={14} />
                        <div className="terminal-details">
                          <div className="terminal-profile-row">
                            <div className="terminal-profile">{terminal.agent_profile}</div>
                            <span className="terminal-id" title={`Terminal ID: ${terminal.id}`}>
                              {terminal.id}
                            </span>
                          </div>
                          <div className="terminal-meta">
                            <span className="terminal-provider">{terminal.provider}</span>
                            <span className={`status-badge status-${terminal.status.toLowerCase()}`}>
                              {terminal.status}
                            </span>
                            {terminal.created_at && (
                              <span className="terminal-duration" title={`Created: ${formatTimestamp(terminal.created_at)}`}>
                                <Clock size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                                {formatDuration(terminal.created_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
        </div>
      )}

      {!isCollapsed && sortedSessions.length === 0 && (
        <div style={{
          padding: '1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          opacity: 0.7
        }}>
          <Archive size={24} style={{ opacity: 0.5, marginBottom: '8px' }} />
          <div>No archived sessions</div>
        </div>
      )}
    </div>
  )
}
