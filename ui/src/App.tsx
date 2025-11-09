import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose } from 'lucide-react'
import { api } from './api/client'
import Dashboard, { AgentStatusPanel } from './components/Dashboard'
import SessionList from './components/SessionList'
import ArchivedSessionList from './components/ArchivedSessionList'
import TerminalViewer from './components/TerminalViewer'
import TerminalTabs from './components/TerminalTabs'
import ControlPanel from './components/ControlPanel'
import FlowViewer from './components/FlowViewer'
import FlowEditor from './components/FlowEditor'
import ThemeToggle from './components/ThemeToggle'
import AgentProviderSettings from './components/AgentProviderSettings'
import CommandPalette, { useCommandPalette } from './components/CommandPalette'
import { THEMES, type Theme } from './types'
import './App.css'

const STORAGE_KEY = 'cao-ui-theme'
const PANEL_STATE_KEY = 'cao-ui-panel-states'
const COMPACT_MODE_KEY = 'cao-ui-compact-mode'
const THEME_CLASS_NAMES = THEMES.map((value) => `theme-${value}`)
const isTheme = (value: string | null): value is Theme =>
  value !== null && THEMES.includes(value as Theme)

function App() {
  const [hasUserSelectedTheme, setHasUserSelectedTheme] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isTheme(stored)
  })

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isTheme(stored)) {
      return stored
    }
    const prefersLight = window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: light)').matches
      : false
    return prefersLight ? 'light' : 'dark'
  })
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(null)
  const [terminalFocusKey, setTerminalFocusKey] = useState(0)
  const [showControlPanel, setShowControlPanel] = useState(false)
  const [showProviderSettings, setShowProviderSettings] = useState(false)
  const [activeView, setActiveView] = useState<'sessions' | 'flows'>('sessions')
  const [showFlowEditor, setShowFlowEditor] = useState(false)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem(PANEL_STATE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return parsed.leftPanelCollapsed ?? false
      } catch {
        return false
      }
    }
    return false
  })
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem(PANEL_STATE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return parsed.rightPanelCollapsed ?? false
      } catch {
        return false
      }
    }
    return false
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [compactMode, setCompactMode] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem(COMPACT_MODE_KEY)
    return stored === 'true'
  })
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  const handleThemeChange = (nextTheme: Theme) => {
    setHasUserSelectedTheme(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    }
    setTheme(nextTheme)
  }

  const { data: sessions, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: api.listSessions,
  })

  const { data: archivedSessions = [] } = useQuery({
    queryKey: ['archived-sessions'],
    queryFn: api.listArchivedSessions,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.remove(...THEME_CLASS_NAMES)
    const themeClass = `theme-${theme}`
    root.classList.add(themeClass)
    root.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')

    const handleChange = (event: MediaQueryListEvent) => {
      if (!hasUserSelectedTheme) {
        setTheme(event.matches ? 'light' : 'dark')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [hasUserSelectedTheme])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K to open command palette
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
        return
      }
      // Esc to exit fullscreen (only if command palette is not open)
      if (e.key === 'Escape' && isFullscreen && !showCommandPalette) {
        setIsFullscreen(false)
        e.preventDefault()
      }
      // Ctrl+Shift+F to toggle fullscreen
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        setIsFullscreen(!isFullscreen)
        e.preventDefault()
      }
      // Ctrl+Shift+C to toggle compact mode
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        setCompactMode(!compactMode)
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, compactMode, showCommandPalette])

  // Persist panel states to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      PANEL_STATE_KEY,
      JSON.stringify({
        leftPanelCollapsed,
        rightPanelCollapsed
      })
    )
  }, [leftPanelCollapsed, rightPanelCollapsed])

  // Persist compact mode to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(COMPACT_MODE_KEY, compactMode.toString())
  }, [compactMode])

  const withAppShell = (children: ReactNode) => (
    <div className="app-shell">
      <div className="app-background" aria-hidden="true">
        <span className="orb orb-primary" />
        <span className="orb orb-accent" />
        <span className="orb orb-contrast" />
      </div>
      <div className="app-surface">
        <div className="app">{children}</div>
      </div>
    </div>
  )

  if (!sessions) {
    return withAppShell(
      <>
        <header className="app-header">
          <div className="app-title">
            <img
              src="/icons/icon-192.png"
              alt="CLI Agent Orchestrator logo"
              className="app-logo"
              width={40}
              height={40}
            />
            <h1>CLI Agent Orchestrator</h1>
          </div>
          <div className="header-actions">
            <ThemeToggle theme={theme} onThemeChange={handleThemeChange} />
          </div>
        </header>
        <div className="loading-state">Loading sessions…</div>
      </>
    )
  }

  const safeSessions = Array.isArray(sessions) ? sessions : []

  const handleTerminalSelect = (id: string) => {
    if (!id) {
      setSelectedTerminalId(null)
      return
    }

    setTerminalFocusKey((key) => key + 1)
    setSelectedTerminalId((prev) => (prev === id ? prev : id))
  }

  const commands = useCommandPalette(
    isFullscreen,
    compactMode,
    leftPanelCollapsed,
    rightPanelCollapsed,
    () => setIsFullscreen(!isFullscreen),
    () => setCompactMode(!compactMode),
    () => setLeftPanelCollapsed(!leftPanelCollapsed),
    () => setRightPanelCollapsed(!rightPanelCollapsed),
    () => setShowControlPanel(true),
    () => setShowProviderSettings(true),
    () => setActiveView('flows'),
    () => setActiveView('sessions')
  )

  return withAppShell(
    <>
      {!isFullscreen && (
        <>
          <header className="app-header">
            <div className="app-title">
              <img
                src="/icons/icon-192.png"
                alt="CLI Agent Orchestrator logo"
                className="app-logo"
                width={40}
                height={40}
              />
              <h1>CLI Agent Orchestrator</h1>
            </div>
            <div className="header-actions">
              <ThemeToggle theme={theme} onThemeChange={handleThemeChange} />
              <button
                className="btn btn-secondary"
                onClick={() => setShowProviderSettings(true)}
              >
                Agent Providers
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowControlPanel(!showControlPanel)}
              >
                {showControlPanel ? 'Hide Control Panel' : 'Launch Agent'}
              </button>
            </div>
          </header>

          <div className="app-navigation">
            <nav className="nav-tabs" aria-label="Primary">
              <button
                className={`nav-tab ${activeView === 'sessions' ? 'nav-tab-active' : ''}`}
                onClick={() => setActiveView('sessions')}
              >
                Sessions
              </button>
              <button
                className={`nav-tab ${activeView === 'flows' ? 'nav-tab-active' : ''}`}
                onClick={() => setActiveView('flows')}
              >
                Flows
              </button>
            </nav>
          </div>
        </>
      )}

      {showControlPanel && (
        <ControlPanel
          onClose={() => setShowControlPanel(false)}
          onSuccess={() => {
            refetch()
            setShowControlPanel(false)
          }}
        />
      )}

      {showProviderSettings && (
        <AgentProviderSettings onClose={() => setShowProviderSettings(false)} />
      )}

      <div className={`app-content ${compactMode ? 'compact-mode' : ''} ${isFullscreen ? 'fullscreen-mode' : ''}`}>
        {activeView === 'sessions' ? (
          <>
            {!isFullscreen && (
              <aside className={`sidebar glass-panel ${leftPanelCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-scrollable-content">
                  <Dashboard sessions={safeSessions} />
                  <AgentStatusPanel sessions={safeSessions} />
                </div>
                <ArchivedSessionList sessions={archivedSessions} />
              </aside>
            )}

            <main className="main-content">
              <div className="session-terminal-layout">
                {!isFullscreen && !leftPanelCollapsed && (
                  <button
                    className="panel-toggle panel-toggle-left"
                    onClick={() => setLeftPanelCollapsed(true)}
                    title="Collapse left panel"
                  >
                    <PanelLeftClose size={18} />
                  </button>
                )}
                {!isFullscreen && leftPanelCollapsed && (
                  <button
                    className="panel-toggle panel-toggle-left-expand"
                    onClick={() => setLeftPanelCollapsed(false)}
                    title="Expand left panel"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
                <div className={`terminal-column glass-panel ${isFullscreen ? 'fullscreen' : ''}`}>
                  {!isFullscreen && (() => {
                    const totalTerminals = safeSessions.reduce((count, session) => count + session.terminals.length, 0)
                    return totalTerminals > 1 && (
                      <TerminalTabs
                        sessions={safeSessions}
                        selectedTerminalId={selectedTerminalId}
                        onTerminalSelect={handleTerminalSelect}
                        onTerminalClose={(id) => {
                          if (id === selectedTerminalId) {
                            setSelectedTerminalId(null)
                          }
                        }}
                      />
                    )
                  })()}
                  {selectedTerminalId ? (
                    <TerminalViewer
                      terminalId={selectedTerminalId}
                      focusTrigger={terminalFocusKey}
                      onClose={() => setSelectedTerminalId(null)}
                      isFullscreen={isFullscreen}
                      onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                    />
                  ) : (
                    <div className="empty-state frosted-card">
                      <h2>Select a terminal to view</h2>
                      <p>Choose a terminal from the sessions list to monitor its output</p>
                    </div>
                  )}
                </div>
                {!isFullscreen && !rightPanelCollapsed && (
                  <button
                    className="panel-toggle panel-toggle-right"
                    onClick={() => setRightPanelCollapsed(true)}
                    title="Collapse right panel"
                  >
                    <PanelRightClose size={18} />
                  </button>
                )}
                {!isFullscreen && rightPanelCollapsed && (
                  <button
                    className="panel-toggle panel-toggle-right-expand"
                    onClick={() => setRightPanelCollapsed(false)}
                    title="Expand right panel"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {!isFullscreen && (
                  <div className={`session-column glass-panel ${rightPanelCollapsed ? 'collapsed' : ''}`}>
                    <SessionList
                      sessions={safeSessions}
                      selectedTerminalId={selectedTerminalId}
                      onTerminalSelect={handleTerminalSelect}
                    />
                  </div>
                )}
              </div>
            </main>
          </>
        ) : (
          <main className="main-content flows-view glass-panel">
            <FlowViewer onCreateFlow={() => setShowFlowEditor(true)} />
          </main>
        )}
      </div>

      {showFlowEditor && (
        <FlowEditor
          onClose={() => setShowFlowEditor(false)}
          onSuccess={() => {
            setShowFlowEditor(false)
          }}
        />
      )}

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />
    </>
  )
}

export default App
