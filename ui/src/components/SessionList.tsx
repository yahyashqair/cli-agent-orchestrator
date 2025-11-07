import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Trash2, Terminal as TerminalIcon, Clock, Download } from 'lucide-react'
import { api } from '../api/client'
import type { Session } from '../types'
import './SessionList.css'

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

interface SessionListProps {
  sessions: Session[]
  selectedTerminalId: string | null
  onTerminalSelect: (id: string) => void
}

export default function SessionList({
  sessions,
  selectedTerminalId,
  onTerminalSelect,
}: SessionListProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [, setUpdateTick] = useState(0)
  const queryClient = useQueryClient()

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (b.terminal_count ?? 0) - (a.terminal_count ?? 0)),
    [sessions]
  )

  // Update durations every second
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTick(tick => tick + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const deleteSessionMutation = useMutation({
    mutationFn: api.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const deleteTerminalMutation = useMutation({
    mutationFn: api.deleteTerminal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const toggleSession = (sessionName: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionName)) {
      newExpanded.delete(sessionName)
    } else {
      newExpanded.add(sessionName)
    }
    setExpandedSessions(newExpanded)
  }

  const handleDeleteSession = (sessionName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete session "${sessionName}" and all its terminals?`)) {
      deleteSessionMutation.mutate(sessionName)
    }
  }

  const handleDeleteTerminal = (terminalId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this terminal?')) {
      deleteTerminalMutation.mutate(terminalId)
      if (selectedTerminalId === terminalId) {
        onTerminalSelect('')
      }
    }
  }

  /**
   * Export sessions data as JSON
   */
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(sortedSessions, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cao-sessions-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Export sessions data as CSV
   */
  const handleExportCSV = () => {
    // Flatten data for CSV: one row per terminal
    const rows: string[][] = [
      ['Session Name', 'Terminal ID', 'Agent Profile', 'Provider', 'Status', 'Created At', 'Updated At']
    ]

    sortedSessions.forEach(session => {
      if (session.terminals && session.terminals.length > 0) {
        session.terminals.forEach(terminal => {
          rows.push([
            session.name,
            terminal.id,
            terminal.agent_profile,
            terminal.provider,
            terminal.status,
            terminal.created_at,
            terminal.updated_at
          ])
        })
      } else {
        // Session with no terminals
        rows.push([session.name, '', '', '', '', '', ''])
      }
    })

    const csvContent = rows.map(row =>
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cao-sessions-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (sortedSessions.length === 0) {
    return (
      <div className="session-list">
        <div className="session-list-empty frosted-card">
          <p>No active sessions</p>
          <p className="text-muted">Launch an agent to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h2 className="session-list-title">Sessions</h2>
        <div className="export-buttons">
          <button
            className="btn-icon"
            onClick={handleExportJSON}
            title="Export as JSON"
          >
            <Download size={14} />
            JSON
          </button>
          <button
            className="btn-icon"
            onClick={handleExportCSV}
            title="Export as CSV"
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>
      {sortedSessions.map(session => {
        const isExpanded = expandedSessions.has(session.name)

        return (
          <div key={session.name} className="session-item">
            <div
              className="session-header frosted-card"
              onClick={() => toggleSession(session.name)}
            >
              <div className="session-header-left">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="session-name">{session.name}</span>
                <span className="terminal-count">{session.terminal_count}</span>
              </div>
              <button
                className="btn-icon"
                onClick={(e) => handleDeleteSession(session.name, e)}
                title="Delete session"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {isExpanded && (
              <div className="terminal-list">
                {(session.terminals || []).map(terminal => (
                  <div
                    key={terminal.id}
                    className={`terminal-item glass-panel ${
                      selectedTerminalId === terminal.id ? 'selected' : ''
                    }`}
                    onClick={() => onTerminalSelect(terminal.id)}
                  >
                    <div className="terminal-info">
                      <TerminalIcon size={14} />
                      <div className="terminal-details">
                        <div className="terminal-profile">{terminal.agent_profile}</div>
                        <div className="terminal-meta">
                          <span className="terminal-provider">{terminal.provider}</span>
                          <span className={`status-badge status-${terminal.status.toLowerCase()}`}>
                            {terminal.status}
                          </span>
                          <span className="terminal-duration" title={`Created: ${new Date(terminal.created_at).toLocaleString()}`}>
                            <Clock size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                            {formatDuration(terminal.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={(e) => handleDeleteTerminal(terminal.id, e)}
                      title="Delete terminal"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
