import type { Session } from '../../../types'
import { useSessionData } from '../SessionHooks/useSessionData'
import { useSessionActions } from '../SessionHooks/useSessionActions'
import ExportButtons from './ExportButtons'
import SessionItem from './SessionItem'
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
  const { sortedSessions, toggleSession, isSessionExpanded } = useSessionData(sessions)

  const {
    handleArchiveSession,
    handleDeleteSession,
    handleDeleteTerminal,
  } = useSessionActions({
    onTerminalSelect,
    selectedTerminalId,
  })

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
        <ExportButtons sessions={sortedSessions} />
      </div>

      {sortedSessions.map((session, sessionIndex) => {
        const sessionKey = session?.name ? `${session.name}` : `session-${sessionIndex}`
        const isExpanded = isSessionExpanded(session.name)

        return (
          <SessionItem
            key={sessionKey}
            session={session}
            selectedTerminalId={selectedTerminalId}
            isExpanded={isExpanded}
            onToggleSession={() => toggleSession(session.name)}
            onTerminalSelect={onTerminalSelect}
            onArchiveSession={(e) => handleArchiveSession(session.name, e)}
            onDeleteSession={(e) => handleDeleteSession(session.name, e)}
            onDeleteTerminal={handleDeleteTerminal}
          />
        )
      })}
    </div>
  )
}