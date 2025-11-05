import axios from 'axios';
import type { Terminal, Session, TerminalOutput, InboxMessage } from '../types';

const API_BASE = '/api';

export const api = {
  // Health check
  healthCheck: async () => {
    const { data } = await axios.get(`${API_BASE}/health`);
    return data;
  },

  // Sessions
  createSession: async (provider: string, agentProfile: string, sessionName?: string, workingDirectory?: string) => {
    const { data } = await axios.post<Terminal>(`${API_BASE}/sessions`, null, {
      params: { provider, agent_profile: agentProfile, session_name: sessionName, working_directory: workingDirectory },
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
  createTerminal: async (sessionName: string, provider: string, agentProfile: string, workingDirectory?: string) => {
    const { data } = await axios.post<Terminal>(
      `${API_BASE}/sessions/${sessionName}/terminals`,
      null,
      { params: { provider, agent_profile: agentProfile, working_directory: workingDirectory } }
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

  // Inbox
  sendMessage: async (receiverId: string, senderId: string, message: string) => {
    const { data } = await axios.post(
      `${API_BASE}/terminals/${receiverId}/inbox/messages`,
      null,
      { params: { sender_id: senderId, message } }
    );
    return data;
  },

  // TODO: Backend API endpoints needed - using mock data for now
  // GET /api/terminals/{terminalId}/inbox/messages?status=pending&direction=sent|received|all
  getInboxMessages: async (terminalId: string, status?: string, direction?: string): Promise<InboxMessage[]> => {
    try {
      // Validate terminalId
      if (!terminalId || typeof terminalId !== 'string') {
        throw new Error('Invalid terminal ID');
      }

      // TODO: Replace with real API call when backend is ready
      // const { data } = await axios.get(`${API_BASE}/terminals/${terminalId}/inbox/messages`, {
      //   params: { status, direction }
      // });
      // return data.messages;

      // Mock implementation with validation
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

      let filteredMessages = [...mockInboxMessages];

      // Filter by direction
      if (direction === 'sent') {
        filteredMessages = filteredMessages.filter(msg => msg.sender_id === terminalId);
      } else if (direction === 'received') {
        filteredMessages = filteredMessages.filter(msg => msg.receiver_id === terminalId);
      } else {
        // 'all' or undefined
        filteredMessages = filteredMessages.filter(
          msg => msg.sender_id === terminalId || msg.receiver_id === terminalId
        );
      }

      // Filter by status
      if (status && ['pending', 'delivered', 'failed'].includes(status)) {
        filteredMessages = filteredMessages.filter(msg => msg.status === status);
      }

      // Validate response structure
      if (!Array.isArray(filteredMessages)) {
        throw new Error('Invalid response format');
      }

      return filteredMessages;
    } catch (error) {
      console.error('Error fetching inbox messages:', error);
      throw error;
    }
  },

  getPendingMessagesCount: async (terminalId?: string): Promise<number> => {
    try {
      // TODO: Replace with real API call when backend is ready
      // if (terminalId) {
      //   const { data } = await axios.get(
      //     `${API_BASE}/terminals/${terminalId}/inbox/messages/pending/count`
      //   );
      //   return data.count;
      // } else {
      //   const { data } = await axios.get(`${API_BASE}/inbox/messages/pending/count`);
      //   return data.count;
      // }

      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 300));

      let pendingMessages = mockInboxMessages.filter(msg => msg.status === 'pending');

      if (terminalId) {
        // Validate terminalId
        if (typeof terminalId !== 'string') {
          throw new Error('Invalid terminal ID');
        }
        pendingMessages = pendingMessages.filter(msg => msg.receiver_id === terminalId);
      }

      const count = pendingMessages.length;

      // Validate count is a number
      if (typeof count !== 'number' || isNaN(count)) {
        throw new Error('Invalid count value');
      }

      return count;
    } catch (error) {
      console.error('Error fetching pending messages count:', error);
      throw error;
    }
  },
};

// Mock data for inbox messages - will be replaced with real API calls
const mockInboxMessages: InboxMessage[] = [
  {
    id: '1',
    sender_id: 'terminal_abc123',
    receiver_id: 'terminal_def456',
    message: 'Task completed successfully. Results saved to output.json',
    status: 'delivered',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    delivered_at: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    sender_id: 'terminal_def456',
    receiver_id: 'terminal_abc123',
    message: 'Please analyze the logs in /var/logs/app.log and send back a summary',
    status: 'pending',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  },
  {
    id: '3',
    sender_id: 'terminal_xyz789',
    receiver_id: 'terminal_def456',
    message: 'Database migration completed. All tables updated successfully.',
    status: 'delivered',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    delivered_at: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    sender_id: 'terminal_abc123',
    receiver_id: 'terminal_xyz789',
    message: 'Error processing request: Connection timeout. Please retry.',
    status: 'failed',
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
  },
  {
    id: '5',
    sender_id: 'terminal_def456',
    receiver_id: 'terminal_abc123',
    message: 'Starting deployment process for production environment. ETA: 15 minutes.',
    status: 'delivered',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    delivered_at: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    sender_id: 'terminal_xyz789',
    receiver_id: 'terminal_def456',
    message: 'Code review completed. Found 3 minor issues that need attention.',
    status: 'pending',
    created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
  },
];
