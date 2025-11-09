import type { Session } from '../../../types'

/**
 * Export sessions data as JSON
 */
export const exportSessionsAsJSON = (sessions: Session[]): void => {
  const dataStr = JSON.stringify(sessions, null, 2)
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
export const exportSessionsAsCSV = (sessions: Session[]): void => {
  // Flatten data for CSV: one row per terminal
  const rows: string[][] = [
    ['Session Name', 'Terminal ID', 'Agent Profile', 'Provider', 'Status', 'Created At', 'Updated At']
  ]

  sessions.forEach(session => {
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