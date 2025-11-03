import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Send, RotateCw, Terminal as TerminalIcon, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import Convert from 'ansi-to-html'
import './TerminalViewer.css'

interface TerminalViewerProps {
  terminalId: string
  onClose: () => void
}

export default function TerminalViewer({ terminalId, onClose }: TerminalViewerProps) {
  const [input, setInput] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const outputRef = useRef<HTMLPreElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Create ANSI to HTML converter
  const convert = useMemo(() => new Convert({
    fg: '#d4d4d4',
    bg: '#1e1e1e',
    newline: true,
    escapeXML: true,
    stream: false,
  }), [])

  const { data: terminal } = useQuery({
    queryKey: ['terminal', terminalId],
    queryFn: () => api.getTerminal(terminalId),
    refetchInterval: 2000,
  })

  const { data: outputData, refetch: refetchOutput } = useQuery({
    queryKey: ['terminal-output', terminalId],
    queryFn: () => api.getOutput(terminalId, 'full'),
    refetchInterval: 1000, // Refresh every second for real-time updates
  })

  const sendInputMutation = useMutation({
    mutationFn: (message: string) => api.sendInput(terminalId, message),
    onSuccess: () => {
      setInput('')
      setTimeout(() => refetchOutput(), 500)
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

  // Convert ANSI output to HTML
  const htmlOutput = useMemo(() => {
    if (!outputData?.output) return 'No output yet...'
    try {
      return convert.toHtml(outputData.output)
    } catch (error) {
      console.error('Error converting ANSI to HTML:', error)
      return outputData.output
    }
  }, [outputData?.output, convert])

  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [htmlOutput, autoScroll])

  useEffect(() => {
    inputRef.current?.focus()
  }, [terminalId])

  useEffect(() => {
    if (!sendInputMutation.isPending) {
      inputRef.current?.focus()
    }
  }, [sendInputMutation.isPending])

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

  return (
    <div className="terminal-viewer">
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
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => refetchOutput()}
            title="Refresh output"
          >
            <RotateCw size={14} />
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleExit}
            title="Send exit command"
          >
            Exit
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={handleDelete}
            title="Delete terminal"
          >
            <Trash2 size={14} />
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={onClose}
            title="Close"
          >
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
        <pre
          ref={outputRef}
          className="terminal-output"
          dangerouslySetInnerHTML={{ __html: htmlOutput }}
        />
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
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!input.trim() || sendInputMutation.isPending}
        >
          <Send size={16} />
          Send
        </button>
      </form>
    </div>
  )
}
