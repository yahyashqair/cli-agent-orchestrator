# Task D: Advanced Features Migration
**Developer:** Developer 4
**Estimated Time:** 4-5 days
**Priority:** High (Advanced application functionality)

## Overview
Migrate advanced components including FlowViewer, FlowEditor, CommandPalette, AgentProviderSettings, MessageCard, and InboxViewer to use the new design system while preserving all existing functionality.

## Prerequisites
- Task A (Setup and Foundation) must be completed
- Task B (Design System) must be completed
- Base UI components must be available

## Tasks

### 1. Migrate FlowViewer Component
Create `src/components/features/flows/FlowViewer.tsx`:
```typescript
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Copy,
  Download,
  Upload,
  GitBranch,
  Circle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

interface FlowNode {
  id: string
  type: 'start' | 'action' | 'condition' | 'end'
  name: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  config?: Record<string, any>
  position?: { x: number; y: number }
}

interface FlowEdge {
  id: string
  source: string
  target: string
  condition?: string
}

interface Flow {
  id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed'
  nodes: FlowNode[]
  edges: FlowEdge[]
  createdAt: string
  updatedAt: string
  executionHistory?: Array<{
    id: string
    startTime: string
    endTime?: string
    status: 'running' | 'completed' | 'failed'
  }>
}

interface FlowViewerProps {
  flowId?: string
  onFlowSelect: (flowId: string) => void
  onFlowEdit: (flowId: string) => void
  className?: string
}

export function FlowViewer({ flowId, onFlowSelect, onFlowEdit, className }: FlowViewerProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [selectedExecution, setSelectedExecution] = React.useState<string | null>(null)

  const { data: flows, isLoading: flowsLoading, refetch: refetchFlows } = useQuery<Flow[]>({
    queryKey: ['flows', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: statusFilter === 'all' ? '' : statusFilter,
      })
      const response = await apiClient.get(`/api/flows?${params}`)
      return response.data
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const { data: selectedFlow, isLoading: flowLoading } = useQuery<Flow>({
    queryKey: ['flow', flowId],
    queryFn: async () => {
      if (!flowId) return null
      const response = await apiClient.get(`/api/flows/${flowId}`)
      return response.data
    },
    enabled: !!flowId,
  })

  const executeFlowMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const response = await apiClient.post(`/api/flows/${flowId}/execute`)
      return response.data
    },
    onSuccess: () => {
      refetchFlows()
    },
  })

  const pauseFlowMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const response = await apiClient.post(`/api/flows/${flowId}/pause`)
      return response.data
    },
    onSuccess: () => {
      refetchFlows()
    },
  })

  const stopFlowMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const response = await apiClient.post(`/api/flows/${flowId}/stop`)
      return response.data
    },
    onSuccess: () => {
      refetchFlows()
    },
  })

  const deleteFlowMutation = useMutation({
    mutationFn: async (flowId: string) => {
      return apiClient.delete(`/api/flows/${flowId}`)
    },
    onSuccess: () => {
      refetchFlows()
    },
  })

  const duplicateFlowMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const response = await apiClient.post(`/api/flows/${flowId}/duplicate`)
      return response.data
    },
    onSuccess: () => {
      refetchFlows()
    },
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'active':
        return <Play className="h-4 w-4 text-green-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'draft':
        return <Edit className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'running':
      case 'active':
        return 'success' as const
      case 'completed':
        return 'default' as const
      case 'failed':
        return 'destructive' as const
      case 'paused':
        return 'warning' as const
      case 'draft':
        return 'secondary' as const
      default:
        return 'secondary' as const
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'start':
        return <Play className="h-4 w-4" />
      case 'action':
        return <Zap className="h-4 w-4" />
      case 'condition':
        return <GitBranch className="h-4 w-4" />
      case 'end':
        return <Square className="h-4 w-4" />
      default:
        return <Circle className="h-4 w-4" />
    }
  }

  const handleFlowAction = (action: string, flowId: string) => {
    switch (action) {
      case 'execute':
        executeFlowMutation.mutate(flowId)
        break
      case 'pause':
        pauseFlowMutation.mutate(flowId)
        break
      case 'stop':
        stopFlowMutation.mutate(flowId)
        break
      case 'duplicate':
        duplicateFlowMutation.mutate(flowId)
        break
      case 'delete':
        if (window.confirm('Are you sure you want to delete this flow?')) {
          deleteFlowMutation.mutate(flowId)
        }
        break
    }
  }

  const renderFlowVisualization = (flow: Flow) => {
    return (
      <div className="p-6 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Flow Visualization</h3>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusVariant(flow.status)}>
              {flow.status}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFlowEdit(flow.id)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        <div className="relative">
          {/* Simple flow visualization - in a real implementation, you might use a library like react-flow */}
          <div className="flex flex-col space-y-8">
            {flow.nodes.map((node, index) => (
              <div key={node.id} className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-full border-2 ${
                    node.status === 'completed' ? 'border-green-500 bg-green-50' :
                    node.status === 'failed' ? 'border-red-500 bg-red-50' :
                    node.status === 'running' ? 'border-blue-500 bg-blue-50' :
                    'border-gray-300 bg-gray-50'
                  }`}>
                    {getNodeIcon(node.type)}
                  </div>
                  <div>
                    <h4 className="font-medium">{node.name}</h4>
                    <p className="text-sm text-muted-foreground">{node.description}</p>
                  </div>
                  <Badge variant={getStatusVariant(node.status)} className="ml-2">
                    {node.status}
                  </Badge>
                </div>
                {index < flow.nodes.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>

        {flow.executionHistory && flow.executionHistory.length > 0 && (
          <div className="mt-8">
            <h4 className="font-medium mb-4">Execution History</h4>
            <div className="space-y-2">
              {flow.executionHistory.map((execution) => (
                <div
                  key={execution.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedExecution === execution.id ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedExecution(execution.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(execution.status)}
                      <span className="text-sm">
                        {new Date(execution.startTime).toLocaleString()}
                      </span>
                    </div>
                    <Badge variant={getStatusVariant(execution.status)}>
                      {execution.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (flowsLoading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flows</h1>
          <p className="text-muted-foreground">
            Manage and execute automation flows
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Flow
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Flow List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GitBranch className="h-5 w-5" />
              <span>Flows</span>
            </CardTitle>

            {/* Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search flows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <div className="p-4 space-y-2">
                {flows?.filter(flow =>
                  flow.name.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((flow) => (
                  <div
                    key={flow.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedFlow?.id === flow.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => onFlowSelect(flow.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium truncate">{flow.name}</h3>
                      {getStatusIcon(flow.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {flow.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant={getStatusVariant(flow.status)}>
                        {flow.status}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        {flow.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFlowAction('execute', flow.id)
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {flow.status === 'active' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFlowAction('pause', flow.id)
                            }}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFlowAction('duplicate', flow.id)
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFlowAction('delete', flow.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {(!flows || flows.length === 0) && (
                  <div className="text-center py-8">
                    <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No flows found</p>
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Flow
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Flow Details */}
        <Card className="lg:col-span-2">
          {selectedFlow ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedFlow.name}</CardTitle>
                    <p className="text-muted-foreground">{selectedFlow.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusVariant(selectedFlow.status)}>
                      {selectedFlow.status}
                    </Badge>
                    {selectedFlow.status === 'draft' && (
                      <Button
                        onClick={() => handleFlowAction('execute', selectedFlow.id)}
                        disabled={executeFlowMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Execute
                      </Button>
                    )}
                    {selectedFlow.status === 'active' && (
                      <Button
                        variant="outline"
                        onClick={() => handleFlowAction('pause', selectedFlow.id)}
                        disabled={pauseFlowMutation.isPending}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => onFlowEdit(selectedFlow.id)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="visualization" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="visualization">Visualization</TabsTrigger>
                    <TabsTrigger value="nodes">Nodes</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="visualization" className="mt-6">
                    {renderFlowVisualization(selectedFlow)}
                  </TabsContent>

                  <TabsContent value="nodes" className="mt-6">
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {selectedFlow.nodes.map((node) => (
                          <Card key={node.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {getNodeIcon(node.type)}
                                  <div>
                                    <h4 className="font-medium">{node.name}</h4>
                                    <p className="text-sm text-muted-foreground">{node.description}</p>
                                  </div>
                                </div>
                                <Badge variant={getStatusVariant(node.status)}>
                                  {node.status}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="settings" className="mt-6">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Created</label>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedFlow.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Updated</label>
                          <p className="text-sm text-muted-foreground">
                            {new Date(selectedFlow.updatedAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Nodes</label>
                          <p className="text-sm text-muted-foreground">
                            {selectedFlow.nodes.length}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Connections</label>
                          <p className="text-sm text-muted-foreground">
                            {selectedFlow.edges.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a flow to view details</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
```

### 2. Migrate CommandPalette Component
Create `src/components/common/CommandPalette.tsx`:
```typescript
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
  FileText,
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
import { apiClient } from '@/api/client'
import { useTheme } from '@/hooks/use-theme'

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
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = React.useState('')

  const { data: recentSessions } = useQuery({
    queryKey: ['recent-sessions'],
    queryFn: async () => {
      const response = await apiClient.get('/api/sessions?limit=5&sort=lastAccessed:desc')
      return response.data
    },
    enabled: open,
  })

  const { data: flows } = useQuery({
    queryKey: ['flows'],
    queryFn: async () => {
      const response = await apiClient.get('/api/flows?limit=5')
      return response.data
    },
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
        setTheme(theme === 'dark' ? 'light' : 'dark')
      },
      category: 'settings',
      shortcut: ['t', 't'],
    },
    {
      id: 'theme-dark',
      title: 'Set Dark Theme',
      description: 'Apply dark theme',
      icon: Moon,
      action: () => setTheme('dark'),
      category: 'settings',
    },
    {
      id: 'theme-light',
      title: 'Set Light Theme',
      description: 'Apply light theme',
      icon: Sun,
      action: () => setTheme('light'),
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
  ], [theme, setTheme])

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
                key={session.id}
                onSelect={() => {
                  window.location.href = `/sessions/${session.id}`
                  onOpenChange(false)
                }}
              >
                <Terminal className="mr-2 h-4 w-4" />
                <span>{session.name}</span>
                <Badge variant="outline" className="ml-auto">
                  {session.status}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Recent Flows */}
        {flows && flows.length > 0 && (
          <CommandGroup heading="Recent Flows">
            {flows.map((flow: any) => (
              <CommandItem
                key={flow.id}
                onSelect={() => {
                  window.location.href = `/flows/${flow.id}`
                  onOpenChange(false)
                }}
              >
                <GitBranch className="mr-2 h-4 w-4" />
                <span>{flow.name}</span>
                <Badge variant="outline" className="ml-auto">
                  {flow.status}
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
```

### 3. Create Additional Components

Continue creating the following components with similar patterns:
- `src/components/features/flows/FlowEditor.tsx`
- `src/components/features/settings/AgentProviderSettings.tsx`
- `src/components/common/MessageCard.tsx`
- `src/components/features/terminal/InboxViewer.tsx`

### 4. Create Command Component (missing from Radix)
Create `src/components/ui/command.tsx`:
```typescript
import * as React from 'react'
import { DialogProps } from '@radix-ui/react-dialog'
import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

interface CommandDialogProps extends DialogProps {}

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 h-px bg-border', className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        'ml-auto text-xs tracking-widest text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = 'CommandShortcut'

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
```

## Deliverables

1. ✅ Migrated FlowViewer component with visualization
2. ✅ Migrated CommandPalette component with search functionality
3. ✅ Created Command component (missing from Radix UI)
4. ✅ Migrated FlowEditor component
5. ✅ Migrated AgentProviderSettings component
6. ✅ Migrated MessageCard component
7. ✅ Migrated InboxViewer component
8. ✅ All components properly typed with TypeScript
9. ✅ Components integrated with existing API client
10. ✅ Advanced features implemented (keyboard shortcuts, search, etc.)

## Testing Checklist

- [ ] All components render without errors
- [ ] Components maintain existing functionality
- [ ] Command palette search works correctly
- [ ] Flow visualization displays properly
- [ ] Keyboard shortcuts work as expected
- [ ] API integration works correctly
- [ ] Responsive design works on different screen sizes
- [ ] Components are accessible
- [ ] Performance is acceptable

## Next Steps

Once this task is complete, notify the project supervisor. These advanced components provide the core functionality for power users and should be thoroughly tested.

## Notes

- Command palette should be fast and responsive
- Flow visualization should be clear and informative
- All components should handle loading and error states gracefully
- Pay special attention to keyboard navigation and accessibility
- Test components with large datasets for performance issues