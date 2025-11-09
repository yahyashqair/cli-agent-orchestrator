import { useState, useEffect, useMemo } from 'react'
import type { Session } from '../../../types'

export const useSessionData = (sessions: Session[]) => {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [, setUpdateTick] = useState(0)

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

  const toggleSession = (sessionName: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionName)) {
      newExpanded.delete(sessionName)
    } else {
      newExpanded.add(sessionName)
    }
    setExpandedSessions(newExpanded)
  }

  const isSessionExpanded = (sessionName: string) => {
    return expandedSessions.has(sessionName)
  }

  return {
    sortedSessions,
    toggleSession,
    isSessionExpanded,
  }
}