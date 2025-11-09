// API Types based on backend analysis
export type ProviderType = "q_cli" | "claude_code" | "codex_cli" | "copilot_cli" | "opencode";
export type TerminalStatus = "idle" | "processing" | "completed" | "waiting_user_answer" | "error";
export type SessionStatus = "active" | "detached" | "terminated";
export type MessageStatus = "pending" | "delivered" | "failed";

export interface Terminal {
  id: string;
  name: string;
  session_name: string;
  agent_profile?: string;
  provider: ProviderType;
  status: TerminalStatus;
  working_directory?: string;
  full_permissions: boolean;
  last_active?: string;
}

export interface Session {
  name: string;
  status: SessionStatus;
  terminal_count: number;
  terminals: Terminal[];
}

export interface Flow {
  name: string;
  file_path: string;
  schedule: string;
  agent_profile: string;
  provider: string;
  script?: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

export interface InboxMessage {
  id: number;
  sender_id: string;
  receiver_id: string;
  message: string;
  status: MessageStatus;
  created_at: string;
  delivered_at?: string;
}

export interface AgentProviderConfig {
  agent_profile: string;
  provider: ProviderType;
}

export interface CreateSessionRequest {
  name?: string;
  terminal_count?: number;
  working_directory?: string;
  full_permissions?: boolean;
}

export interface CreateTerminalRequest {
  session_name: string;
  name?: string;
  agent_profile?: string;
  provider?: ProviderType;
  working_directory?: string;
  full_permissions?: boolean;
}

export interface SendInputRequest {
  input: string;
  provider?: string;
}

export interface SendMessageRequest {
  message: string;
  receiver_id: string;
}

export interface AddFlowRequest {
  name: string;
  file_path: string;
  schedule: string;
  agent_profile: string;
  provider: string;
  script?: string;
}