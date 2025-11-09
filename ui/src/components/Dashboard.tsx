import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Session } from '../types'
import './Dashboard.css'

interface DashboardProps {
  sessions: Session[]
}

const ensureSessionsArray = (sessions: Session[] | undefined | null): Session[] =>
  Array.isArray(sessions) ? sessions : []

export default function Dashboard({ sessions }: DashboardProps) {
  const safeSessions = ensureSessionsArray(sessions)

  // Fetch pending messages count across all terminals (exclude archived)
  const { data: pendingMessagesCount = 0 } = useQuery({
    queryKey: ['pending-messages-count'],
    queryFn: () => api.getPendingMessagesCount({ includeArchived: false }), // exclude archived sessions
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  })

  // Fetch flows for statistics
  const { data: flows = [] } = useQuery({
    queryKey: ['flows'],
    queryFn: api.listFlows,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  })

  const stats = useMemo(() => {
    const terminals = safeSessions.flatMap(s => s.terminals || []).filter(t => t !== null && t !== undefined)
    const enabledFlows = flows.filter(flow => flow.enabled).length

    return {
      totalSessions: safeSessions.length,
      totalTerminals: terminals.length,
      activeTerminals: terminals.filter(t =>
        t.status === 'PROCESSING' || t.status === 'WAITING_USER_ANSWER'
      ).length,
      idleTerminals: terminals.filter(t => t.status === 'IDLE').length,
      completedTerminals: terminals.filter(t => t.status === 'COMPLETED').length,
      errorTerminals: terminals.filter(t => t.status === 'ERROR').length,
      totalFlows: flows.length,
      enabledFlows,
    }
  }, [safeSessions, flows])

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Overview</h2>

      <div className="stats-grid">
        <div className="stat-card frosted-card">
          <div className="stat-value">{stats.totalSessions}</div>
          <div className="stat-label">Sessions</div>
        </div>

        <div className="stat-card frosted-card">
          <div className="stat-value">{stats.totalTerminals}</div>
          <div className="stat-label">Total Agents</div>
        </div>

        <div className="stat-card stat-active frosted-card">
          <div className="stat-value">{stats.activeTerminals}</div>
          <div className="stat-label">Active</div>
        </div>

        <div className="stat-card stat-idle frosted-card">
          <div className="stat-value">{stats.idleTerminals}</div>
          <div className="stat-label">Idle</div>
        </div>

        <div className="stat-card stat-flows frosted-card">
          <div className="stat-value">{stats.totalFlows}</div>
          <div className="stat-label">Total Flows</div>
        </div>

        <div className="stat-card stat-enabled-flows frosted-card">
          <div className="stat-value">{stats.enabledFlows}</div>
          <div className="stat-label">Enabled Flows</div>
        </div>

        <div className="stat-card stat-pending-messages frosted-card">
          <div className="stat-value">{pendingMessagesCount}</div>
          <div className="stat-label">Pending Messages</div>
        </div>
      </div>

    </div>
  )
}

function useStatusBreakdown(sessions: Session[]) {
  const safeSessions = ensureSessionsArray(sessions)

  return useMemo(() => {
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

export function AgentStatusPanel({ sessions }: DashboardProps) {
  const statusBreakdown = useStatusBreakdown(sessions)

  if (statusBreakdown.length === 0) {
    return (
      <section className="agent-status-panel">
        <div className="status-breakdown frosted-card">
          <h3>Agent Status</h3>
          <p className="status-empty">No agents are running yet.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="agent-status-panel">
      <div className="status-breakdown frosted-card">
        <h3>Agent Status</h3>
        <div className="status-list">
          {statusBreakdown.map(({ status, count, percentage }) => (
            <div key={status} className="status-item">
              <div className="status-info">
                <span className={`status-badge status-${status.toLowerCase()}`}>
                  {status}
                </span>
                <span className="status-count">{count}</span>
              </div>
              <div className="status-bar">
                <div
                  className={`status-bar-fill status-${status.toLowerCase()}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
