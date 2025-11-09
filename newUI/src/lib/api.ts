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
    create: (data: any) => apiClient.post('/sessions', data),
    get: (name: string) => apiClient.get(`/sessions/${name}`),
    delete: (name: string) => apiClient.delete(`/sessions/${name}`),
    archive: (name: string) => apiClient.post(`/sessions/${name}/archive`),
    listArchived: () => apiClient.get('/sessions/archived'),
    getArchived: (name: string) => apiClient.get(`/sessions/archived/${name}`),
  },

  // Terminals
  terminals: {
    create: (sessionName: string, data: any) =>
      apiClient.post(`/sessions/${sessionName}/terminals`, data),
    listInSession: (sessionName: string) =>
      apiClient.get(`/sessions/${sessionName}/terminals`),
    get: (terminalId: string) => apiClient.get(`/terminals/${terminalId}`),
    sendInput: (terminalId: string, input: string, provider?: string) =>
      apiClient.post(`/terminals/${terminalId}/input`, { input, provider }),
    getOutput: (terminalId: string) => apiClient.get(`/terminals/${terminalId}/output`),
    exit: (terminalId: string) => apiClient.post(`/terminals/${terminalId}/exit`),
    delete: (terminalId: string) => apiClient.delete(`/terminals/${terminalId}`),
    open: (terminalId: string) => apiClient.post(`/terminals/${terminalId}/open`),
  },

  // Messages
  messages: {
    send: (receiverId: string, message: string) =>
      apiClient.post(`/terminals/${receiverId}/inbox/messages`, { receiver_id: receiverId, message }),
    getInbox: (terminalId: string) =>
      apiClient.get(`/terminals/${terminalId}/inbox/messages`),
    getPendingCount: () => apiClient.get('/inbox/messages/pending/count'),
    getTerminalPendingCount: (terminalId: string) =>
      apiClient.get(`/terminals/${terminalId}/inbox/messages/pending/count`),
  },

  // Flows
  flows: {
    list: () => apiClient.get('/flows'),
    add: (data: any) => apiClient.post('/flows', data),
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