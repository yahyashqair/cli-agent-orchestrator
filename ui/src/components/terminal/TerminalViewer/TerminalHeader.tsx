import {
  Terminal as TerminalIcon,
  RotateCw,
  Eraser,
  Copy,
  Check,
  ExternalLink,
  Maximize2,
  Minimize2,
  Trash2,
  X
} from 'lucide-react'

interface TerminalHeaderProps {
  terminal?: {
    agent_profile: string
    provider: string
    status: string
  }
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  onManualRefresh: () => void
  onClearTerminal: () => void
  onCopyOutput: () => void
  onOpenTerminal: () => void
  onExit: () => void
  onDelete: () => void
  onClose: () => void
  copyStatus: 'idle' | 'copied' | 'error'
  hasRawOutput: boolean
}

export default function TerminalHeader({
  terminal,
  isFullscreen = false,
  onToggleFullscreen,
  onManualRefresh,
  onClearTerminal,
  onCopyOutput,
  onOpenTerminal,
  onExit,
  onDelete,
  onClose,
  copyStatus,
  hasRawOutput,
}: TerminalHeaderProps) {
  return (
    <div className="terminal-viewer-header">
      <div className="terminal-viewer-title">
        <TerminalIcon size={20} />
        <div>
          <h3>{terminal?.agent_profile}</h3>
          <div className="terminal-viewer-meta">
            <span className="terminal-provider">{terminal?.provider}</span>
            {terminal && (
              <span className={`status-badge status-${terminal.status.toLowerCase()}`}>
                {terminal.status}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="terminal-viewer-actions">
        {onToggleFullscreen && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (Ctrl+Shift+F)'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
        <button className="btn btn-sm btn-secondary" onClick={onManualRefresh} title="Refresh output">
          <RotateCw size={14} />
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={onClearTerminal}
          title="Clear terminal display"
        >
          <Eraser size={14} />
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={onCopyOutput}
          title={
            copyStatus === 'copied' ? 'Copied!' :
            copyStatus === 'error' ? 'Copy failed' :
            'Copy terminal output'
          }
          disabled={!hasRawOutput}
        >
          {copyStatus === 'copied' ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={onOpenTerminal}
          title="Open in terminal (attach to tmux session)"
        >
          <ExternalLink size={14} />
        </button>
        <button className="btn btn-sm btn-secondary" onClick={onExit} title="Send exit command">
          Exit
        </button>
        <button className="btn btn-sm btn-danger" onClick={onDelete} title="Delete terminal">
          <Trash2 size={14} />
        </button>
        <button className="btn btn-sm btn-secondary" onClick={onClose} title="Close">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}