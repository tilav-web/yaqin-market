import { apiClient } from './client';

export const ordersApi = {
  // Customer
  create: (data: any) =>
    apiClient.post('/orders', data).then((r) => r.data),

  getMyOrders: (status?: string) =>
    apiClient.get('/orders/my', { params: { status } }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get(`/orders/${id}`).then((r) => r.data),

  getCourierLocation: (orderId: string) =>
    apiClient.get(`/orders/${orderId}/courier-location`).then((r) => r.data),

  // Broadcast
  createBroadcastRequest: (data: any) =>
    apiClient.post('/orders/broadcast-requests', data).then((r) => r.data),

  getMyBroadcastRequests: () =>
    apiClient.get('/orders/broadcast-requests/my').then((r) => r.data),

  getBroadcastRequestById: (id: string) =>
    apiClient.get(`/orders/broadcast-requests/${id}`).then((r) => r.data),

  getBroadcastOffers: (requestId: string) =>
    apiClient
      .get(`/orders/broadcast-requests/${requestId}/offers`)
      .then((r) => r.data),

  selectBroadcastOffer: (requestId: string, offerId: string, paymentMethod = 'CASH') =>
    apiClient
      .post(`/orders/broadcast-requests/${requestId}/select-offer`, {
        offer_id: offerId,
        payment_method: paymentMethod,
      })
      .then((r) => r.data),

  // Seller
  getStoreOrders: (status?: string) =>
    apiClient
      .get('/orders/store/my', { params: { status } })
      .then((r) => r.data),

  acceptOrder: (id: string) =>
    apiClient.post(`/orders/${id}/accept`).then((r) => r.data),

  acceptOrderItems: (id: string, itemIds: string[]) =>
    apiClient
      .post(`/orders/${id}/accept-items`, { item_ids: itemIds })
      .then((r) => r.data),

  readyOrder: (id: string, note?: string) =>
    apiClient.post(`/orders/${id}/ready`, { note }).then((r) => r.data),

  cancelOrder: (id: string, reason: string) =>
    apiClient
      .post(`/orders/${id}/cancel`, { reason })
      .then((r) => r.data),

  getBroadcastFeed: (radius = 10) =>
    apiClient
      .get('/orders/broadcast-requests/store/feed', { params: { radius } })
      .then((r) => r.data),

  createBroadcastOffer: (requestId: string, data: any) =>
    apiClient
      .post(`/orders/broadcast-requests/${requestId}/offers`, data)
      .then((r) => r.data),

  // Courier
  getNearbyOrders: (lat: number, lng: number, radius = 10) =>
    apiClient
      .get('/orders/courier/nearby', { params: { lat, lng, radius } })
      .then((r) => r.data),

  getMyCourierOrders: (status?: string) =>
    apiClient
      .get('/orders/courier/my', { params: { status } })
      .then((r) => r.data),

  assignCourier: (id: string) =>
    apiClient.post(`/orders/${id}/assign-courier`).then((r) => r.data),

  deliverOrder: (id: string) =>
    apiClient.post(`/orders/${id}/deliver`).then((r) => r.data),
};
