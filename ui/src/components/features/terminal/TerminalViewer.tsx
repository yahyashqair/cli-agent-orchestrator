import { useState, useRef, useEffect, useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Send, RotateCw, Terminal as TerminalIcon, Trash2, Eraser, Copy, Check, Mail, ExternalLink, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Panel } from '@/components/layout/panel'
import { api } from '@/api/client'
import Convert from 'ansi-to-html'
import InboxViewer from '@/components/features/terminal/InboxViewer'

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
  focusTrigger?: number
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

type TerminalUpdateMessage = {
  type: 'terminal_update'
  terminal_id: string
  event: 'init' | 'changed'
}

type TabType = 'output' | 'messages';

export default function TerminalViewer({
  terminalId,
  onClose,
  focusTrigger = 0,
  isFullscreen = false,
  onToggleFullscreen
}: TerminalViewerProps) {
  const [input, setInput] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [isCleared, setIsCleared] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const [renderedHtml, setRenderedHtml] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('output')
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
    setActiveTab('output') // Reset to output tab when terminal changes
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
  })

  // Fetch pending messages count for badge
  const { data: pendingMessagesCount = 0 } = useQuery({
    queryKey: ['pending-messages-count', terminalId],
    queryFn: () => api.getPendingMessagesCount({ terminalId }),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
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

  const openTerminalMutation = useMutation({
    mutationFn: () => api.openTerminal(terminalId),
    onSuccess: (data) => {
      if (data.success) {
        console.log(`Opened terminal: ${data.terminal_emulator} (session: ${data.session_name})`)
      } else {
        alert(`Could not open terminal automatically.\n\nPlease run this command in your terminal:\n${data.attach_command}`)
      }
    },
    onError: (error) => {
      console.error('Failed to open terminal:', error)
      alert('Failed to open terminal. Please check the console for details.')
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
  }, [terminalId, focusTrigger])

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

  const handleOpenTerminal = () => {
    openTerminalMutation.mutate()
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PROCESSING':
      case 'WAITING_USER_ANSWER':
        return 'success' as const
      case 'COMPLETED':
        return 'default' as const
      case 'ERROR':
        return 'destructive' as const
      case 'IDLE':
        return 'warning' as const
      default:
        return 'secondary' as const
    }
  }

  const displayHtml = isCleared ? CLEARED_MESSAGE : renderedHtml || (isFetchingOutput ? 'Loading…' : EMPTY_MESSAGE)

  return (
    <Panel className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''} h-full`} onClick={handleViewerClick}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <TerminalIcon className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">{terminal?.agent_profile}</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">{terminal?.provider}</span>
              {terminal && (
                <Badge variant={getStatusVariant(terminal.status)}>
                  {terminal.status}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (Ctrl+Shift+F)'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleManualRefresh} title="Refresh output">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearTerminal}
            title="Clear terminal display"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyOutput}
            title={copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Copy failed' : 'Copy terminal output'}
            disabled={!rawOutputRef.current}
          >
            {copyStatus === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenTerminal}
            title="Open in terminal (attach to tmux session)"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExit} title="Send exit command">
            Exit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} title="Delete terminal">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-6">
          <TabsTrigger value="output" className="flex items-center space-x-2">
            <TerminalIcon className="h-4 w-4" />
            <span>Output</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Messages</span>
            {pendingMessagesCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingMessagesCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="output" className="flex-1 mt-0">
          <CardContent className="flex flex-col h-full p-0">
            <div className="flex items-center space-x-2 px-6 py-2 border-b">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded"
                />
                <span>Auto-scroll</span>
              </label>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <pre
                  ref={outputRef}
                  className="font-mono text-sm whitespace-pre-wrap bg-background border rounded p-4 min-h-full"
                  dangerouslySetInnerHTML={{ __html: displayHtml }}
                />
              </div>
            </ScrollArea>
          </CardContent>
        </TabsContent>

        <TabsContent value="messages" className="flex-1 mt-0">
          <CardContent className="p-0 h-full">
            <InboxViewer terminalId={terminalId} />
          </CardContent>
        </TabsContent>
      </Tabs>

      {/* Input Form */}
      <CardHeader className="pb-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send input to terminal..."
            className="flex-1 h-10 px-3 py-2 text-sm border border-input bg-background rounded-md ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={sendInputMutation.isPending}
          />
          <Button type="submit" disabled={!input.trim() || sendInputMutation.isPending}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </form>
      </CardHeader>
    </Panel>
  )
}
