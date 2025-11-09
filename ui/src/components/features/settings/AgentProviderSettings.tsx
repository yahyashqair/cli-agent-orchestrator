import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  CheckCircle,
  RefreshCcw,
  Settings,
  Terminal,
  Code,
  Eye,
  User,
  Info,
  Loader2
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { AGENT_PROFILE_OPTIONS, DEFAULT_PROVIDER, PROVIDER_OPTIONS } from '@/constants/providers'
import type { AgentProviderConfig } from '@/types'

interface AgentProviderSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Feedback = {
  type: 'success' | 'error'
  message: string
}

export function AgentProviderSettings({ open, onOpenChange }: AgentProviderSettingsProps) {
  const queryClient = useQueryClient()
  const { data: configs = [], isLoading, isError, error } = useQuery({
    queryKey: ['agent-provider-configs'],
    queryFn: api.listAgentProviderConfigs,
  })

  const [formValues, setFormValues] = React.useState<Record<string, string>>({})
  const [feedback, setFeedback] = React.useState<Record<string, Feedback | undefined>>({})

  const overridesMap = React.useMemo(() => {
    const map: Record<string, AgentProviderConfig['provider']> = {}
    for (const config of configs) {
      map[config.agent_profile] = config.provider
    }
    return map
  }, [configs])

  React.useEffect(() => {
    const mapped: Record<string, string> = {}
    for (const option of AGENT_PROFILE_OPTIONS) {
      mapped[option.value] = overridesMap[option.value] ?? DEFAULT_PROVIDER
    }
    setFormValues(mapped)
  }, [overridesMap])

  const setRowFeedback = (agentProfile: string, value?: Feedback) => {
    setFeedback((prev) => ({ ...prev, [agentProfile]: value }))
  }

  const upsertMutation = useMutation({
    mutationFn: ({ agentProfile, provider }: { agentProfile: string; provider: string }) =>
      api.upsertAgentProviderConfig(agentProfile, provider),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-provider-configs'] })
      setRowFeedback(variables.agentProfile, {
        type: 'success',
        message: 'Provider override saved.',
      })
    },
    onError: (err: unknown, variables) => {
      const message = err instanceof Error ? err.message : 'Failed to save override.'
      setRowFeedback(variables.agentProfile, { type: 'error', message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (agentProfile: string) => api.deleteAgentProviderConfig(agentProfile),
    onSuccess: (_data, agentProfile) => {
      queryClient.invalidateQueries({ queryKey: ['agent-provider-configs'] })
      setRowFeedback(agentProfile, {
        type: 'success',
        message: 'Provider reset to default.',
      })
    },
    onError: (err: unknown, agentProfile) => {
      const message = err instanceof Error ? err.message : 'Failed to reset provider.'
      setRowFeedback(agentProfile, { type: 'error', message })
    },
  })

  const savingProfile = upsertMutation.variables?.agentProfile
  const resettingProfile = deleteMutation.variables

  const handleProviderChange = (agentProfile: string, provider: string) => {
    setFormValues((prev) => ({ ...prev, [agentProfile]: provider }))
    setRowFeedback(agentProfile, undefined)
  }

  const getProfileIcon = (profileValue: string) => {
    switch (profileValue) {
      case 'code_supervisor':
        return <Eye className="h-5 w-5" />
      case 'developer':
        return <Code className="h-5 w-5" />
      case 'reviewer':
        return <Eye className="h-5 w-5" />
      default:
        return <User className="h-5 w-5" />
    }
  }

  const renderProfileRow = (profileValue: string, label: string, description?: string) => {
    const selected = formValues[profileValue] ?? DEFAULT_PROVIDER
    const configured = overridesMap[profileValue]
    const hasOverride = typeof configured !== 'undefined'
    const isSaving = upsertMutation.isPending && savingProfile === profileValue
    const isResetting = deleteMutation.isPending && resettingProfile === profileValue
    const canReset = hasOverride && !isResetting
    const isDirty = selected !== (configured ?? DEFAULT_PROVIDER)
    const rowFeedback = feedback[profileValue]

    return (
      <Card key={profileValue} className={hasOverride ? 'border-primary' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted rounded-lg">
                {getProfileIcon(profileValue)}
              </div>
              <div>
                <CardTitle className="text-base">{label}</CardTitle>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
            </div>
            <Badge variant={hasOverride ? 'default' : 'secondary'}>
              {hasOverride ? 'Override' : 'Default'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Select
                value={selected}
                onValueChange={(value) => handleProviderChange(profileValue, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                disabled={!isDirty || isSaving}
                onClick={() =>
                  upsertMutation.mutate({ agentProfile: profileValue, provider: selected })
                }
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!canReset}
                onClick={() => deleteMutation.mutate(profileValue)}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Reset
                  </>
                )}
              </Button>
            </div>
          </div>

          {rowFeedback && (
            <div className={`flex items-center space-x-2 p-3 rounded-md ${
              rowFeedback.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {rowFeedback.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{rowFeedback.message}</span>
            </div>
          )}

          {hasOverride && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <Info className="h-3 w-3" />
              <span>
                Override active: {PROVIDER_OPTIONS.find(p => p.value === configured)?.label}
                {' '}→ {PROVIDER_OPTIONS.find(p => p.value === selected)?.label}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Agent Provider Settings</span>
          </DialogTitle>
          <DialogDescription>
            Choose the default CLI provider for each agent profile. Overrides take precedence over
            profile metadata and session inheritance. Agents fall back to Amazon Q when no override
            exists.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Default Provider Info */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Terminal className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Default Provider</p>
                  <p className="text-sm text-muted-foreground">
                    {PROVIDER_OPTIONS.find(p => p.value === DEFAULT_PROVIDER)?.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading provider configurations...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {isError && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {error instanceof Error ? error.message : 'Failed to load provider overrides.'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Provider Configuration List */}
          {!isLoading && !isError && (
            <div className="space-y-4">
              {AGENT_PROFILE_OPTIONS.map((profile) =>
                renderProfileRow(profile.value, profile.label, profile.description)
              )}
            </div>
          )}

          {/* Info Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Info className="h-4 w-4 mr-2" />
                About Provider Overrides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                  <p>Provider overrides take precedence over all other configuration methods</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                  <p>When no override exists, agents use the default provider (Amazon Q)</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                  <p>Changes apply to new agent sessions only</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                  <p>Reset removes the override and restores default behavior</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
