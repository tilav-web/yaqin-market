import { apiClient } from './client';

export const chatApi = {
  getConversations: () =>
    apiClient.get('/conversations').then((r) => r.data),

  startConversation: (data: { type: string; store_id?: string; reference_id?: string }) =>
    apiClient.post('/conversations', data).then((r) => r.data),

  getConversation: (id: string) =>
    apiClient.get(`/conversations/${id}`).then((r) => r.data),

  getMessages: (id: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/conversations/${id}/messages`, { params }).then((r) => r.data),

  sendMessage: (id: string, content: string) =>
    apiClient.post(`/conversations/${id}/messages`, { content }).then((r) => r.data),

  getUnreadCount: () =>
    apiClient.get('/conversations/unread').then((r) => r.data),
};
