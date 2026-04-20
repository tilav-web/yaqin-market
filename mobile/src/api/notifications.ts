import { apiClient } from './client';

export type NotificationType =
  | 'ORDER'
  | 'CHAT'
  | 'CHANGE'
  | 'WALLET'
  | 'BROADCAST'
  | 'REVIEW'
  | 'COURIER'
  | 'SYSTEM';

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, string> | null;
  read_at: string | null;
  createdAt: string;
};

export const notificationsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    filter?: 'all' | 'unread';
    type?: NotificationType;
  }) =>
    apiClient
      .get('/notifications/my', { params })
      .then(
        (r) =>
          r.data as {
            items: NotificationItem[];
            meta: {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
              hasMore: boolean;
            };
          },
      ),

  getUnreadCount: () =>
    apiClient
      .get('/notifications/unread-count')
      .then((r) => r.data as { unread: number }),

  markRead: (id: string) =>
    apiClient.post(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    apiClient.post('/notifications/read-all').then((r) => r.data as { updated: number }),

  delete: (id: string) =>
    apiClient.delete(`/notifications/${id}`).then((r) => r.data),

  deleteAll: () =>
    apiClient.delete('/notifications').then((r) => r.data as { deleted: number }),

  saveFcmToken: (token: string) =>
    apiClient
      .post('/notifications/fcm-token', { token })
      .then((r) => r.data),
};
