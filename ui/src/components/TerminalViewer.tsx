import { useState, useRef, useEffect, useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Send, RotateCw, Terminal as TerminalIcon, Trash2, Eraser, Copy, Check } from 'lucide-react'
import { api } from '../api/client'
import Convert from 'ansi-to-html'
import './TerminalViewer.css'

const CLEARED_MESSAGE = '<span style="opacity: 0.5;">Terminal output cleared (data still exists on server)</span>'
const EMPTY_MESSAGE = 'No output yet...'

const createAnsiConverter = () =>
  new Convert({
    fg: '#d4d4d4',
    bg: '#1e1e1e',
    newline: true,
    escapeXML: true,
    stream: false,
  })

const sanitizeControlSequences = (value: string) =>
  value
    // Strip OSC sequences (Operating System Command)
    .replace(/\u001B\][^\u0007]*\u0007/g, '')
    // Strip DCS (Device Control String) sequences: ESC P ... ESC \
    .replace(/\u001BP.*?\u001B\\?/gs, '')
    // Strip SOS/PM/APC sequences terminated by BEL
    .replace(/\u001B[\^\_].*?\u0007/g, '')
    // Remove CSI sequences that are not SGR (final byte not m)
    .replace(/\u001B\[[0-9;?]*[A-Za-z]/g, (seq) => (seq.endsWith('m') ? seq : ''))
    // Remove stray carriage returns without newline (cursor reposition artifacts)
    .replace(/\r(?!\n)/g, '')

interface TerminalViewerProps {
  terminalId: string
  onClose: () => void
}

type TerminalUpdateMessage = {
  type: 'terminal_update'
  terminal_id: string
  event: 'init' | 'changed'
}

export default function TerminalViewer({ terminalId, onClose }: TerminalViewerProps) {
  const [input, setInput] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [isCleared, setIsCleared] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [renderedHtml, setRenderedHtml] = useState('')
  const outputRef = useRef<HTMLPreElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const copyResetTimeoutRef = useRef<number | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const rawOutputRef = useRef<string>('')
  const pendingRefreshRef = useRef(false)
  const isFetchingRef = useRef(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current)
        copyResetTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    setCopyStatus('idle')
    setIsCleared(false)
    rawOutputRef.current = ''
    setRenderedHtml('')
  }, [terminalId])

  const stripAnsi = useCallback((value: string) => value.replace(/\u001B\[[0-9;]*[A-Za-z]/g, ''), [])

  const renderFullOutput = useCallback((raw: string) => {
    const cleaned = sanitizeControlSequences(raw)

    if (!cleaned) {
      setRenderedHtml('')
      return
    }

    try {
      const converter = createAnsiConverter()
      const html = converter.toHtml(cleaned)
      setRenderedHtml(html)
    } catch (error) {
      console.error('Error converting ANSI output to HTML:', error)
      setRenderedHtml(cleaned)
    }
  }, [])

  const { data: terminal } = useQuery({
    queryKey: ['terminal', terminalId],
    queryFn: () => api.getTerminal(terminalId),
    refetchInterval: 2000,
  })

  const {
    data: outputData,
    refetch: refetchOutput,
    isFetching: isFetchingOutput,
  } = useQuery({
    queryKey: ['terminal-output', terminalId],
    queryFn: () => api.getOutput(terminalId, 'full'),
    enabled: Boolean(terminalId),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })

  const triggerRefresh = useCallback(() => {
    if (isFetchingRef.current) {
      pendingRefreshRef.current = true
      return
    }
    pendingRefreshRef.current = false
    void refetchOutput()
  }, [refetchOutput])

  useEffect(() => {
    isFetchingRef.current = isFetchingOutput
    if (!isFetchingOutput && pendingRefreshRef.current) {
      pendingRefreshRef.current = false
      void refetchOutput()
    }
  }, [isFetchingOutput, refetchOutput])

  useEffect(() => {
    const output = outputData?.output ?? ''
    rawOutputRef.current = output

    if (!output) {
      setRenderedHtml('')
      return
    }

    setIsCleared(false)
    renderFullOutput(output)
  }, [outputData, renderFullOutput])

  const sendInputMutation = useMutation({
    mutationFn: (message: string) => api.sendInput(terminalId, message),
    onSuccess: () => {
      setInput('')
      triggerRefresh()
    },
  })

  const exitTerminalMutation = useMutation({
    mutationFn: () => api.exitTerminal(terminalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminal', terminalId] })
    },
  })

  const deleteTerminalMutation = useMutation({
    mutationFn: () => api.deleteTerminal(terminalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onClose()
    },
  })

  useEffect(() => {
    if (!terminalId) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const websocket = new WebSocket(`${protocol}//${window.location.host}/ws`)
    wsRef.current = websocket

    websocket.onopen = () => {
      websocket.send(
        JSON.stringify({
          action: 'subscribe_terminal',
          terminal_id: terminalId,
        }),
      )
      triggerRefresh()
    }

    websocket.onmessage = (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as TerminalUpdateMessage
        if (message.type === 'terminal_update' && message.terminal_id === terminalId) {
          triggerRefresh()
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    websocket.onerror = (event) => {
      console.error('WebSocket error for terminal notifications:', event)
    }

    websocket.onclose = () => {
      wsRef.current = null
    }

    return () => {
      try {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(
            JSON.stringify({
              action: 'unsubscribe_terminal',
              terminal_id: terminalId,
            }),
          )
        }
      } catch (error) {
        console.error('Failed to send WebSocket unsubscribe:', error)
      } finally {
        websocket.close()
      }
    }
  }, [terminalId, triggerRefresh])

  useEffect(() => {
    if (autoScroll && !isCleared && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [renderedHtml, autoScroll, isCleared])

  useEffect(() => {
    inputRef.current?.focus()
  }, [terminalId])

  useEffect(() => {
    if (!sendInputMutation.isPending) {
      inputRef.current?.focus()
    }
  }, [sendInputMutation.isPending])

  const handleManualRefresh = async () => {
    try {
      await refetchOutput()
    } catch (error) {
      console.error('Failed to refresh terminal output:', error)
    }
  }

  const handleClearTerminal = () => {
    setIsCleared(true)
  }

  const handleCopyOutput = async () => {
    if (!rawOutputRef.current) return

    const rawOutput = stripAnsi(rawOutputRef.current)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(rawOutput)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = rawOutput
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopyStatus('copied')
    } catch (error) {
      console.error('Failed to copy terminal output:', error)
      setCopyStatus('error')
    } finally {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current)
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setCopyStatus('idle')
      }, 2000)
    }
  }

  const handleViewerClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (outputRef.current && outputRef.current.contains(event.target as Node)) {
      return
    }
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
    if (input.trim()) {
      sendInputMutation.mutate(input)
    }
  }

  const handleExit = () => {
    if (confirm('Send exit command to this terminal?')) {
      exitTerminalMutation.mutate()
    }
  }

  const handleDelete = () => {
    if (confirm('Delete this terminal?')) {
      deleteTerminalMutation.mutate()
    }
  }

  const displayHtml = isCleared ? CLEARED_MESSAGE : renderedHtml || (isFetchingOutput ? 'Loading…' : EMPTY_MESSAGE)

  return (
    <div className="terminal-viewer" onClick={handleViewerClick}>
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
          <button className="btn btn-sm btn-secondary" onClick={handleManualRefresh} title="Refresh output">
            <RotateCw size={14} />
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleClearTerminal}
            title="Clear terminal display"
          >
            <Eraser size={14} />
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleCopyOutput}
            title={copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Copy failed' : 'Copy terminal output'}
            disabled={!rawOutputRef.current}
          >
            {copyStatus === 'copied' ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={handleExit} title="Send exit command">
            Exit
          </button>
          <button className="btn btn-sm btn-danger" onClick={handleDelete} title="Delete terminal">
            <Trash2 size={14} />
          </button>
          <button className="btn btn-sm btn-secondary" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="terminal-output-container">
        <div className="terminal-output-controls">
          <label className="auto-scroll-toggle">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>
        <pre ref={outputRef} className="terminal-output" dangerouslySetInnerHTML={{ __html: displayHtml }} />
      </div>

      <form onSubmit={handleSubmit} className="terminal-input-form">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send input to terminal..."
          className="terminal-input"
          disabled={sendInputMutation.isPending}
        />
        <button type="submit" className="btn btn-primary" disabled={!input.trim() || sendInputMutation.isPending}>
          <Send size={16} />
          Send
        </button>
      </form>
    </div>
  )
}
