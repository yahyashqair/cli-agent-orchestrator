import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  AlertCircle,
  Info,
  Save,
  Download,
  GitBranch,
  Terminal,
  Settings,
  Calendar
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

interface FlowEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  flowId?: string
}

interface FlowConfig {
  name: string
  schedule: string
  agentProfile: string
  provider: string
  script?: string
  description?: string
  prompt?: string
}

const COMMON_SCHEDULES = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Daily at 5 PM', value: '0 17 * * *' },
  { label: 'Weekly on Sunday', value: '0 0 * * 0' },
  { label: 'Monthly on 1st', value: '0 0 1 * *' },
  { label: 'Weekdays at 9 AM', value: '0 9 * * 1-5' },
]

const AGENT_PROFILES = [
  { label: 'Developer', value: 'developer' },
  { label: 'Reviewer', value: 'reviewer' },
  { label: 'Code Supervisor', value: 'code_supervisor' },
  { label: 'Analyst', value: 'analyst' },
]

const PROVIDERS = [
  { label: 'Q CLI', value: 'q_cli' },
  { label: 'Claude Code', value: 'claude_code' },
  { label: 'Codex CLI', value: 'codex_cli' },
  { label: 'Copilot CLI', value: 'copilot_cli' },
  { label: 'OpenCode', value: 'opencode' },
]

export function FlowEditor({ open, onOpenChange, onSuccess }: FlowEditorProps) {
  const [filePath, setFilePath] = React.useState('')
  const [customSchedule, setCustomSchedule] = React.useState('')
  const [selectedSchedule, setSelectedSchedule] = React.useState('0 0 * * *')
  const [useCustomSchedule, setUseCustomSchedule] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState('')
  const [config, setConfig] = React.useState<FlowConfig>({
    name: '',
    schedule: '0 0 * * *',
    agentProfile: 'developer',
    provider: 'q_cli',
    description: '',
    prompt: '',
    script: '',
  })

  const queryClient = useQueryClient()

  const createFlowMutation = useMutation({
    mutationFn: api.addFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      setErrorMessage('')
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      const message =
        (error instanceof Error && error.message) ||
        'Failed to create flow. Please check the file path and try again.'
      setErrorMessage(message)
    },
  })

  const handleScheduleChange = (value: string) => {
    if (COMMON_SCHEDULES.some(s => s.value === value)) {
      setSelectedSchedule(value)
      setUseCustomSchedule(false)
      setConfig(prev => ({ ...prev, schedule: value }))
    } else {
      setCustomSchedule(value)
      setUseCustomSchedule(true)
      setConfig(prev => ({ ...prev, schedule: value }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!config.name.trim()) {
      setErrorMessage('Please enter a flow name')
      return
    }

    if (!filePath.trim()) {
      setErrorMessage('Please enter a file path')
      return
    }

    const schedule = useCustomSchedule ? customSchedule : selectedSchedule
    if (!schedule.trim()) {
      setErrorMessage('Please enter a schedule')
      return
    }

    createFlowMutation.mutate(filePath.trim())
  }

  const generateFlowTemplate = () => {
    const template = `---
name: "${config.name || 'my-scheduled-flow'}"
schedule: "${config.schedule}"
agent_profile: "${config.agentProfile}"
provider: "${config.provider}"${config.script ? `\nscript: "${config.script}"` : ''}
description: "${config.description || 'Automated flow for periodic tasks'}"
---

${config.prompt || `# Flow Purpose
Please analyze the latest code changes and provide a summary of any issues that need attention.

## Instructions
1. Review recent commits and changes
2. Identify any potential issues or improvements
3. Provide actionable recommendations
4. Update documentation if needed`}`

    const blob = new Blob([template], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${config.name || 'flow-template'}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const resetForm = () => {
    setFilePath('')
    setCustomSchedule('')
    setSelectedSchedule('0 0 * * *')
    setUseCustomSchedule(false)
    setErrorMessage('')
    setConfig({
      name: '',
      schedule: '0 0 * * *',
      agentProfile: 'developer',
      provider: 'q_cli',
      description: '',
      prompt: '',
      script: '',
    })
  }

  React.useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5" />
            <span>Create New Flow</span>
          </DialogTitle>
          <DialogDescription>
            Configure a new automated flow that runs on a schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Flow Name
                </label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Daily Code Review"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="description"
                  value={config.description}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this flow does"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="filePath" className="text-sm font-medium flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Flow File Path
                </label>
                <Input
                  id="filePath"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="/path/to/your-flow.md"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Path to a markdown file with frontmatter containing flow configuration
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="schedule" className="text-sm font-medium">
                  Schedule
                </label>
                <Select
                  value={useCustomSchedule ? customSchedule : selectedSchedule}
                  onValueChange={handleScheduleChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SCHEDULES.map((schedule) => (
                      <SelectItem key={schedule.value} value={schedule.value}>
                        {schedule.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="">Custom cron expression...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {useCustomSchedule && (
                <div className="space-y-2">
                  <label htmlFor="customSchedule" className="text-sm font-medium">
                    Custom Cron Expression
                  </label>
                  <Input
                    id="customSchedule"
                    value={customSchedule}
                    onChange={(e) => setCustomSchedule(e.target.value)}
                    placeholder="0 9 * * 1-5 (weekdays at 9 AM)"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use standard cron format: minute hour day month weekday
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Terminal className="h-4 w-4 mr-2" />
                Agent Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="agentProfile" className="text-sm font-medium">
                    Agent Profile
                  </label>
                  <Select
                    value={config.agentProfile}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, agentProfile: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENT_PROFILES.map((profile) => (
                        <SelectItem key={profile.value} value={profile.value}>
                          {profile.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="provider" className="text-sm font-medium">
                    Provider
                  </label>
                  <Select
                    value={config.provider}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, provider: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="script" className="text-sm font-medium">
                  Conditional Script (Optional)
                </label>
                <Input
                  id="script"
                  value={config.script}
                  onChange={(e) => setConfig(prev => ({ ...prev, script: e.target.value }))}
                  placeholder="/path/to/condition-script.sh"
                />
                <p className="text-xs text-muted-foreground">
                  Script that determines if flow should run (should output JSON with "execute" field)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Flow Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Flow Prompt Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="prompt" className="text-sm font-medium">
                  Prompt Template
                </label>
                <textarea
                  id="prompt"
                  value={config.prompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Enter the prompt that will be sent to the agent..."
                  className="w-full min-h-[120px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  This prompt will be sent to the agent when the flow executes
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateFlowTemplate}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Template</span>
                </Button>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Info className="h-3 w-3 mr-1" />
                  Download a template file to understand the required format
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Flow File Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-start space-x-2">
                  <Badge variant="outline" className="text-xs mt-0.5">Required</Badge>
                  <p>Markdown format with YAML frontmatter</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Badge variant="outline" className="text-xs mt-0.5">Required</Badge>
                  <p>Frontmatter fields: name, schedule, agent_profile</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Badge variant="secondary" className="text-xs mt-0.5">Optional</Badge>
                  <p>provider (defaults to q_cli), script, description</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Badge variant="outline" className="text-xs mt-0.5">Required</Badge>
                  <p>Content after frontmatter is the prompt template</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Badge variant="secondary" className="text-xs mt-0.5">Optional</Badge>
                  <p>Script should output JSON with "execute" and "output" fields</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {errorMessage && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createFlowMutation.isPending}
            >
              {createFlowMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Creating Flow...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Flow
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
