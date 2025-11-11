export type TerminalStatus = 'IDLE' | 'PROCESSING' | 'BLOCKED' | 'COMPLETED' | 'ERROR';

export interface TerminalSummary {
  id: string;
  alias: string;
  role: string;
  handles: string[];
  status: TerminalStatus;
  updatedAt: string;
}

export interface TerminalEventBase {
  state?: TerminalSummary & { tasks?: Record<string, TaskProgress> };
  terminalId?: string;
  entry?: TerminalLogEntry;
}

export interface TerminalLogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface TaskProgress {
  taskId: string;
  percentComplete: number;
  message: string;
  updatedAt: string;
}

export type TerminalEvent =
  | { type: 'TerminalRegistered'; state: TerminalSummary & { tasks?: Record<string, TaskProgress> } }
  | { type: 'TerminalStateChanged'; state: TerminalSummary & { tasks?: Record<string, TaskProgress> } }
  | { type: 'TerminalLogAppended'; terminalId: string; entry: TerminalLogEntry };
