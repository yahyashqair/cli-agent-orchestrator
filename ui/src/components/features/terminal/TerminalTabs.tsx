import { X, Terminal as TerminalIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Session, TerminalStatus } from '@/types'

interface TerminalTab {
  id: string
  name: string
  status: TerminalStatus
  sessionName: string
  agentProfile: string
  provider: string
  unreadCount?: number
}

interface TerminalTabsProps {
  sessions: Session[]
  selectedTerminalId: string | null
  onTerminalSelect: (id: string) => void
  onTerminalClose?: (id: string) => void
  onTerminalAdd?: () => void
  className?: string
}

export function TerminalTabs({
  sessions,
  selectedTerminalId,
  onTerminalSelect,
  onTerminalClose,
  onTerminalAdd,
  className
}: TerminalTabsProps) {
  // Get all terminals from all sessions
  const terminals: TerminalTab[] = sessions.flatMap(session =>
    (session.terminals ?? []).map(terminal => ({
      id: terminal.id,
      name: terminal.agent_profile,
      status: terminal.status,
      sessionName: session.name,
      agentProfile: terminal.agent_profile,
      provider: terminal.provider,
    }))
  )

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PROCESSING':
      case 'WAITING_USER_ANSWER':
        return 'success' as const
      case 'COMPLETED':
        return 'default' as const
      case 'ERROR':
        return 'destructive' as const
      case 'IDLE':
        return 'warning' as const
      default:
        return 'secondary' as const
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSING':
      case 'WAITING_USER_ANSWER':
        return 'bg-green-500'
      case 'COMPLETED':
        return 'bg-blue-500'
      case 'ERROR':
        return 'bg-red-500'
      case 'IDLE':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const handleTabChange = (value: string) => {
    onTerminalSelect(value)
  }

  const handleTabClose = (terminalId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onTerminalClose?.(terminalId)
  }

  if (terminals.length === 0) {
    return null
  }

  return (
    <div className={cn('w-full', className)}>
      <Tabs value={selectedTerminalId || ''} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-none auto-cols-max h-auto">
          {terminals.map((terminal) => (
            <TabsTrigger
              key={terminal.id}
              value={terminal.id}
              className="relative group data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-border"
            >
              <div className="flex items-center space-x-2 pr-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  getStatusColor(terminal.status)
                )} />
                <TerminalIcon className="h-4 w-4" />
                <span className="max-w-24 truncate">{terminal.name}</span>
                <Badge variant={getStatusVariant(terminal.status)} className="text-xs">
                  {terminal.status.substring(0, 4)}
                </Badge>
              </div>
              {onTerminalClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleTabClose(terminal.id, e)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </TabsTrigger>
          ))}
          {onTerminalAdd && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTerminalAdd}
              className="h-8 px-2"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </TabsList>
      </Tabs>
    </div>
  )
}

export default TerminalTabs
