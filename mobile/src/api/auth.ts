import { apiClient } from './client';

export const authApi = {
  sendOtp: (phone: string) =>
    apiClient.post('/auth/send-otp', { phone }).then((r) => r.data),

  verifyOtp: (phone: string, otp: string) =>
    apiClient.post('/auth/verify-otp', { phone, otp }).then((r) => r.data),

  getMe: () =>
    apiClient.get('/auth').then((r) => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then((r) => r.data),
};
