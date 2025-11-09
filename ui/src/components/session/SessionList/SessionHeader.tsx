import { ChevronDown, ChevronRight, Archive, Trash2 } from 'lucide-react'

interface SessionHeaderProps {
  sessionName: string
  terminalCount: number
  isExpanded: boolean
  onToggle: () => void
  onArchive: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}

export default function SessionHeader({
  sessionName,
  terminalCount,
  isExpanded,
  onToggle,
  onArchive,
  onDelete,
}: SessionHeaderProps) {
  return (
    <div
      className="session-header frosted-card"
      onClick={onToggle}
    >
      <div className="session-header-left">
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="session-name">{sessionName}</span>
        <span className="terminal-count">{terminalCount}</span>
      </div>
      <div className="session-header-actions">
        <button
          className="btn-icon"
          onClick={onArchive}
          title="Archive session"
        >
          <Archive size={14} />
        </button>
        <button
          className="btn-icon"
          onClick={onDelete}
          title="Delete session"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}