import { useRef, useEffect } from 'react'
import { Terminal as TerminalIcon, Mail } from 'lucide-react'
import { CLEARED_MESSAGE, EMPTY_MESSAGE } from '../TerminalUtils/terminalUtils'
import InboxViewer from '../../InboxViewer'

type TabType = 'output' | 'messages'

interface TerminalOutputProps {
  renderedHtml: string
  isCleared: boolean
  isFetchingOutput: boolean
  autoScroll: boolean
  activeTab: TabType
  pendingMessagesCount: number
  onTabChange: (tab: TabType) => void
  onAutoScrollChange: (enabled: boolean) => void
  terminalId: string
}

export default function TerminalOutput({
  renderedHtml,
  isCleared,
  isFetchingOutput,
  autoScroll,
  activeTab,
  pendingMessagesCount,
  onTabChange,
  onAutoScrollChange,
  terminalId,
}: TerminalOutputProps) {
  const outputRef = useRef<HTMLPreElement>(null)

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (autoScroll && !isCleared && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [renderedHtml, autoScroll, isCleared])

  const displayHtml = isCleared
    ? CLEARED_MESSAGE
    : renderedHtml || (isFetchingOutput ? 'Loading…' : EMPTY_MESSAGE)

  return (
    <>
      <div className="terminal-tabs">
        <button
          className={`terminal-tab ${activeTab === 'output' ? 'terminal-tab-active' : ''}`}
          onClick={() => onTabChange('output')}
        >
          <TerminalIcon size={14} />
          Output
        </button>
        <button
          className={`terminal-tab ${activeTab === 'messages' ? 'terminal-tab-active' : ''}`}
          onClick={() => onTabChange('messages')}
        >
          <Mail size={14} />
          Messages
          {pendingMessagesCount > 0 && (
            <span className="tab-badge">{pendingMessagesCount}</span>
          )}
        </button>
      </div>

      {activeTab === 'output' ? (
        <div className="terminal-output-container">
          <div className="terminal-output-controls">
            <label className="auto-scroll-toggle">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => onAutoScrollChange(e.target.checked)}
              />
              Auto-scroll
            </label>
          </div>
          <pre
            ref={outputRef}
            className="terminal-output"
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        </div>
      ) : (
        <div className="terminal-messages-container">
          <InboxViewer terminalId={terminalId} />
        </div>
      )}
    </>
  )
}