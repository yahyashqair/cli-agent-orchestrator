/**
 * Calculate duration from a timestamp to now
 * @param timestamp ISO timestamp string
 * @returns Formatted duration string
 */
export function formatDuration(timestamp: string): string {
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

/**
 * Format a timestamp to a localized string
 * @param timestamp ISO timestamp string
 * @returns Localized timestamp string
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}

/**
 * Format terminal ID for display (shorten if too long)
 * @param terminalId Terminal ID string
 * @param maxLength Maximum length to display
 * @returns Formatted terminal ID
 */
export function formatTerminalId(terminalId: string, maxLength: number = 12): string {
  if (terminalId.length <= maxLength) {
    return terminalId
  }
  return `${terminalId.substring(0, 6)}...${terminalId.substring(terminalId.length - 3)}`
}