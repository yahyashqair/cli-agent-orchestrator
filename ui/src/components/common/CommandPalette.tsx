import * as React from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { DialogTitle } from '@/components/ui/dialog'
import {
  Terminal,
  Plus,
  Search,
  Settings,
  GitBranch,
  Clock,
  Trash2,
  Download,
  Upload,
  Keyboard,
  Monitor,
  Moon,
  Sun,
  Palette
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CommandAction {
  id: string
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  category: 'navigation' | 'creation' | 'management' | 'settings'
  shortcut?: string[]
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = React.useState('')

  const { data: recentSessions } = useQuery({
    queryKey: ['recent-sessions'],
    queryFn: async () => {
      const response = await api.listSessions()
      return response.slice(0, 5) // Get only first 5 sessions
    },
    enabled: open,
  })

  const { data: flows } = useQuery({
    queryKey: ['flows'],
    queryFn: api.listFlows,
    enabled: open,
  })

  const commands: CommandAction[] = React.useMemo(() => [
    // Navigation Commands
    {
      id: 'dashboard',
      title: 'Go to Dashboard',
      description: 'Navigate to the main dashboard',
      icon: Monitor,
      action: () => {
        window.location.href = '/dashboard'
      },
      category: 'navigation',
      shortcut: ['g', 'd'],
    },
    {
      id: 'sessions',
      title: 'Go to Sessions',
      description: 'Navigate to sessions list',
      icon: Terminal,
      action: () => {
        window.location.href = '/sessions'
      },
      category: 'navigation',
      shortcut: ['g', 's'],
    },
    {
      id: 'flows',
      title: 'Go to Flows',
      description: 'Navigate to flows management',
      icon: GitBranch,
      action: () => {
        window.location.href = '/flows'
      },
      category: 'navigation',
      shortcut: ['g', 'f'],
    },
    {
      id: 'settings',
      title: 'Go to Settings',
      description: 'Navigate to application settings',
      icon: Settings,
      action: () => {
        window.location.href = '/settings'
      },
      category: 'navigation',
      shortcut: ['g', 't'],
    },

    // Creation Commands
    {
      id: 'new-session',
      title: 'Create New Session',
      description: 'Start a new terminal session',
      icon: Plus,
      action: () => {
        window.location.href = '/sessions/new'
      },
      category: 'creation',
      shortcut: ['c', 's'],
    },
    {
      id: 'new-flow',
      title: 'Create New Flow',
      description: 'Create a new automation flow',
      icon: Plus,
      action: () => {
        window.location.href = '/flows/new'
      },
      category: 'creation',
      shortcut: ['c', 'f'],
    },

    // Management Commands
    {
      id: 'search-sessions',
      title: 'Search Sessions',
      description: 'Search through all sessions',
      icon: Search,
      action: () => {
        window.location.href = '/sessions?search=true'
      },
      category: 'management',
      shortcut: ['s', 's'],
    },
    {
      id: 'search-flows',
      title: 'Search Flows',
      description: 'Search through all flows',
      icon: Search,
      action: () => {
        window.location.href = '/flows?search=true'
      },
      category: 'management',
      shortcut: ['s', 'f'],
    },
    {
      id: 'session-history',
      title: 'View Session History',
      description: 'View all past sessions',
      icon: Clock,
      action: () => {
        window.location.href = '/sessions/history'
      },
      category: 'management',
      shortcut: ['h', 's'],
    },
    {
      id: 'export-data',
      title: 'Export Data',
      description: 'Export sessions and flows data',
      icon: Download,
      action: () => {
        // Implement export functionality
        console.log('Export data')
      },
      category: 'management',
      shortcut: ['e', 'd'],
    },
    {
      id: 'import-data',
      title: 'Import Data',
      description: 'Import sessions and flows data',
      icon: Upload,
      action: () => {
        // Implement import functionality
        console.log('Import data')
      },
      category: 'management',
      shortcut: ['i', 'd'],
    },
    {
      id: 'clear-cache',
      title: 'Clear Cache',
      description: 'Clear application cache',
      icon: Trash2,
      action: () => {
        if (window.confirm('Are you sure you want to clear the cache?')) {
          localStorage.clear()
          window.location.reload()
        }
      },
      category: 'management',
      shortcut: ['c', 'c'],
    },

    // Settings Commands
    {
      id: 'toggle-theme',
      title: 'Toggle Theme',
      description: 'Switch between light and dark themes',
      icon: Palette,
      action: () => {
        // Implement theme toggle logic
        const isDark = document.documentElement.classList.contains('dark')
        if (isDark) {
          document.documentElement.classList.remove('dark')
          localStorage.setItem('theme', 'light')
        } else {
          document.documentElement.classList.add('dark')
          localStorage.setItem('theme', 'dark')
        }
      },
      category: 'settings',
      shortcut: ['t', 't'],
    },
    {
      id: 'theme-dark',
      title: 'Set Dark Theme',
      description: 'Apply dark theme',
      icon: Moon,
      action: () => {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      },
      category: 'settings',
    },
    {
      id: 'theme-light',
      title: 'Set Light Theme',
      description: 'Apply light theme',
      icon: Sun,
      action: () => {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      },
      category: 'settings',
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: Keyboard,
      action: () => {
        window.location.href = '/help/shortcuts'
      },
      category: 'settings',
      shortcut: ['?'],
    },
  ], [])

  const executeCommand = (command: CommandAction) => {
    command.action()
    onOpenChange(false)
  }

  const filteredCommands = React.useMemo(() => {
    if (!searchQuery) return commands

    const query = searchQuery.toLowerCase()
    return commands.filter(command =>
      command.title.toLowerCase().includes(query) ||
      command.description?.toLowerCase().includes(query)
    )
  }, [commands, searchQuery])

  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, CommandAction[]> = {
      navigation: [],
      creation: [],
      management: [],
      settings: [],
    }

    filteredCommands.forEach(command => {
      groups[command.category].push(command)
    })

    return groups
  }, [filteredCommands])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Command Palette</DialogTitle>
      <CommandInput
        placeholder="Type a command or search..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent Sessions */}
        {recentSessions && recentSessions.length > 0 && (
          <CommandGroup heading="Recent Sessions">
            {recentSessions.map((session: any) => (
              <CommandItem
                key={session.id || session.name}
                onSelect={() => {
                  window.location.href = `/sessions/${session.id || session.name}`
                  onOpenChange(false)
                }}
              >
                <Terminal className="mr-2 h-4 w-4" />
                <span>{session.name || `Session ${session.id}`}</span>
                <Badge variant="outline" className="ml-auto">
                  {session.status || 'Unknown'}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Recent Flows */}
        {flows && flows.length > 0 && (
          <CommandGroup heading="Recent Flows">
            {flows.slice(0, 5).map((flow: any) => (
              <CommandItem
                key={flow.name}
                onSelect={() => {
                  window.location.href = `/flows/${flow.name}`
                  onOpenChange(false)
                }}
              >
                <GitBranch className="mr-2 h-4 w-4" />
                <span>{flow.name}</span>
                <Badge variant="outline" className="ml-auto">
                  {flow.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navigation Commands */}
        {groupedCommands.navigation.length > 0 && (
          <CommandGroup heading="Navigation">
            {groupedCommands.navigation.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => executeCommand(command)}
              >
                <command.icon className="mr-2 h-4 w-4" />
                <span>{command.title}</span>
                {command.shortcut && (
                  <Badge variant="outline" className="ml-auto">
                    {command.shortcut.join(' + ')}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Creation Commands */}
        {groupedCommands.creation.length > 0 && (
          <CommandGroup heading="Create">
            {groupedCommands.creation.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => executeCommand(command)}
              >
                <command.icon className="mr-2 h-4 w-4" />
                <span>{command.title}</span>
                {command.shortcut && (
                  <Badge variant="outline" className="ml-auto">
                    {command.shortcut.join(' + ')}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Management Commands */}
        {groupedCommands.management.length > 0 && (
          <CommandGroup heading="Management">
            {groupedCommands.management.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => executeCommand(command)}
              >
                <command.icon className="mr-2 h-4 w-4" />
                <span>{command.title}</span>
                {command.shortcut && (
                  <Badge variant="outline" className="ml-auto">
                    {command.shortcut.join(' + ')}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Settings Commands */}
        {groupedCommands.settings.length > 0 && (
          <CommandGroup heading="Settings">
            {groupedCommands.settings.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => executeCommand(command)}
              >
                <command.icon className="mr-2 h-4 w-4" />
                <span>{command.title}</span>
                {command.shortcut && (
                  <Badge variant="outline" className="ml-auto">
                    {command.shortcut.join(' + ')}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
