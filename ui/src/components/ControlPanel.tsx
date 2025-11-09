import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Play, History } from 'lucide-react'
import { api } from '../api/client'
import { AGENT_PROFILE_OPTIONS, DEFAULT_PROVIDER, PROVIDER_OPTIONS } from '../constants/providers'
import './ControlPanel.css'

interface ControlPanelProps {
  onClose: () => void
  onSuccess: () => void
}

interface RecentConfig {
  provider: string
  agentProfile: string
  workingDirectory: string
  sessionName: string
  createNewSession: boolean
  timestamp: number
  fullPermissions?: boolean
}

const RECENT_CONFIGS_KEY = 'cao-recent-configs'
const MAX_RECENT_CONFIGS = 5

export default function ControlPanel({ onClose, onSuccess }: ControlPanelProps) {
  const [provider, setProvider] = useState(DEFAULT_PROVIDER)
  const [agentProfile, setAgentProfile] = useState('developer')
  const [sessionName, setSessionName] = useState('')
  const [workingDirectory, setWorkingDirectory] = useState('')
  const [createNewSession, setCreateNewSession] = useState(true)
  const [selectedSession, setSelectedSession] = useState('')
  const [fullPermissions, setFullPermissions] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [providerManuallySet, setProviderManuallySet] = useState(false)
  const [recentConfigs, setRecentConfigs] = useState<RecentConfig[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_CONFIGS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const queryClient = useQueryClient()
  const shouldShowFullPermissions = provider === 'claude_code'

  // Save configuration to recent configs
  const saveRecentConfig = () => {
    const configFullPermissions = shouldShowFullPermissions ? fullPermissions : false
    const config: RecentConfig = {
      provider,
      agentProfile,
      workingDirectory,
      sessionName,
      createNewSession,
      timestamp: Date.now(),
      fullPermissions: configFullPermissions,
    }

    const updated = [
      config,
      ...recentConfigs.filter(c =>
        c.provider !== provider ||
        c.agentProfile !== agentProfile ||
        c.workingDirectory !== workingDirectory ||
        (c.fullPermissions ?? false) !== configFullPermissions
      )
    ].slice(0, MAX_RECENT_CONFIGS)

    setRecentConfigs(updated)
    localStorage.setItem(RECENT_CONFIGS_KEY, JSON.stringify(updated))
  }

  // Load configuration from recent config
  const providerConfigsQuery = useQuery({
    queryKey: ['agent-provider-configs'],
    queryFn: api.listAgentProviderConfigs,
    staleTime: 30_000,
  })

  const providerOverrideMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const config of providerConfigsQuery.data ?? []) {
      map[config.agent_profile] = config.provider
    }
    return map
  }, [providerConfigsQuery.data])

  const handleAgentProfileChange = useCallback(
    (nextProfile: string, applyOverride: boolean = true) => {
      setAgentProfile(nextProfile)
      if (applyOverride) {
        const override = providerOverrideMap[nextProfile]
        const fallbackProvider = override ?? DEFAULT_PROVIDER
        setProvider(fallbackProvider)
        setProviderManuallySet(false)
      }
    },
    [providerOverrideMap]
  )

  const loadRecentConfig = (config: RecentConfig) => {
    setProvider(config.provider)
    setProviderManuallySet(true)
    handleAgentProfileChange(config.agentProfile, false)
    setWorkingDirectory(config.workingDirectory)
    setSessionName(config.sessionName)
    setCreateNewSession(config.createNewSession)
    setFullPermissions(config.fullPermissions ?? false)
  }

  const { data: sessions = [], isPending: isSessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: api.listSessions,
    staleTime: 5_000,
  })

  const attachableSessions = useMemo(() => {
    return sessions.filter((session) => {
      const terminals = session.terminals ?? []
      // Allow attaching even if the session is empty so we can populate it,
      // but only show sessions that originate from this orchestrator prefix.
      return session.name.includes('cao-') && terminals.length >= 0
    })
  }, [sessions])

  useEffect(() => {
    if (!createNewSession) {
      setErrorMessage('')
      if (!selectedSession && attachableSessions.length > 0) {
        setSelectedSession(attachableSessions[0].name)
      }
    }
  }, [createNewSession, attachableSessions, selectedSession])

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage('')
      const launchFullPermissions = shouldShowFullPermissions ? fullPermissions : false

      if (createNewSession) {
        return api.createSession(
          provider,
          agentProfile,
          sessionName || undefined,
          workingDirectory || undefined,
          launchFullPermissions
        )
      }

      if (!selectedSession) {
        throw new Error('Please select a session to attach the agent to.')
      }

      return api.createTerminal(
        selectedSession,
        provider,
        agentProfile,
        workingDirectory || undefined,
        launchFullPermissions
      )
    },
    onSuccess: () => {
      saveRecentConfig()
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ predicate: ({ queryKey }) => queryKey[0] === 'terminal' })
      onSuccess()
    },
    onError: (error) => {
      const message =
        (error instanceof Error && error.message) ||
        'Failed to launch agent. Please try again.'
      setErrorMessage(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createSessionMutation.mutate()
  }

  useEffect(() => {
    if (providerManuallySet) {
      return
    }

    const override = providerOverrideMap[agentProfile]
    const desiredProvider = override ?? DEFAULT_PROVIDER
    if (desiredProvider !== provider) {
      setProvider(desiredProvider)
    }
  }, [agentProfile, providerOverrideMap, provider, providerManuallySet])

  const disableLaunch = createSessionMutation.isPending || (!createNewSession && !selectedSession)

  const handleProviderChange = (value: string) => {
    setProvider(value)
    setProviderManuallySet(true)
  }

  return (
    <div className="control-panel-overlay" onClick={onClose}>
      <div className="control-panel" onClick={(e) => e.stopPropagation()}>
        <div className="control-panel-header">
          <h2>Launch New Agent</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="control-panel-form">
          {recentConfigs.length > 0 && (
            <div className="form-group">
              <label htmlFor="recentConfig">
                <History size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Recent Configurations
              </label>
              <select
                id="recentConfig"
                className="form-control"
                onChange={(e) => {
                  const config = recentConfigs[parseInt(e.target.value)]
                  if (config) loadRecentConfig(config)
                }}
                value=""
              >
                <option value="">Select a recent configuration...</option>
                {recentConfigs.map((config, index) => {
                  const providerLabel = PROVIDER_OPTIONS.find(p => p.value === config.provider)?.label || config.provider
                  const profileLabel = AGENT_PROFILE_OPTIONS.find(p => p.value === config.agentProfile)?.label || config.agentProfile
                  return (
                    <option key={index} value={index}>
                      {providerLabel} - {profileLabel}
                      {config.workingDirectory && ` (${config.workingDirectory})`}
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="form-control"
            >
              {PROVIDER_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="agentProfile">Agent Profile</label>
            <select
              id="agentProfile"
              value={agentProfile}
              onChange={(e) => handleAgentProfileChange(e.target.value)}
              className="form-control"
            >
              {AGENT_PROFILE_OPTIONS.map((profile) => (
                <option key={profile.value} value={profile.value}>
                  {profile.label} - {profile.description}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="workingDirectory">
              Working Directory <span className="optional">(optional)</span>
            </label>
            <input
              id="workingDirectory"
              type="text"
              value={workingDirectory}
              onChange={(e) => setWorkingDirectory(e.target.value)}
              placeholder="Current directory if empty"
              className="form-control"
            />
          </div>

          {shouldShowFullPermissions && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={fullPermissions}
                  onChange={(e) => setFullPermissions(e.target.checked)}
                />
                Enable full permissions
              </label>
              <p className="helper-text">
                Skips Claude permission prompts by launching with --dangerously-skip-permissions.
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={createNewSession}
                onChange={(e) => setCreateNewSession(e.target.checked)}
              />
              Create new session
            </label>
          </div>

          {createNewSession && (
            <div className="form-group">
              <label htmlFor="sessionName">
                Session Name <span className="optional">(optional)</span>
              </label>
              <input
                id="sessionName"
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Auto-generated if empty"
                className="form-control"
              />
            </div>
          )}

          {!createNewSession && (
            <div className="form-group">
              <label htmlFor="existingSession">Attach to Session</label>
              <select
                id="existingSession"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="form-control"
                disabled={isSessionsLoading || attachableSessions.length === 0}
              >
                <option value="" disabled>
                  {isSessionsLoading ? 'Loading sessions…' : 'Select a session'}
                </option>
                {attachableSessions.map((session) => (
                  <option key={session.name} value={session.name}>
                    {session.name}
                  </option>
                ))}
              </select>
              {attachableSessions.length === 0 && !isSessionsLoading && (
                <p className="helper-text">No existing sessions found. Create a new session first.</p>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="error-message">{errorMessage}</div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={disableLaunch}
            >
              <Play size={16} />
              {createSessionMutation.isPending ? 'Launching...' : 'Launch Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
