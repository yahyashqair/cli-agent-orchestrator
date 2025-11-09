import { useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { stripAnsi } from '../TerminalUtils/ansiConverter'
import { useCopyToClipboard } from '../../shared/hooks/useCopyToClipboard'
import { useTerminalData } from '../TerminalHooks/useTerminalData'
import { useTerminalWebSocket } from '../TerminalHooks/useTerminalWebSocket'
import { useTerminalActions } from '../TerminalHooks/useTerminalActions'
import TerminalHeader from './TerminalHeader'
import TerminalOutput from './TerminalOutput'
import TerminalInput from './TerminalInput'
import './TerminalViewer.css'

type TabType = 'output' | 'messages'

interface TerminalViewerProps {
  terminalId: string
  onClose: () => void
  focusTrigger?: number
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export default function TerminalViewer({
  terminalId,
  onClose,
  focusTrigger = 0,
  isFullscreen = false,
  onToggleFullscreen
}: TerminalViewerProps) {
  const [input, setInput] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('output')
  const inputRef = useRef<HTMLInputElement>(null)

  // Use custom hooks
  const {
    terminal,
    isFetchingOutput,
    pendingMessagesCount,
    renderedHtml,
    isCleared,
    triggerRefresh,
    getRawOutput,
    clearDisplay,
  } = useTerminalData(terminalId)

  const { copyStatus, copyToClipboard } = useCopyToClipboard()

  const { setFetchingState } = useTerminalWebSocket(
    terminalId,
    triggerRefresh
  )

  const {
    sendInput,
    exitTerminal,
    deleteTerminal,
    openTerminal,
    isSendingInput,
    isExitingTerminal,
    isDeletingTerminal,
    isOpeningTerminal,
  } = useTerminalActions({
    terminalId,
    onSuccess: triggerRefresh,
    onClose,
  })

  // Update fetching state for WebSocket
  useEffect(() => {
    setFetchingState(isFetchingOutput)
  }, [isFetchingOutput, setFetchingState])

  // Reset state when terminal changes
  useEffect(() => {
    setActiveTab('output')
  }, [terminalId])

  // Focus input when focus trigger changes
  useEffect(() => {
    inputRef.current?.focus()
  }, [terminalId, focusTrigger])

  const handleManualRefresh = async () => {
    try {
      await triggerRefresh()
    } catch (error) {
      console.error('Failed to refresh terminal output:', error)
    }
  }

  const handleCopyOutput = async () => {
    const rawOutput = stripAnsi(getRawOutput())
    await copyToClipboard(rawOutput)
  }

  const handleViewerClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    // Don't focus input if clicking on the output area or form elements
    if (
      event.target instanceof HTMLButtonElement ||
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendInput(input)
    setInput('')
  }

  const isPending = isSendingInput || isExitingTerminal || isDeletingTerminal || isOpeningTerminal

  return (
    <div className="terminal-viewer" onClick={handleViewerClick}>
      <TerminalHeader
        terminal={terminal}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        onManualRefresh={handleManualRefresh}
        onClearTerminal={clearDisplay}
        onCopyOutput={handleCopyOutput}
        onOpenTerminal={openTerminal}
        onExit={exitTerminal}
        onDelete={deleteTerminal}
        onClose={onClose}
        copyStatus={copyStatus}
        hasRawOutput={Boolean(getRawOutput())}
      />

      <TerminalOutput
        renderedHtml={renderedHtml}
        isCleared={isCleared}
        isFetchingOutput={isFetchingOutput}
        autoScroll={autoScroll}
        activeTab={activeTab}
        pendingMessagesCount={pendingMessagesCount}
        onTabChange={setActiveTab}
        onAutoScrollChange={setAutoScroll}
        terminalId={terminalId}
      />

      <TerminalInput
        ref={inputRef}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isPending={isPending}
      />
    </div>
  )
}