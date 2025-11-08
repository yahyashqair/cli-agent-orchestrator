export const DEFAULT_PROVIDER = 'q_cli'

export const PROVIDER_OPTIONS = [
  { value: 'q_cli', label: 'Amazon Q Developer CLI' },
  { value: 'claude_code', label: 'Claude Code' },
  { value: 'codex_cli', label: 'Codex CLI' },
  { value: 'copilot_cli', label: 'GitHub Copilot CLI' },
  { value: 'opencode', label: 'OpenCode' },
] as const

export const AGENT_PROFILE_OPTIONS = [
  { value: 'code_supervisor', label: 'Code Supervisor', description: 'Coordinates development tasks' },
  { value: 'developer', label: 'Developer', description: 'Writes code based on specifications' },
  { value: 'reviewer', label: 'Reviewer', description: 'Performs code reviews' },
] as const
