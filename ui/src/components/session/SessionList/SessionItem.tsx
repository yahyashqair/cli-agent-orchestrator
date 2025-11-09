import type { Session, Terminal } from '../../../types'
import SessionHeader from './SessionHeader'
import TerminalItem from './TerminalItem'

interface SessionItemProps {
  session: Session
  selectedTerminalId: string | null
  isExpanded: boolean
  onToggleSession: () => void
  onTerminalSelect: (id: string) => void
  onArchiveSession: (e: React.MouseEvent) => void
  onDeleteSession: (e: React.MouseEvent) => void
  onDeleteTerminal: (terminalId: string, e: React.MouseEvent) => void
}

export default function SessionItem({
  session,
  selectedTerminalId,
  isExpanded,
  onToggleSession,
  onTerminalSelect,
  onArchiveSession,
  onDeleteSession,
  onDeleteTerminal,
}: SessionItemProps) {
  const handleTerminalDelete = (terminalId: string) => (e: React.MouseEvent) => {
    onDeleteTerminal(terminalId, e)
  }

  return (
    <div className="session-item">
      <SessionHeader
        sessionName={session.name}
        terminalCount={session.terminal_count}
        isExpanded={isExpanded}
        onToggle={onToggleSession}
        onArchive={onArchiveSession}
        onDelete={onDeleteSession}
      />

      {isExpanded && (
        <div className="terminal-list">
          {(session.terminals || []).map((terminal: Terminal, terminalIndex: number) => {
            const terminalKey = terminal?.id || `${session.name}-terminal-${terminalIndex}`

            return (
              <TerminalItem
                key={terminalKey}
                terminal={terminal}
                isSelected={selectedTerminalId === terminal.id}
                onClick={() => onTerminalSelect(terminal.id)}
                onDelete={handleTerminalDelete(terminal.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}