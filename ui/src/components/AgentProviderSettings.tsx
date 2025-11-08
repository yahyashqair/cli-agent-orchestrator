import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCcw, X } from 'lucide-react'
import { api } from '../api/client'
import { AGENT_PROFILE_OPTIONS, DEFAULT_PROVIDER, PROVIDER_OPTIONS } from '../constants/providers'
import type { AgentProviderConfig } from '../types'
import './AgentProviderSettings.css'

interface AgentProviderSettingsProps {
  onClose: () => void
}

type Feedback = {
  type: 'success' | 'error'
  message: string
}

export default function AgentProviderSettings({ onClose }: AgentProviderSettingsProps) {
  const queryClient = useQueryClient()
  const { data: configs = [], isLoading, isError, error } = useQuery({
    queryKey: ['agent-provider-configs'],
    queryFn: api.listAgentProviderConfigs,
  })

  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, Feedback | undefined>>({})

  const overridesMap = useMemo(() => {
    const map: Record<string, AgentProviderConfig['provider']> = {}
    for (const config of configs) {
      map[config.agent_profile] = config.provider
    }
    return map
  }, [configs])

  useEffect(() => {
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

  const renderRow = (profileValue: string, label: string, description?: string) => {
    const selected = formValues[profileValue] ?? DEFAULT_PROVIDER
    const configured = overridesMap[profileValue]
    const hasOverride = typeof configured !== 'undefined'
    const isSaving = upsertMutation.isPending && savingProfile === profileValue
    const isResetting = deleteMutation.isPending && resettingProfile === profileValue
    const canReset = hasOverride && !isResetting
    const isDirty = selected !== (configured ?? DEFAULT_PROVIDER)

    const rowFeedback = feedback[profileValue]

    return (
      <div key={profileValue} className="provider-row frosted-card">
        <div className="provider-row-header">
          <div>
            <div className="provider-row-label">{label}</div>
            {description && <div className="provider-row-description">{description}</div>}
          </div>
          <div className="provider-row-status">
            {hasOverride ? <span className="status-pill status-pill-active">Override</span> : (
              <span className="status-pill">Default</span>
            )}
          </div>
        </div>
        <div className="provider-row-controls">
          <select
            className="form-control"
            value={selected}
            onChange={(e) => handleProviderChange(profileValue, e.target.value)}
          >
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="provider-row-actions">
            <button
              className="btn btn-primary"
              type="button"
              disabled={!isDirty || isSaving}
              onClick={() =>
                upsertMutation.mutate({ agentProfile: profileValue, provider: selected })
              }
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={!canReset}
              onClick={() => deleteMutation.mutate(profileValue)}
            >
              {isResetting && resettingProfile === profileValue ? (
                <>
                  <RefreshCcw size={14} className="spin" />
                  Resetting…
                </>
              ) : (
                'Reset'
              )}
            </button>
          </div>
        </div>
        {rowFeedback && (
          <div className={`provider-row-feedback ${rowFeedback.type}`}>
            {rowFeedback.message}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="provider-settings-overlay" onClick={onClose}>
      <div className="provider-settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="provider-settings-header">
          <div>
            <h2>Agent Provider Settings</h2>
            <p>
              Choose the default CLI provider for each agent profile. Overrides take precedence over
              profile metadata and session inheritance. Agents fall back to Amazon Q when no override
              exists.
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        {isLoading && <div className="provider-settings-loading">Loading overrides…</div>}
        {isError && (
          <div className="provider-settings-error">
            {(error instanceof Error ? error.message : 'Failed to load provider overrides.')}
          </div>
        )}

        <div className="provider-settings-list">
          {AGENT_PROFILE_OPTIONS.map((profile) =>
            renderRow(profile.value, profile.label, profile.description)
          )}
        </div>
      </div>
    </div>
  )
}
