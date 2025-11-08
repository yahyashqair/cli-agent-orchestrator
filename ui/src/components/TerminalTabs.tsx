import { X, Terminal as TerminalIcon } from 'lucide-react'
import type { Session } from '../types'
import './TerminalTabs.css'

interface TerminalTabsProps {
  sessions: Session[]
  selectedTerminalId: string | null
  onTerminalSelect: (id: string) => void
  onTerminalClose?: (id: string) => void
}

export default function TerminalTabs({
  sessions,
  selectedTerminalId,
  onTerminalSelect,
  onTerminalClose
}: TerminalTabsProps) {
  // Get all terminals from all sessions
  const allTerminals = sessions.flatMap(session =>
    session.terminals.map(terminal => ({
      ...terminal,
      sessionName: session.name
    }))
  )

  if (allTerminals.length === 0) {
    return null
  }

  return (
    <div className="terminal-tabs-bar">
      <div className="terminal-tabs-scroll">
        {allTerminals.map(terminal => {
          const isActive = terminal.id === selectedTerminalId
          return (
            <div
              key={terminal.id}
              className={`terminal-tab-item ${isActive ? 'terminal-tab-item-active' : ''}`}
              onClick={() => onTerminalSelect(terminal.id)}
              title={`${terminal.agent_profile} (${terminal.sessionName})`}
            >
              <TerminalIcon size={14} className="terminal-tab-icon" />
              <span className="terminal-tab-label">
                {terminal.agent_profile}
              </span>
              <span className={`terminal-tab-status status-${terminal.status.toLowerCase()}`}>
                {terminal.status}
              </span>
              {onTerminalClose && (
                <button
                  className="terminal-tab-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTerminalClose(terminal.id)
                  }}
                  title="Close terminal view"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
