import { apiClient } from './client';

export const storesApi = {
  getNearby: (lat: number, lng: number, radius = 10) =>
    apiClient
      .get('/stores/nearby', { params: { lat, lng, radius } })
      .then((r) => r.data),

  getPrime: (lat: number, lng: number) =>
    apiClient
      .get('/stores/prime', { params: { lat, lng } })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get(`/stores/${id}`).then((r) => r.data),

  getMyStores: () =>
    apiClient.get('/stores/my').then((r) => r.data),

  create: (data: any) =>
    apiClient.post('/stores', data).then((r) => r.data),

  update: (id: string, data: any) =>
    apiClient.put(`/stores/${id}`, data).then((r) => r.data),

  updateDeliverySettings: (id: string, data: any) =>
    apiClient.put(`/stores/${id}/delivery-settings`, data).then((r) => r.data),

  setActive: (id: string, is_active: boolean) =>
    apiClient.put(`/stores/${id}/active`, { is_active }).then((r) => r.data),
};
