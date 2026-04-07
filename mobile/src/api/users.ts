import { apiClient } from './client';

export const usersApi = {
  getMe: () =>
    apiClient.get('/users/me').then((r) => r.data),

  updateProfile: (data: { first_name?: string; last_name?: string }) =>
    apiClient.put('/users/me', data).then((r) => r.data),

  saveFcmToken: (fcm_token: string) =>
    apiClient.put('/users/me/fcm-token', { fcm_token }).then((r) => r.data),
};

export const locationsApi = {
  getAll: () =>
    apiClient.get('/locations').then((r) => r.data),

  create: (data: any) =>
    apiClient.post('/locations', data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/locations/${id}`).then((r) => r.data),
};
