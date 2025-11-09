import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Terminal,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import type { Session } from '@/types'

interface AgentStatusPanelProps {
  sessions: Session[]
}

const ensureSessionsArray = (sessions: Session[] | undefined | null): Session[] =>
  Array.isArray(sessions) ? sessions : []

function useStatusBreakdown(sessions: Session[]) {
  const safeSessions = ensureSessionsArray(sessions)

  return React.useMemo(() => {
    const terminals = safeSessions
      .flatMap(s => s.terminals || [])
      .filter(t => t !== null && t !== undefined)
    if (terminals.length === 0) return []

    const statusCounts: Record<string, number> = {}

    terminals.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    })

    return Object.entries(statusCounts)
      .sort(([, aCount], [, bCount]) => bCount - aCount)
      .map(([status, count]) => ({
        status,
        count,
        percentage: (count / terminals.length) * 100,
      }))
  }, [safeSessions])
}

export function AgentStatusPanel({ sessions }: AgentStatusPanelProps) {
  const statusBreakdown = useStatusBreakdown(sessions)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSING':
      case 'WAITING_USER_ANSWER':
        return <Play className="h-4 w-4 text-green-500" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'IDLE':
        return <Pause className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
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

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (statusBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Terminal className="h-5 w-5" />
            <span>Agent Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No agents are running yet.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Terminal className="h-5 w-5" />
          <span>Agent Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusBreakdown.map(({ status, count, percentage }) => (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status)}
                  <span className="text-sm font-medium">
                    {formatStatus(status)}
                  </span>
                  <Badge variant={getStatusVariant(status)}>
                    {count}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    status === 'PROCESSING' || status === 'WAITING_USER_ANSWER'
                      ? 'bg-green-500'
                      : status === 'COMPLETED'
                      ? 'bg-blue-500'
                      : status === 'ERROR'
                      ? 'bg-red-500'
                      : status === 'IDLE'
                      ? 'bg-yellow-500'
                      : 'bg-gray-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default AgentStatusPanel
