import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../../api/client'
import { renderFullOutput } from '../TerminalUtils/ansiConverter'

export const useTerminalData = (terminalId: string) => {
  const [renderedHtml, setRenderedHtml] = useState('')
  const [isCleared, setIsCleared] = useState(false)
  const rawOutputRef = useRef<string>('')
  const queryClient = useQueryClient()

  // Reset state when terminal changes
  useEffect(() => {
    setIsCleared(false)
    rawOutputRef.current = ''
    setRenderedHtml('')
  }, [terminalId])

  const { data: terminal } = useQuery({
    queryKey: ['terminal', terminalId],
    queryFn: () => api.getTerminal(terminalId),
    enabled: Boolean(terminalId),
  })

  const {
    data: outputData,
    refetch: refetchOutput,
    isFetching: isFetchingOutput,
  } = useQuery({
    queryKey: ['terminal-output', terminalId],
    queryFn: () => api.getOutput(terminalId, 'full'),
    enabled: Boolean(terminalId),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })

  // Fetch pending messages count for badge
  const { data: pendingMessagesCount = 0 } = useQuery({
    queryKey: ['pending-messages-count', terminalId],
    queryFn: () => api.getPendingMessagesCount({ terminalId }),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  })

  const triggerRefresh = useCallback(() => {
    void refetchOutput()
  }, [refetchOutput])

  // Update rendered HTML when output data changes
  useEffect(() => {
    const output = outputData?.output ?? ''
    rawOutputRef.current = output

    if (!output) {
      setRenderedHtml('')
      return
    }

    setIsCleared(false)
    setRenderedHtml(renderFullOutput(output))
  }, [outputData])

  const getRawOutput = useCallback(() => rawOutputRef.current, [])

  const clearDisplay = useCallback(() => {
    setIsCleared(true)
  }, [])

  return {
    terminal,
    outputData,
    isFetchingOutput,
    pendingMessagesCount,
    renderedHtml,
    isCleared,
    triggerRefresh,
    getRawOutput,
    clearDisplay,
    queryClient,
  }
}