import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Trash2, Terminal as TerminalIcon } from 'lucide-react'
import { api } from '../api/client'
import type { Session } from '../types'
import './SessionList.css'

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
  const queryClient = useQueryClient()

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

  if (sessions.length === 0) {
    return (
      <div className="session-list-empty">
        <p>No active sessions</p>
        <p className="text-muted">Launch an agent to get started</p>
      </div>
    )
  }

  return (
    <div className="session-list">
      <h2 className="session-list-title">Sessions</h2>
      {sessions.map(session => {
        const isExpanded = expandedSessions.has(session.name)

        return (
          <div key={session.name} className="session-item">
            <div
              className="session-header"
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
                    className={`terminal-item ${
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
