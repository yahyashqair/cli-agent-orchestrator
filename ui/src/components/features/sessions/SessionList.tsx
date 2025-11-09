import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Trash2, Terminal as TerminalIcon, Clock, Download, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/api/client'
import type { Session } from '@/types'

/**
 * Calculate duration from a timestamp to now
 * @param timestamp ISO timestamp string
 * @returns Formatted duration string
 */
function formatDuration(timestamp: string): string {
  const now = Date.now()
  const created = new Date(timestamp).getTime()
  const diffMs = now - created

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

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
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [, setUpdateTick] = useState(0)
  const queryClient = useQueryClient()

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (b.terminal_count ?? 0) - (a.terminal_count ?? 0)),
    [sessions]
  )

  // Update durations every second
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTick(tick => tick + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const deleteSessionMutation = useMutation({
    mutationFn: api.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const archiveSessionMutation = useMutation({
    mutationFn: (sessionName: string) => api.archiveSession(sessionName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['archived-sessions'] })
    },
    onError: (error: Error) => {
      alert(`Failed to archive session: ${error.message}`)
    },
  })

  const deleteTerminalMutation = useMutation({
    mutationFn: api.deleteTerminal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const toggleSession = (sessionName: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionName)) {
      newExpanded.delete(sessionName)
    } else {
      newExpanded.add(sessionName)
    }
    setExpandedSessions(newExpanded)
  }

  const handleArchiveSession = (sessionName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Archive session "${sessionName}"? This will snapshot all terminals and remove the session from the active list.`)) {
      archiveSessionMutation.mutate(sessionName)
    }
  }

  const handleDeleteSession = (sessionName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete session "${sessionName}" and all its terminals?`)) {
      deleteSessionMutation.mutate(sessionName)
    }
  }

  const handleDeleteTerminal = (terminalId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this terminal?')) {
      deleteTerminalMutation.mutate(terminalId)
      if (selectedTerminalId === terminalId) {
        onTerminalSelect('')
      }
    }
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

  /**
   * Export sessions data as JSON
   */
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(sortedSessions, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cao-sessions-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Export sessions data as CSV
   */
  const handleExportCSV = () => {
    // Flatten data for CSV: one row per terminal
    const rows: string[][] = [
      ['Session Name', 'Terminal ID', 'Agent Profile', 'Provider', 'Status', 'Created At', 'Updated At']
    ]

    sortedSessions.forEach(session => {
      if (session.terminals && session.terminals.length > 0) {
        session.terminals.forEach(terminal => {
          rows.push([
            session.name,
            terminal.id,
            terminal.agent_profile,
            terminal.provider,
            terminal.status,
            terminal.created_at,
            terminal.updated_at
          ])
        })
      } else {
        // Session with no terminals
        rows.push([session.name, '', '', '', '', '', ''])
      }
    })

    const csvContent = rows.map(row =>
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cao-sessions-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (sortedSessions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <TerminalIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No active sessions</p>
          <p className="text-sm text-muted-foreground">Launch an agent to get started</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2">
            <TerminalIcon className="h-5 w-5" />
            <span>Sessions</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              title="Export as JSON"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              title="Export as CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
      </Card>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {sortedSessions.map((session, sessionIndex) => {
            const sessionKey = session?.name ? `${session.name}` : `session-${sessionIndex}`
            const isExpanded = expandedSessions.has(session.name)

            return (
              <Card key={sessionKey}>
                <CardHeader
                  className="flex flex-row items-center justify-between space-y-0 pb-3 cursor-pointer"
                  onClick={() => toggleSession(session.name)}
                >
                  <div className="flex items-center space-x-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div>
                      <span className="font-medium">{session.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {session.terminal_count} terminals
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleArchiveSession(session.name, e)}
                      title="Archive session"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteSession(session.name, e)}
                      title="Delete session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {(session.terminals || []).map((terminal, terminalIndex) => {
                        const terminalKey = terminal?.id || `${sessionKey}-terminal-${terminalIndex}`

                        return (
                          <div
                            key={terminalKey}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                              selectedTerminalId === terminal.id ? 'bg-accent border-primary' : ''
                            }`}
                            onClick={() => onTerminalSelect(terminal.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <TerminalIcon className="h-4 w-4" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-sm">{terminal.agent_profile}</span>
                                    <span className="text-xs text-muted-foreground" title={`Terminal ID: ${terminal.id}`}>
                                      {terminal.id}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-muted-foreground">{terminal.provider}</span>
                                    <Badge variant={getStatusVariant(terminal.status)} className="text-xs">
                                      {terminal.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center" title={`Created: ${new Date(terminal.created_at).toLocaleString()}`}>
                                      <Clock className="h-3 w-3 mr-1" />
                                      {formatDuration(terminal.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteTerminal(terminal.id, e)}
                                title="Delete terminal"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
