import axios from 'axios';
import type { Terminal, Session, TerminalOutput, InboxMessage, Flow } from '../types';

const API_BASE = '/api';

export const api = {
  // Health check
  healthCheck: async () => {
    const { data } = await axios.get(`${API_BASE}/health`);
    return data;
  },

  // Sessions
  createSession: async (
    provider: string,
    agentProfile: string,
    sessionName?: string,
    workingDirectory?: string,
    fullPermissions?: boolean,
  ) => {
    const { data } = await axios.post<Terminal>(`${API_BASE}/sessions`, null, {
      params: {
        provider,
        agent_profile: agentProfile,
        session_name: sessionName,
        working_directory: workingDirectory,
        full_permissions: fullPermissions ?? false,
      },
    });
    return data;
  },

  listSessions: async () => {
    const { data } = await axios.get<Session[]>(`${API_BASE}/sessions`);
    return data;
  },

  getSession: async (sessionName: string) => {
    const { data } = await axios.get<Session>(`${API_BASE}/sessions/${sessionName}`);
    return data;
  },

  deleteSession: async (sessionName: string) => {
    const { data } = await axios.delete(`${API_BASE}/sessions/${sessionName}`);
    return data;
  },

  // Terminals
  createTerminal: async (
    sessionName: string,
    provider: string,
    agentProfile: string,
    workingDirectory?: string,
    fullPermissions?: boolean,
  ) => {
    const { data } = await axios.post<Terminal>(
      `${API_BASE}/sessions/${sessionName}/terminals`,
      null,
      {
        params: {
          provider,
          agent_profile: agentProfile,
          working_directory: workingDirectory,
          full_permissions: fullPermissions ?? false,
        },
      }
    );
    return data;
  },

  listTerminals: async (sessionName: string) => {
    const { data } = await axios.get<Terminal[]>(
      `${API_BASE}/sessions/${sessionName}/terminals`
    );
    return data;
  },

  getTerminal: async (terminalId: string) => {
    const { data } = await axios.get<Terminal>(`${API_BASE}/terminals/${terminalId}`);
    return data;
  },

  sendInput: async (terminalId: string, message: string) => {
    const { data } = await axios.post(`${API_BASE}/terminals/${terminalId}/input`, null, {
      params: { message },
    });
    return data;
  },

  getOutput: async (terminalId: string, mode: 'full' | 'last' = 'full') => {
    const { data } = await axios.get<TerminalOutput>(
      `${API_BASE}/terminals/${terminalId}/output`,
      { params: { mode } }
    );
    return data;
  },

  exitTerminal: async (terminalId: string) => {
    const { data } = await axios.post(`${API_BASE}/terminals/${terminalId}/exit`);
    return data;
  },

  deleteTerminal: async (terminalId: string) => {
    const { data } = await axios.delete(`${API_BASE}/terminals/${terminalId}`);
    return data;
  },

  openTerminal: async (terminalId: string) => {
    const { data } = await axios.post<{
      success: boolean;
      session_name: string;
      attach_command: string;
      terminal_emulator: string | null;
    }>(`${API_BASE}/terminals/${terminalId}/open`);
    return data;
  },

  // Inbox
  sendMessage: async (receiverId: string, senderId: string, message: string) => {
    const { data } = await axios.post(
      `${API_BASE}/terminals/${receiverId}/inbox/messages`,
      null,
      { params: { sender_id: senderId, message } }
    );
    return data;
  },

  getInboxMessages: async (terminalId: string, status?: string, direction?: string): Promise<InboxMessage[]> => {
    try {
      // Validate terminalId
      if (!terminalId || typeof terminalId !== 'string') {
        throw new Error('Invalid terminal ID');
      }

      const { data } = await axios.get(`${API_BASE}/terminals/${terminalId}/inbox/messages`, {
        params: { status, direction }
      });
      return data.messages;
    } catch (error) {
      console.error('Error fetching inbox messages:', error);
      throw error;
    }
  },

  getPendingMessagesCount: async (terminalId?: string): Promise<number> => {
    try {
      if (terminalId) {
        const { data } = await axios.get(
          `${API_BASE}/terminals/${terminalId}/inbox/messages/pending/count`
        );
        return data.count;
      } else {
        const { data } = await axios.get(`${API_BASE}/inbox/messages/pending/count`);
        return data.count;
      }
    } catch (error) {
      console.error('Error fetching pending messages count:', error);
      throw error;
    }
  },

  // Flows
  addFlow: async (filePath: string) => {
    const { data } = await axios.post<Flow>(`${API_BASE}/flows`, null, {
      params: { file_path: filePath }
    });
    return data;
  },

  listFlows: async () => {
    const { data } = await axios.get<Flow[]>(`${API_BASE}/flows`);
    return data;
  },

  getFlow: async (flowName: string) => {
    const { data } = await axios.get<Flow>(`${API_BASE}/flows/${flowName}`);
    return data;
  },

  removeFlow: async (flowName: string) => {
    const { data } = await axios.delete(`${API_BASE}/flows/${flowName}`);
    return data;
  },

  enableFlow: async (flowName: string) => {
    const { data } = await axios.post(`${API_BASE}/flows/${flowName}/enable`);
    return data;
  },

  disableFlow: async (flowName: string) => {
    const { data } = await axios.post(`${API_BASE}/flows/${flowName}/disable`);
    return data;
  },

  executeFlow: async (flowName: string) => {
    const { data } = await axios.post(`${API_BASE}/flows/${flowName}/execute`);
    return data;
  },
};
