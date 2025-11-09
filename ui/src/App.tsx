import * as React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CommandPalette } from '@/components/common/CommandPalette'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import Dashboard from '@/components/features/dashboard/Dashboard'
import SessionList from '@/components/features/sessions/SessionList'
import ControlPanel from '@/components/features/sessions/ControlPanel'
import TerminalViewer from '@/components/features/terminal/TerminalViewer'
import TerminalTabs from '@/components/features/terminal/TerminalTabs'
import FlowViewer from '@/components/features/flows/FlowViewer'
import InboxViewer from '@/components/features/terminal/InboxViewer'
import { useTheme } from '@/hooks/use-theme'
import { useKeyboard } from '@/hooks/use-keyboard'
import { cn } from '@/lib/utils'
import { api } from '@/api/client'
import type { Terminal } from '@/types'

function AppContent() {
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const { data: sessions = [], isFetching: isSessionsFetching } = useQuery({
    queryKey: ['sessions'],
    queryFn: api.listSessions,
    refetchInterval: 5000,
  })
  const allTerminals = React.useMemo(
    () => sessions.flatMap(session => session.terminals ?? []),
    [sessions]
  )
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)
  const [selectedTerminalId, setSelectedTerminalId] = React.useState<string | null>(null)
  const [isCompactMode, setIsCompactMode] = React.useState(false)
  const [showInbox, setShowInbox] = React.useState(false)
  const [showLaunchPanel, setShowLaunchPanel] = React.useState(false)

  React.useEffect(() => {
    if (allTerminals.length === 0) {
      if (selectedTerminalId !== null) {
        setSelectedTerminalId(null)
      }
      return
    }

    const currentExists = allTerminals.some(terminal => terminal.id === selectedTerminalId)
    if (!selectedTerminalId || !currentExists) {
      setSelectedTerminalId(allTerminals[0]?.id ?? null)
    }
  }, [allTerminals, selectedTerminalId])

  const handleTerminalSelect = React.useCallback((terminalId: string) => {
    setSelectedTerminalId(terminalId)
  }, [sessions])

  const handleTerminalClose = React.useCallback(async (terminalId: string) => {
    try {
      await api.deleteTerminal(terminalId)
      if (selectedTerminalId === terminalId) {
        const remaining = allTerminals.filter(terminal => terminal.id !== terminalId)
        setSelectedTerminalId(remaining[0]?.id ?? null)
      }
    } catch (error) {
      console.error('Failed to delete terminal', error)
    } finally {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }
  }, [allTerminals, queryClient, selectedTerminalId])

  const handleTerminalAdd = React.useCallback(() => {
    setShowLaunchPanel(true)
  }, [])

  const handleLaunchSuccess = React.useCallback(() => {
    setShowLaunchPanel(false)
    queryClient.invalidateQueries({ queryKey: ['sessions'] })
  }, [queryClient])

  const selectedTerminal: Terminal | undefined = React.useMemo(() =>
    allTerminals.find(terminal => terminal.id === selectedTerminalId),
  [allTerminals, selectedTerminalId])

  const terminalPlaceholderMessage = isSessionsFetching
    ? 'Loading terminals…'
    : allTerminals.length === 0
      ? 'No terminals yet. Launch an agent to get started.'
      : 'Select a terminal to view output'

  const sessionsLayout = (
    <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sessions</h2>
          <button
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            onClick={() => setShowLaunchPanel(true)}
          >
            Launch Agent
          </button>
        </div>
        <SessionList
          sessions={sessions}
          selectedTerminalId={selectedTerminalId}
          onTerminalSelect={handleTerminalSelect}
        />
      </div>

      <div className="space-y-4">
        <TerminalTabs
          sessions={sessions}
          selectedTerminalId={selectedTerminalId}
          onTerminalSelect={handleTerminalSelect}
          onTerminalClose={handleTerminalClose}
          onTerminalAdd={handleTerminalAdd}
        />
        {selectedTerminalId ? (
          <TerminalViewer
            key={selectedTerminalId}
            terminalId={selectedTerminalId}
            onClose={() => setSelectedTerminalId(null)}
          />
        ) : (
          <div className="flex h-full min-h-[480px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            {terminalPlaceholderMessage}
          </div>
        )}
      </div>
    </div>
  )

  // Keyboard shortcuts
  useKeyboard('k', () => setCommandPaletteOpen(true), { ctrl: true })
  useKeyboard('i', () => setShowInbox(prev => !prev), { ctrl: true })
  useKeyboard('b', () => setIsCompactMode(prev => !prev), { ctrl: true })

  return (
    <div
      className={cn(
        'min-h-screen bg-background text-foreground transition-colors duration-300',
        isCompactMode && 'compact-mode'
      )}
      data-theme={theme}
    >
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <h1 className="text-lg font-semibold">CLI Agent Orchestrator</h1>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              {/* Search bar could go here */}
            </div>
            <nav className="flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={() => setShowInbox(!showInbox)}
                className={cn(
                  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                  'hover:bg-accent hover:text-accent-foreground h-10 w-10'
                )}
              >
                Inbox
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container relative">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Dashboard sessions={sessions} />} />

          <Route
            path="/sessions"
            element={sessionsLayout}
          />
          <Route
            path="/sessions/:sessionId"
            element={sessionsLayout}
          />

          <Route
            path="/flows"
            element={
              <FlowViewer
                onCreateFlow={() => {
                  console.log('Create flow clicked')
                }}
              />
            }
          />
          <Route
            path="/flows/:flowId"
            element={
              <FlowViewer
                onCreateFlow={() => {
                  console.log('Create flow clicked')
                }}
              />
            }
          />
        </Routes>
      </main>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Inbox Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-14 h-[calc(100vh-3.5rem)] w-80 border-l bg-background/95 backdrop-blur transform transition-transform duration-300 ease-in-out z-30',
          showInbox ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="h-full overflow-y-auto p-4">
          <InboxViewer
            terminalId={selectedTerminal?.id}
            className="h-full"
          />
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <button
        className="fixed bottom-6 right-6 z-50 md:hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <span className="sr-only">Open command palette</span>
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {showLaunchPanel && (
        <ControlPanel
          onClose={() => setShowLaunchPanel(false)}
          onSuccess={handleLaunchSuccess}
        />
      )}
    </div>
  )
}

function App() {
  return <AppContent />
}

export default App
