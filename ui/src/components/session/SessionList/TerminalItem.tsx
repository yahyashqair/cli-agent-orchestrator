import { Terminal as TerminalIcon, Clock, Trash2 } from 'lucide-react'
import type { Terminal } from '../../../types'
import { formatDuration, formatTerminalId } from '../SessionUtils/formatters'

interface TerminalItemProps {
  terminal: Terminal
  isSelected: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}

export default function TerminalItem({
  terminal,
  isSelected,
  onClick,
  onDelete,
}: TerminalItemProps) {
  return (
    <div
      className={`terminal-item glass-panel ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="terminal-info">
        <TerminalIcon size={14} />
        <div className="terminal-details">
          <div className="terminal-profile-row">
            <div className="terminal-profile">{terminal.agent_profile}</div>
            <span className="terminal-id" title={`Terminal ID: ${terminal.id}`}>
              {formatTerminalId(terminal.id)}
            </span>
          </div>
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
        onClick={onDelete}
        title="Delete terminal"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}