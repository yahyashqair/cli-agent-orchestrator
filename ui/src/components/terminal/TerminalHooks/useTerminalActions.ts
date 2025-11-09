import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'

interface UseTerminalActionsProps {
  terminalId: string
  onSuccess?: () => void
  onClose?: () => void
}

export const useTerminalActions = ({
  terminalId,
  onSuccess,
  onClose,
}: UseTerminalActionsProps) => {
  const queryClient = useQueryClient()

  const sendInputMutation = useMutation({
    mutationFn: (message: string) => api.sendInput(terminalId, message),
    onSuccess: () => {
      onSuccess?.()
    },
  })

  const exitTerminalMutation = useMutation({
    mutationFn: () => api.exitTerminal(terminalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminal', terminalId] })
    },
  })

  const deleteTerminalMutation = useMutation({
    mutationFn: () => api.deleteTerminal(terminalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onClose?.()
    },
  })

  const openTerminalMutation = useMutation({
    mutationFn: () => api.openTerminal(terminalId),
    onSuccess: (data) => {
      if (data.success) {
        console.log(`Opened terminal: ${data.terminal_emulator} (session: ${data.session_name})`)
      } else {
        alert(`Could not open terminal automatically.\n\nPlease run this command in your terminal:\n${data.attach_command}`)
      }
    },
    onError: (error) => {
      console.error('Failed to open terminal:', error)
      alert('Failed to open terminal. Please check the console for details.')
    },
  })

  const sendInput = (message: string) => {
    if (message.trim()) {
      sendInputMutation.mutate(message)
    }
  }

  const exitTerminal = () => {
    if (confirm('Send exit command to this terminal?')) {
      exitTerminalMutation.mutate()
    }
  }

  const deleteTerminal = () => {
    if (confirm('Delete this terminal?')) {
      deleteTerminalMutation.mutate()
    }
  }

  const openTerminal = () => {
    openTerminalMutation.mutate()
  }

  return {
    sendInput,
    exitTerminal,
    deleteTerminal,
    openTerminal,
    isSendingInput: sendInputMutation.isPending,
    isExitingTerminal: exitTerminalMutation.isPending,
    isDeletingTerminal: deleteTerminalMutation.isPending,
    isOpeningTerminal: openTerminalMutation.isPending,
  }
}