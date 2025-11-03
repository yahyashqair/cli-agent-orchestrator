import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './api/client'
import Dashboard from './components/Dashboard'
import SessionList from './components/SessionList'
import TerminalViewer from './components/TerminalViewer'
import ControlPanel from './components/ControlPanel'
import ThemeToggle from './components/ThemeToggle'
import type { Theme } from './types'
import './App.css'

const STORAGE_KEY = 'cao-ui-theme'

function App() {
  const [hasUserSelectedTheme, setHasUserSelectedTheme] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark'
  })

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
    const prefersLight = window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: light)').matches
      : false
    return prefersLight ? 'light' : 'dark'
  })
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(null)
  const [showControlPanel, setShowControlPanel] = useState(false)

  const handleThemeChange = (nextTheme: Theme) => {
    setHasUserSelectedTheme(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    }
    setTheme(nextTheme)
  }

  const { data: sessions = [], refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: api.listSessions,
  })

  if (!sessions) {
    return (
      <div className="app">
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
      </div>
    )
  }

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark')
    const themeClass = theme === 'light' ? 'theme-light' : 'theme-dark'
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

  return (
    <div className="app">
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
            className="btn btn-primary"
            onClick={() => setShowControlPanel(!showControlPanel)}
          >
            {showControlPanel ? 'Hide Control Panel' : 'Launch Agent'}
          </button>
        </div>
      </header>

      {showControlPanel && (
        <ControlPanel
          onClose={() => setShowControlPanel(false)}
          onSuccess={() => {
            refetch()
            setShowControlPanel(false)
          }}
        />
      )}

      <div className="app-content">
        <aside className="sidebar">
          <Dashboard sessions={sessions} />
          <SessionList
            sessions={sessions}
            selectedTerminalId={selectedTerminalId}
            onTerminalSelect={setSelectedTerminalId}
          />
        </aside>

        <main className="main-content">
          {selectedTerminalId ? (
            <TerminalViewer
              terminalId={selectedTerminalId}
              onClose={() => setSelectedTerminalId(null)}
            />
          ) : (
            <div className="empty-state">
              <h2>Select a terminal to view</h2>
              <p>Choose a terminal from the sidebar to monitor its output</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
