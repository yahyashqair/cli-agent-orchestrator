# Task C: Core Component Migration
**Developer:** Developer 3
**Estimated Time:** 4-5 days
**Priority:** High (Core application functionality)

## Overview
Migrate the core application components (Dashboard, TerminalViewer, SessionList, ControlPanel) to use the new design system while preserving all existing functionality.

## Prerequisites
- Task A (Setup and Foundation) must be completed
- Task B (Design System) must be completed
- Base UI components must be available

## Tasks

### 1. Analyze Existing Components
Before starting migration, review the existing components:
- `src/components/Dashboard.tsx` - Main dashboard with statistics
- `src/components/TerminalViewer.tsx` - Terminal output display
- `src/components/SessionList.tsx` - Session listing
- `src/components/ControlPanel.tsx` - Session creation control
- `src/components/TerminalTabs.tsx` - Terminal tabs management

### 2. Migrate Dashboard Component
Create `src/components/features/dashboard/Dashboard.tsx`:
```typescript
import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Panel } from '@/components/layout/panel'
import {
  Terminal,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Pause,
  Square
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

interface DashboardStats {
  totalSessions: number
  activeSessions: number
  completedSessions: number
  failedSessions: number
  totalTerminals: number
  activeTerminals: number
  totalFlows: number
  activeFlows: number
}

interface RecentSession {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  startTime: string
  endTime?: string
  terminalId: string
  agentProfile: string
}

interface TerminalStatus {
  id: string
  name: string
  status: 'active' | 'idle' | 'offline'
  sessionId?: string
  lastActivity: string
}

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/api/dashboard/stats')
      return response.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: recentSessions, isLoading: sessionsLoading } = useQuery<RecentSession[]>({
    queryKey: ['recent-sessions'],
    queryFn: async () => {
      const response = await apiClient.get('/api/sessions?limit=10&sort=createdAt:desc')
      return response.data
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const { data: terminalStatuses, isLoading: terminalsLoading } = useQuery<TerminalStatus[]>({
    queryKey: ['terminal-statuses'],
    queryFn: async () => {
      const response = await apiClient.get('/api/terminals/status')
      return response.data
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'active':
        return <Play className="h-4 w-4 text-green-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'failed':
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'paused':
      case 'idle':
        return <Pause className="h-4 w-4 text-yellow-500" />
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
      case 'offline':
        return 'destructive' as const
      case 'paused':
      case 'idle':
        return 'warning' as const
      default:
        return 'secondary' as const
    }
  }

  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleString()
  }

  const calculateDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = end.getTime() - start.getTime()

    const minutes = Math.floor(duration / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  if (statsLoading || sessionsLoading || terminalsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your terminal sessions and automation flows
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeSessions || 0} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminals</CardTitle>
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTerminals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeTerminals || 0} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Flows</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeFlows || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalFlows || 0} total flows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalSessions ? Math.round((stats.completedSessions / stats.totalSessions) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.completedSessions || 0} completed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>
              Latest terminal sessions and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {recentSessions?.map((session) => (
                  <div key={session.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(session.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.agentProfile} • {calculateDuration(session.startTime, session.endTime)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant={getStatusVariant(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!recentSessions || recentSessions.length === 0) && (
                  <div className="text-center py-8">
                    <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent sessions</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Terminal Status */}
        <Card>
          <CardHeader>
            <CardTitle>Terminal Status</CardTitle>
            <CardDescription>
              Current status of all configured terminals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {terminalStatuses?.map((terminal) => (
                  <div key={terminal.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(terminal.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {terminal.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last active: {formatTime(terminal.lastActivity)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant={getStatusVariant(terminal.status)}>
                        {terminal.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!terminalStatuses || terminalStatuses.length === 0) && (
                  <div className="text-center py-8">
                    <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No terminals configured</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button className="h-auto p-4 flex-col space-y-2">
              <Terminal className="h-6 w-6" />
              <span>New Session</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Activity className="h-6 w-6" />
              <span>View Flows</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <Clock className="h-6 w-6" />
              <span>Session History</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
              <AlertCircle className="h-6 w-6" />
              <span>System Status</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 3. Migrate TerminalViewer Component
Create `src/components/features/terminal/TerminalViewer.tsx`:
```typescript
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Panel } from '@/components/layout/panel'
import {
  Terminal,
  Maximize2,
  Minimize2,
  Copy,
  Download,
  Play,
  Pause,
  Square,
  RotateCcw
} from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

