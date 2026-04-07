import { create } from 'zustand';

export interface CartItem {
  store_product_id: string;
  product_id: number;
  product_name: string;
  product_image?: string;
  price: number;
  quantity: number;
  store_id: string;
  store_name: string;
}

export interface BroadcastCartItem {
  product_id: number;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit?: string;
}

interface CartState {
  // Direct cart — one store at a time
  directItems: CartItem[];
  directStoreId: string | null;
  directStoreName: string | null;

  // Broadcast cart — no store constraint
  broadcastItems: BroadcastCartItem[];

  // Direct cart actions
  addDirectItem: (item: CartItem) => void;
  removeDirectItem: (storeProductId: string) => void;
  updateDirectQuantity: (storeProductId: string, quantity: number) => void;
  clearDirectCart: () => void;

  // Broadcast cart actions
  addBroadcastItem: (item: BroadcastCartItem) => void;
  removeBroadcastItem: (productId: number) => void;
  updateBroadcastQuantity: (productId: number, quantity: number) => void;
  clearBroadcastCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  directItems: [],
  directStoreId: null,
  directStoreName: null,
  broadcastItems: [],

  addDirectItem: (item) =>
    set((state) => {
      // If different store, clear old cart first
      if (state.directStoreId && state.directStoreId !== item.store_id) {
        return {
          directItems: [item],
          directStoreId: item.store_id,
          directStoreName: item.store_name,
        };
      }

      const existing = state.directItems.find(
        (i) => i.store_product_id === item.store_product_id,
      );

      if (existing) {
        return {
          directItems: state.directItems.map((i) =>
            i.store_product_id === item.store_product_id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          ),
        };
      }

      return {
        directItems: [...state.directItems, item],
        directStoreId: item.store_id,
        directStoreName: item.store_name,
      };
    }),

  removeDirectItem: (storeProductId) =>
    set((state) => {
      const newItems = state.directItems.filter(
        (i) => i.store_product_id !== storeProductId,
      );
      return {
        directItems: newItems,
        directStoreId: newItems.length > 0 ? state.directStoreId : null,
        directStoreName: newItems.length > 0 ? state.directStoreName : null,
      };
    }),

  updateDirectQuantity: (storeProductId, quantity) =>
    set((state) => ({
      directItems:
        quantity <= 0
          ? state.directItems.filter(
              (i) => i.store_product_id !== storeProductId,
            )
          : state.directItems.map((i) =>
              i.store_product_id === storeProductId ? { ...i, quantity } : i,
            ),
    })),

  clearDirectCart: () =>
    set({ directItems: [], directStoreId: null, directStoreName: null }),

  addBroadcastItem: (item) =>
    set((state) => {
      const existing = state.broadcastItems.find(
        (i) => i.product_id === item.product_id,
      );
      if (existing) {
        return {
          broadcastItems: state.broadcastItems.map((i) =>
            i.product_id === item.product_id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          ),
        };
      }
      return { broadcastItems: [...state.broadcastItems, item] };
    }),

  removeBroadcastItem: (productId) =>
    set((state) => ({
      broadcastItems: state.broadcastItems.filter(
        (i) => i.product_id !== productId,
      ),
    })),

  updateBroadcastQuantity: (productId, quantity) =>
    set((state) => ({
      broadcastItems:
        quantity <= 0
          ? state.broadcastItems.filter((i) => i.product_id !== productId)
          : state.broadcastItems.map((i) =>
              i.product_id === productId ? { ...i, quantity } : i,
            ),
    })),

  clearBroadcastCart: () => set({ broadcastItems: [] }),
}));
