import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Session } from '../types'
import './Dashboard.css'

interface DashboardProps {
  sessions: Session[]
}

export default function Dashboard({ sessions }: DashboardProps) {
  // Fetch pending messages count across all terminals
  const { data: pendingMessagesCount = 0 } = useQuery({
    queryKey: ['pending-messages-count'],
    queryFn: () => api.getPendingMessagesCount(),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  })

  const stats = useMemo(() => {
    const terminals = sessions.flatMap(s => s.terminals || []).filter(t => t !== null && t !== undefined)

    return {
      totalSessions: sessions.length,
      totalTerminals: terminals.length,
      activeTerminals: terminals.filter(t =>
        t.status === 'PROCESSING' || t.status === 'WAITING_USER_ANSWER'
      ).length,
      idleTerminals: terminals.filter(t => t.status === 'IDLE').length,
      completedTerminals: terminals.filter(t => t.status === 'COMPLETED').length,
      errorTerminals: terminals.filter(t => t.status === 'ERROR').length,
    }
  }, [sessions])

  const statusBreakdown = useMemo(() => {
    const terminals = sessions.flatMap(s => s.terminals || []).filter(t => t !== null && t !== undefined)
    const statusCounts: Record<string, number> = {}

    terminals.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    })

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / terminals.length) * 100,
    }))
  }, [sessions])

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Overview</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalSessions}</div>
          <div className="stat-label">Sessions</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.totalTerminals}</div>
          <div className="stat-label">Total Agents</div>
        </div>

        <div className="stat-card stat-active">
          <div className="stat-value">{stats.activeTerminals}</div>
          <div className="stat-label">Active</div>
        </div>

        <div className="stat-card stat-idle">
          <div className="stat-value">{stats.idleTerminals}</div>
          <div className="stat-label">Idle</div>
        </div>

        <div className="stat-card stat-pending-messages">
          <div className="stat-value">{pendingMessagesCount}</div>
          <div className="stat-label">Pending Messages</div>
        </div>
      </div>

      {statusBreakdown.length > 0 && (
        <div className="status-breakdown">
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
      )}
    </div>
  )
}
