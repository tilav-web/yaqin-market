import { apiClient } from './client';

export const productsApi = {
  getCatalog: (params?: {
    q?: string;
    category_id?: string;
    page?: number;
    limit?: number;
    price_min?: number;
    price_max?: number;
    sort?: 'new' | 'price_asc' | 'price_desc' | 'popular';
    lat?: number;
    lng?: number;
    radius_km?: number;
    deliverable?: boolean;
    free_delivery?: boolean;
  }) =>
    apiClient.get('/products/catalog', { params }).then((r) => r.data),

  getAll: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/products', { params }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get(`/products/${id}`).then((r) => r.data),
};

export const categoriesApi = {
  getAll: () =>
    apiClient.get('/categories').then((r) => r.data),
};

export const storeProductsApi = {
  getByStore: (storeId: string) =>
    apiClient
      .get('/store-products', { params: { store_id: storeId } })
      .then((r) => r.data),

  getCatalog: (params: {
    store_id: string;
    q?: string;
    category_id?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient
      .get('/store-products/catalog', { params })
      .then((r) => r.data),

  getCategories: (storeId: string) =>
    apiClient
      .get('/store-products/categories', { params: { store_id: storeId } })
      .then((r) => r.data),

  create: (data: {
    store_id: string;
    product_id: number;
    price: number;
    is_available?: boolean;
    is_prime?: boolean;
  }) => {
    const { store_id, ...body } = data;
    return apiClient
      .post('/store-products', body, { params: { store_id } })
      .then((r) => r.data);
  },

  update: (
    id: string,
    storeId: string,
    data: { price?: number; is_available?: boolean; is_prime?: boolean },
  ) =>
    apiClient
      .put(`/store-products/${id}`, data, { params: { store_id: storeId } })
      .then((r) => r.data),

  setPrice: (id: string, storeId: string, price: number) =>
    apiClient
      .post(`/store-products/${id}/price`, { price }, { params: { store_id: storeId } })
      .then((r) => r.data),

  setAvailability: (id: string, storeId: string, isAvailable: boolean) =>
    apiClient
      .post(
        `/store-products/${id}/availability`,
        { is_available: isAvailable },
        { params: { store_id: storeId } },
      )
      .then((r) => r.data),

  remove: (id: string, storeId: string) =>
    apiClient
      .delete(`/store-products/${id}`, { params: { store_id: storeId } })
      .then((r) => r.data),
};

export const storesApiExtra = {
  getDeliveryQuote: (storeId: string, lat: number, lng: number) =>
    apiClient
      .get(`/stores/${storeId}/delivery-quote`, { params: { lat, lng } })
      .then((r) => r.data as {
        distance_meters: number;
        is_deliverable: boolean;
        is_free: boolean;
        fee: number;
        max_radius_meters: number;
        free_radius_meters: number;
        min_order_amount?: number;
        reason?: string;
      }),
};
