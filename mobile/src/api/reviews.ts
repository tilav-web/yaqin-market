import { apiClient } from './client';

export type ProductRating = {
  product_id: number;
  rating: number;
  comment?: string;
};

export type CourierRating = {
  rating: number;
  comment?: string;
};

export type OrderReviewPayload = {
  order_id: string;
  products?: ProductRating[];
  courier?: CourierRating;
};

export const reviewsApi = {
  /** Buyurtma yakunida mahsulotlar + kuryer uchun baho qoldirish */
  createForOrder: (data: OrderReviewPayload) =>
    apiClient.post('/reviews/order', data).then((r) => r.data),

  /** Foydalanuvchi shu buyurtma uchun qoldirgan sharhlar */
  getByOrder: (orderId: string) =>
    apiClient.get(`/reviews/my/order/${orderId}`).then((r) => r.data),

  /** Do'konning sharhlari (oshkora) */
  getByStore: (storeId: string) =>
    apiClient.get(`/reviews/store/${storeId}`).then((r) => r.data),

  /** Mahsulot sharhlari (oshkora) */
  getByProduct: (productId: number) =>
    apiClient.get(`/reviews/product/${productId}`).then((r) => r.data),

  /** Kuryer sharhlari (oshkora) */
  getByCourier: (courierId: string) =>
    apiClient.get(`/reviews/courier/${courierId}`).then((r) => r.data),

  /** Mening barcha sharhlarim */
  getMine: () => apiClient.get('/reviews/my').then((r) => r.data),
};
