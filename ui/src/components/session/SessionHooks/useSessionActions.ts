import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'

interface UseSessionActionsProps {
  onTerminalSelect?: (id: string) => void
  selectedTerminalId?: string | null
}

export const useSessionActions = ({
  onTerminalSelect,
  selectedTerminalId,
}: UseSessionActionsProps) => {
  const queryClient = useQueryClient()

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
      if (selectedTerminalId === terminalId && onTerminalSelect) {
        onTerminalSelect('')
      }
    }
  }

  return {
    handleArchiveSession,
    handleDeleteSession,
    handleDeleteTerminal,
    isArchivingSession: archiveSessionMutation.isPending,
    isDeletingSession: deleteSessionMutation.isPending,
    isDeletingTerminal: deleteTerminalMutation.isPending,
  }
}