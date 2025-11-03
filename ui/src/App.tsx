import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from './api/client'
import Dashboard from './components/Dashboard'
import SessionList from './components/SessionList'
import TerminalViewer from './components/TerminalViewer'
import ControlPanel from './components/ControlPanel'
import './App.css'

function App() {
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(null)
  const [showControlPanel, setShowControlPanel] = useState(false)

  const { data: sessions = [], refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: api.listSessions,
  })

  if (!sessions) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>CLI Agent Orchestrator</h1>
        </header>
        <div className="loading-state">Loading sessions…</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>CLI Agent Orchestrator</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowControlPanel(!showControlPanel)}
        >
          {showControlPanel ? 'Hide Control Panel' : 'Launch Agent'}
        </button>
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
