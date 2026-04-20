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

  // ── Cash change (qaytim) ─────────────────────────────────────────
  /** Kuryer: yetkazilgandan keyin qabul qilingan summa + qaytim holati */
  submitDeliveryCash: (
    id: string,
    data: { paid_amount?: number | null; customer_requested_change?: boolean },
  ) =>
    apiClient.post(`/orders/${id}/delivery-cash`, data).then((r) => r.data),

  /** Customer: CONFIRM / WAIVE / DISPUTE */
  confirmChange: (
    id: string,
    data: { action: 'CONFIRM' | 'WAIVE' | 'DISPUTE'; claimed_amount?: number },
  ) =>
    apiClient.post(`/orders/${id}/confirm-change`, data).then((r) => r.data),

  /** Admin: disputlar ro'yxati */
  getChangeDisputes: () =>
    apiClient.get('/orders/admin/change-disputes').then((r) => r.data),

  /** Admin: nizoni hal qilish */
  resolveChangeDispute: (
    id: string,
    data: {
      resolution: 'USER_WON' | 'SELLER_WON' | 'ADJUSTED';
      adjusted_amount?: number;
      admin_note?: string;
    },
  ) =>
    apiClient.post(`/orders/${id}/resolve-change`, data).then((r) => r.data),
};
