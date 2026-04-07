import { apiClient } from './client';

export const productsApi = {
  getCatalog: (params?: {
    q?: string;
    category_id?: number;
    page?: number;
    limit?: number;
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

  create: (data: any) =>
    apiClient.post('/store-products', data).then((r) => r.data),

  update: (id: string, data: any) =>
    apiClient.patch(`/store-products/${id}`, data).then((r) => r.data),
};
