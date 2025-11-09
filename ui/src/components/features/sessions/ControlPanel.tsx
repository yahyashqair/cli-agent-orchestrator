import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Play, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { api } from '@/api/client'
import { AGENT_PROFILE_OPTIONS, DEFAULT_PROVIDER, PROVIDER_OPTIONS } from '@/constants/providers'

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
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Launch New Agent</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {recentConfigs.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <History className="h-4 w-4 mr-2" />
                Recent Configurations
              </label>
              <Select onValueChange={(value) => {
                const config = recentConfigs[parseInt(value)]
                if (config) loadRecentConfig(config)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a recent configuration..." />
                </SelectTrigger>
                <SelectContent>
                  {recentConfigs.map((config, index) => {
                    const providerLabel = PROVIDER_OPTIONS.find(p => p.value === config.provider)?.label || config.provider
                    const profileLabel = AGENT_PROFILE_OPTIONS.find(p => p.value === config.agentProfile)?.label || config.agentProfile
                    return (
                      <SelectItem key={index} value={index.toString()}>
                        {providerLabel} - {profileLabel}
                        {config.workingDirectory && ` (${config.workingDirectory})`}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Agent Profile</label>
            <Select value={agentProfile} onValueChange={handleAgentProfileChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_PROFILE_OPTIONS.map((profile) => (
                  <SelectItem key={profile.value} value={profile.value}>
                    <div>
                      <div>{profile.label}</div>
                      <div className="text-xs text-muted-foreground">{profile.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Working Directory <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              value={workingDirectory}
              onChange={(e) => setWorkingDirectory(e.target.value)}
              placeholder="Current directory if empty"
            />
          </div>

          {shouldShowFullPermissions && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fullPermissions"
                  checked={fullPermissions}
                  onChange={(e) => setFullPermissions(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="fullPermissions" className="text-sm font-medium">
                  Enable full permissions
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Skips Claude permission prompts by launching with --dangerously-skip-permissions.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createNewSession"
                checked={createNewSession}
                onChange={(e) => setCreateNewSession(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="createNewSession" className="text-sm font-medium">
                Create new session
              </label>
            </div>
          </div>

          {createNewSession && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Session Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>
          )}

          {!createNewSession && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Attach to Session</label>
              <Select
                value={selectedSession}
                onValueChange={setSelectedSession}
                disabled={isSessionsLoading || attachableSessions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isSessionsLoading ? 'Loading sessions…' : 'Select a session'} />
                </SelectTrigger>
                <SelectContent>
                  {attachableSessions.map((session) => (
                    <SelectItem key={session.name} value={session.name}>
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {attachableSessions.length === 0 && !isSessionsLoading && (
                <p className="text-xs text-muted-foreground">No existing sessions found. Create a new session first.</p>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={disableLaunch}
            >
              <Play className="h-4 w-4 mr-2" />
              {createSessionMutation.isPending ? 'Launching...' : 'Launch Agent'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
