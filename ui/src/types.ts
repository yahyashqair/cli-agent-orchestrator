export type TerminalStatus =
  | 'IDLE'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'WAITING_USER_ANSWER'
  | 'ERROR'
  | 'UNKNOWN';

const THEME_VALUES = [
  'dark',
  'light',
  'cream',
  'lavender',
  'mint',
  'rose',
  'sky',
  'cyberpunk',
  'ocean',
  'forest',
  'firefox',
  'sunset',
  'monospace',
] as const;

export type Theme = (typeof THEME_VALUES)[number];

export const THEMES: readonly Theme[] = THEME_VALUES;

export interface Terminal {
  id: string;
  session_name: string;
  agent_profile: string;
  provider: string;
  status: TerminalStatus;
  created_at: string;
  updated_at: string;
  full_permissions?: boolean;
  working_directory?: string | null;
}

export interface Session {
  id?: string;
  name: string;
  status?: string;
  terminal_count: number;
  terminals?: Terminal[];
}

export type MessageStatus = 'pending' | 'delivered' | 'failed';

export interface InboxMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  status: MessageStatus;
  created_at: string;
  delivered_at?: string;
}

export interface TerminalOutput {
  output: string;
  mode: string;
}

export interface AgentActivity {
  terminal_id: string;
  agent_profile: string;
  provider: string;
  status: TerminalStatus;
  last_update: string;
  session_name: string;
}

export interface Flow {
  name: string;
  file_path: string;
  schedule: string;
  agent_profile: string;
  provider: string;
  script: string;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
}

export interface AgentProviderConfig {
  agent_profile: string;
  provider: string;
}
