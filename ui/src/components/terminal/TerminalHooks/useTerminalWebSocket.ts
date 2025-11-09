import { useEffect, useRef, useCallback } from 'react'
import {
  getWebSocketUrl,
  createWebSocketSubscription,
  createWebSocketUnsubscription,
  type TerminalUpdateMessage,
} from '../TerminalUtils/terminalUtils'

export const useTerminalWebSocket = (
  terminalId: string,
  onTerminalUpdate: () => void
) => {
  const wsRef = useRef<WebSocket | null>(null)
  const pendingRefreshRef = useRef(false)
  const isFetchingRef = useRef(false)

  useEffect(() => {
    if (!terminalId) return

    const websocket = new WebSocket(getWebSocketUrl())
    wsRef.current = websocket

    websocket.onopen = () => {
      createWebSocketSubscription(websocket, terminalId)
      onTerminalUpdate()
    }

    websocket.onmessage = (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as TerminalUpdateMessage
        if (message.type === 'terminal_update' && message.terminal_id === terminalId) {
          onTerminalUpdate()
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
          createWebSocketUnsubscription(websocket, terminalId)
        }
      } catch (error) {
        console.error('Failed to send WebSocket unsubscribe:', error)
      } finally {
        websocket.close()
      }
    }
  }, [terminalId, onTerminalUpdate])

  const triggerRefresh = useCallback(() => {
    if (isFetchingRef.current) {
      pendingRefreshRef.current = true
      return
    }
    pendingRefreshRef.current = false
    onTerminalUpdate()
  }, [onTerminalUpdate])

  const setFetchingState = useCallback((isFetching: boolean) => {
    isFetchingRef.current = isFetching
    if (!isFetching && pendingRefreshRef.current) {
      pendingRefreshRef.current = false
      onTerminalUpdate()
    }
  }, [onTerminalUpdate])

  return {
    triggerRefresh,
    setFetchingState,
  }
}