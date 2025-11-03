import axios from 'axios';
import type { Terminal, Session, TerminalOutput } from '../types';

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
};