interface TerminalMessage {
  id: string
  type: 'stdout' | 'stderr' | 'system'
  content: string
  timestamp: string
  sessionId: string
}

interface TerminalViewerProps {
  sessionId: string
  terminalId: string
  className?: string
}

export function TerminalViewer({ sessionId, terminalId, className }: TerminalViewerProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [autoScroll, setAutoScroll] = React.useState(true)
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)

  const { data: messages, isLoading } = useQuery<TerminalMessage[]>({
    queryKey: ['terminal-messages', sessionId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/sessions/${sessionId}/messages`)
      return response.data
    },
    refetchInterval: 1000, // Refresh every second
  })

  const startMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/api/sessions/${sessionId}/start`)
    },
  })

  const stopMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/api/sessions/${sessionId}/stop`)
    },
  })

  const pauseMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/api/sessions/${sessionId}/pause`)
    },
  })

  const resumeMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/api/sessions/${sessionId}/resume`)
    },
  })

  React.useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages, autoScroll])

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const downloadOutput = () => {
    const output = messages?.map(msg => msg.content).join('\n') || ''
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terminal-output-${sessionId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'stderr':
        return 'text-red-500'
      case 'system':
        return 'text-blue-500'
      default:
        return 'text-foreground'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  if (isLoading) {
    return (
      <Panel className={className}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Panel>
    )
  }

  return (
    <Panel className={`flex flex-col ${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Terminal className="h-5 w-5" />
          <CardTitle className="text-lg">Terminal Output</CardTitle>
          <Badge variant="outline">{terminalId}</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className={autoScroll ? 'text-primary' : ''}
          >
            Auto Scroll
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadOutput}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {/* Controls */}
      <div className="flex items-center space-x-2 px-6 pb-4">
        <Button
          size="sm"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
        >
          <Play className="h-4 w-4 mr-2" />
          Start
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => pauseMutation.mutate()}
          disabled={pauseMutation.isPending}
        >
          <Pause className="h-4 w-4 mr-2" />
          Pause
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => resumeMutation.mutate()}
          disabled={resumeMutation.isPending}
        >
          <Play className="h-4 w-4 mr-2" />
          Resume
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => stopMutation.mutate()}
          disabled={stopMutation.isPending}
        >
          <Square className="h-4 w-4 mr-2" />
          Stop
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Separator />

      {/* Terminal Output */}
      <CardContent className="flex-1 p-0">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="p-4 font-mono text-sm">
            {messages?.map((message) => (
              <div
                key={message.id}
                className="mb-2 group relative"
              >
                <div className="flex items-start space-x-2">
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  <pre className={`flex-1 whitespace-pre-wrap break-all ${getMessageColor(message.type)}`}>
                    {message.content}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(message.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {(!messages || messages.length === 0) && (
              <div className="text-center py-8">
                <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No output yet. Start a session to see terminal output.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Panel>
  )
}
```

### 4. Migrate SessionList Component
Create `src/components/features/sessions/SessionList.tsx`:
```typescript
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Terminal,
  Play,
  Pause,
  Square,
  Archive,
  Trash2,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

interface Session {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'paused' | 'archived'
  startTime: string
  endTime?: string
  terminalId: string
  agentProfile: string
  description?: string
  progress?: number
}

interface SessionListProps {
  onSessionSelect: (sessionId: string) => void
  selectedSessionId?: string
  className?: string
}

export function SessionList({ onSessionSelect, selectedSessionId, className }: SessionListProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<string>('startTime')

  const { data: sessions, isLoading, refetch } = useQuery<Session[]>({
    queryKey: ['sessions', statusFilter, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: statusFilter === 'all' ? '' : statusFilter,
        sort: sortBy,
      })
      const response = await apiClient.get(`/api/sessions?${params}`)
      return response.data
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  const archiveMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiClient.post(`/api/sessions/${sessionId}/archive`)
    },
    onSuccess: () => {
      refetch()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiClient.delete(`/api/sessions/${sessionId}`)
    },
    onSuccess: () => {
      refetch()
    },
  })

  const startMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiClient.post(`/api/sessions/${sessionId}/start`)
    },
    onSuccess: () => {
      refetch()
    },
  })

  const stopMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiClient.post(`/api/sessions/${sessionId}/stop`)
    },
    onSuccess: () => {
      refetch()
    },
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="h-4 w-4 text-green-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'running':
        return 'success' as const
      case 'completed':
        return 'default' as const
      case 'failed':
        return 'destructive' as const
      case 'paused':
        return 'warning' as const
      case 'archived':
        return 'secondary' as const
      default:
        return 'secondary' as const
    }
  }

  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleString()
  }

  const calculateDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = end.getTime() - start.getTime()

    const minutes = Math.floor(duration / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  const filteredSessions = sessions?.filter(session =>
    session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleSessionAction = (action: string, sessionId: string) => {
    switch (action) {
      case 'start':
        startMutation.mutate(sessionId)
        break
      case 'stop':
        stopMutation.mutate(sessionId)
        break
      case 'archive':
        archiveMutation.mutate(sessionId)
        break
      case 'delete':
        if (window.confirm('Are you sure you want to delete this session?')) {
          deleteMutation.mutate(sessionId)
        }
        break
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Terminal className="h-5 w-5" />
            <span>Sessions</span>
          </CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="startTime">Start Time</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-4 space-y-2">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                  selectedSessionId === session.id ? 'bg-accent' : ''
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {getStatusIcon(session.status)}
                      <h3 className="font-medium truncate">{session.name}</h3>
                      <Badge variant={getStatusVariant(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {session.description || 'No description'}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{session.agentProfile}</span>
                      <span>•</span>
                      <span>{calculateDuration(session.startTime, session.endTime)}</span>
                      <span>•</span>
                      <span>{formatTime(session.startTime)}</span>
                    </div>
                    {session.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{session.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${session.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 ml-4">
                    {session.status === 'paused' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSessionAction('start', session.id)
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {session.status === 'running' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSessionAction('stop', session.id)
                        }}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    )}
                    {session.status !== 'archived' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSessionAction('archive', session.id)
                        }}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSessionAction('delete', session.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredSessions.length === 0 && (
              <div className="text-center py-8">
                <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No sessions found</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Session
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
```

### 5. Migrate ControlPanel Component
Create `src/components/features/sessions/ControlPanel.tsx`:
```typescript
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  Terminal,
  Settings,
  Clock,
  Play,
  Save,
  RefreshCw
} from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { AGENT_PROFILES, PROVIDERS } from '@/constants/providers'

interface SessionConfig {
  name: string
  description?: string
  agentProfile: string
  provider: string
  terminalId: string
  command?: string
  workingDirectory?: string
  environmentVariables?: Record<string, string>
}

interface ControlPanelProps {
  onSessionCreated: (sessionId: string) => void
  className?: string
}

export function ControlPanel({ onSessionCreated, className }: ControlPanelProps) {
  const [config, setConfig] = React.useState<SessionConfig>({
    name: '',
    description: '',
    agentProfile: '',
    provider: '',
    terminalId: '',
    command: '',
    workingDirectory: '',
    environmentVariables: {},
  })

  const { data: terminals } = useQuery({
    queryKey: ['terminals'],
    queryFn: async () => {
      const response = await apiClient.get('/api/terminals')
      return response.data
    },
  })

  const { data: recentConfigs } = useQuery({
    queryKey: ['recent-session-configs'],
    queryFn: async () => {
      const response = await apiClient.get('/api/sessions/recent-configs')
      return response.data
    },
  })

  const createSessionMutation = useMutation({
    mutationFn: async (sessionConfig: SessionConfig) => {
      const response = await apiClient.post('/api/sessions', sessionConfig)
      return response.data
    },
    onSuccess: (data) => {
      onSessionCreated(data.id)
      // Reset form
      setConfig({
        name: '',
        description: '',
        agentProfile: '',
        provider: '',
        terminalId: '',
        command: '',
        workingDirectory: '',
        environmentVariables: {},
      })
    },
  })

  const handleConfigChange = (field: keyof SessionConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCreateSession = () => {
    if (!config.name || !config.agentProfile || !config.provider || !config.terminalId) {
      alert('Please fill in all required fields')
      return
    }
    createSessionMutation.mutate(config)
  }

  const loadRecentConfig = (recentConfig: SessionConfig) => {
    setConfig(recentConfig)
  }

  const saveConfigAsRecent = () => {
    // Save current config to recent configs
    apiClient.post('/api/sessions/save-config', config)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Create Session</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Session Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Session Name *</label>
          <Input
            placeholder="Enter session name"
            value={config.name}
            onChange={(e) => handleConfigChange('name', e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Input
            placeholder="Enter session description"
            value={config.description}
            onChange={(e) => handleConfigChange('description', e.target.value)}
          />
        </div>

        <Separator />

        {/* Agent Profile */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Agent Profile *</label>
          <Select value={config.agentProfile} onValueChange={(value) => handleConfigChange('agentProfile', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select agent profile" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AGENT_PROFILES).map(([key, profile]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center space-x-2">
                    <span>{profile.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {profile.category}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Provider */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Provider *</label>
          <Select value={config.provider} onValueChange={(value) => handleConfigChange('provider', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDERS).map(([key, provider]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center space-x-2">
                    <span>{provider.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {provider.type}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Terminal */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Terminal *</label>
          <Select value={config.terminalId} onValueChange={(value) => handleConfigChange('terminalId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select terminal" />
            </SelectTrigger>
            <SelectContent>
              {terminals?.map((terminal: any) => (
                <SelectItem key={terminal.id} value={terminal.id}>
                  <div className="flex items-center space-x-2">
                    <Terminal className="h-4 w-4" />
                    <span>{terminal.name}</span>
                    <Badge variant={terminal.status === 'active' ? 'success' : 'secondary'} className="text-xs">
                      {terminal.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Command */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Command</label>
          <Input
            placeholder="Enter command to execute"
            value={config.command}
            onChange={(e) => handleConfigChange('command', e.target.value)}
          />
        </div>

        {/* Working Directory */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Working Directory</label>
          <Input
            placeholder="Enter working directory"
            value={config.workingDirectory}
            onChange={(e) => handleConfigChange('workingDirectory', e.target.value)}
          />
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleCreateSession}
            disabled={createSessionMutation.isPending}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
          </Button>
          <Button
            variant="outline"
            onClick={saveConfigAsRecent}
            disabled={!config.name}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Recent Configs */}
        {recentConfigs && recentConfigs.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Recent Configurations</span>
              </label>
              <div className="space-y-2">
                {recentConfigs.map((recentConfig: SessionConfig, index: number) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => loadRecentConfig(recentConfig)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{recentConfig.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {recentConfig.agentProfile} • {recentConfig.provider}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

### 6. Migrate TerminalTabs Component
Create `src/components/features/terminal/TerminalTabs.tsx`:
```typescript
import * as React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Plus, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TerminalTab {
  id: string
  name: string
  status: 'active' | 'idle' | 'offline'
  sessionId?: string
  unreadCount?: number
}

interface TerminalTabsProps {
  terminals: TerminalTab[]
  activeTerminalId: string
  onTerminalChange: (terminalId: string) => void
  onTerminalClose: (terminalId: string) => void
  onTerminalAdd: () => void
  className?: string
}

export function TerminalTabs({
  terminals,
  activeTerminalId,
  onTerminalChange,
  onTerminalClose,
  onTerminalAdd,
  className
}: TerminalTabsProps) {
  const handleTabChange = (value: string) => {
    onTerminalChange(value)
  }

  const handleTabClose = (terminalId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onTerminalClose(terminalId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'idle':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <Tabs value={activeTerminalId} onValueChange={handleTabChange} className="w-full">
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
                <Terminal className="h-4 w-4" />
                <span className="max-w-24 truncate">{terminal.name}</span>
                {terminal.unreadCount && terminal.unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {terminal.unreadCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleTabClose(terminal.id, e)}
              >
                <X className="h-3 w-3" />
              </Button>
            </TabsTrigger>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={onTerminalAdd}
            className="h-8 px-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TabsList>

        {terminals.map((terminal) => (
          <TabsContent key={terminal.id} value={terminal.id} className="mt-0">
            {/* Terminal content will be rendered here by the parent component */}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
```

## Deliverables

1. ✅ Migrated Dashboard component with new design system
2. ✅ Migrated TerminalViewer component with improved functionality
3. ✅ Migrated SessionList component with enhanced filtering
4. ✅ Migrated ControlPanel component with better UX
5. ✅ Migrated TerminalTabs component with modern design
6. ✅ All components properly typed with TypeScript
7. ✅ Components integrated with existing API client
8. ✅ Responsive design implemented
9. ✅ Accessibility improvements added

## Testing Checklist

- [ ] All components render without errors
- [ ] Components maintain existing functionality
- [ ] API integration works correctly
- [ ] Responsive design works on different screen sizes
- [ ] Keyboard navigation works properly
- [ ] Loading states display correctly
- [ ] Error handling works as expected
- [ ] Components are accessible
- [ ] Performance is acceptable

## Next Steps

Once this task is complete, notify the project supervisor. These core components will be used by other components and should be thoroughly tested before proceeding.

## Notes

- Maintain backward compatibility with existing API endpoints
- Test components with different data states (loading, error, empty)
- Ensure components work well together as a system
- Pay attention to accessibility and responsive design
- Keep component props consistent with existing usage patterns