import axios from 'axios';

// API client configuration
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    throw error;
  }
);

// API endpoints
export const endpoints = {
  // Health
  health: () => apiClient.get('/health'),

  // Sessions
  sessions: {
    list: () => apiClient.get('/sessions'),
    create: (data: any) => apiClient.post('/sessions', null, { params: data }),
    get: (name: string) => apiClient.get(`/sessions/${name}`),
    delete: (name: string) => apiClient.delete(`/sessions/${name}`),
    archive: (name: string, archivedBy?: string) => apiClient.post(`/sessions/${name}/archive`, null, {
      params: archivedBy ? { archived_by: archivedBy } : {}
    }),
    listArchived: () => apiClient.get('/sessions/archived'),
    getArchived: (name: string) => apiClient.get(`/sessions/archived/${name}`),
  },

  // Terminals
  terminals: {
    create: (sessionName: string, data: any) =>
      apiClient.post(`/sessions/${sessionName}/terminals`, null, { params: data }),
    listInSession: (sessionName: string) =>
      apiClient.get(`/sessions/${sessionName}/terminals`),
    get: (terminalId: string) => apiClient.get(`/terminals/${terminalId}`),
    sendInput: (terminalId: string, message: string) =>
      apiClient.post(`/terminals/${terminalId}/input`, null, { params: { message } }),
    getOutput: (terminalId: string, mode: 'full' | 'last' = 'full') =>
      apiClient.get(`/terminals/${terminalId}/output`, { params: { mode } }),
    exit: (terminalId: string) => apiClient.post(`/terminals/${terminalId}/exit`),
    delete: (terminalId: string) => apiClient.delete(`/terminals/${terminalId}`),
    open: (terminalId: string) => apiClient.post(`/terminals/${terminalId}/open`),
  },

  // Messages
  messages: {
    send: (receiverId: string, senderId: string, message: string) =>
      apiClient.post(`/terminals/${receiverId}/inbox/messages`, null, {
        params: { sender_id: senderId, message }
      }),
    getInbox: (terminalId: string, status?: string, direction?: string) =>
      apiClient.get(`/terminals/${terminalId}/inbox/messages`, {
        params: status || direction ? { status, direction } : {}
      }),
    getPendingCount: (includeArchived: boolean = true) =>
      apiClient.get('/inbox/messages/pending/count', {
        params: { include_archived: includeArchived }
      }),
    getTerminalPendingCount: (terminalId: string) =>
      apiClient.get(`/terminals/${terminalId}/inbox/messages/pending/count`),
  },

  // Flows
  flows: {
    list: () => apiClient.get('/flows'),
    add: (filePath: string) => apiClient.post('/flows', null, { params: { file_path: filePath } }),
    get: (name: string) => apiClient.get(`/flows/${name}`),
    delete: (name: string) => apiClient.delete(`/flows/${name}`),
    enable: (name: string) => apiClient.post(`/flows/${name}/enable`),
    disable: (name: string) => apiClient.post(`/flows/${name}/disable`),
    execute: (name: string) => apiClient.post(`/flows/${name}/execute`),
  },

  // Agent configurations
  agents: {
    getProviderConfigs: () => apiClient.get('/agent-provider-configs'),
    setProvider: (agentProfile: string, provider: string) =>
      apiClient.put(`/agent-provider-configs/${agentProfile}`, { provider }),
    removeProvider: (agentProfile: string) =>
      apiClient.delete(`/agent-provider-configs/${agentProfile}`),
  },
};