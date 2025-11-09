export const CLEARED_MESSAGE = '<span style="opacity: 0.5;">Terminal output cleared (data still exists on server)</span>'
export const EMPTY_MESSAGE = 'No output yet...'

export interface TerminalUpdateMessage {
  type: 'terminal_update'
  terminal_id: string
  event: 'init' | 'changed'
}

export const getWebSocketUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export const createWebSocketSubscription = (
  websocket: WebSocket,
  terminalId: string
): void => {
  websocket.send(
    JSON.stringify({
      action: 'subscribe_terminal',
      terminal_id: terminalId,
    })
  )
}

export const createWebSocketUnsubscription = (
  websocket: WebSocket,
  terminalId: string
): void => {
  websocket.send(
    JSON.stringify({
      action: 'unsubscribe_terminal',
      terminal_id: terminalId,
    })
  )
}