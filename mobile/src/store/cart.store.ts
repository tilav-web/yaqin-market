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

export interface StoreCart {
  store_id: string;
  store_name: string;
  store_logo?: string;
  items: CartItem[];
}

export interface BroadcastCartItem {
  product_id: number;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit?: string;
}

interface CartState {
  /** storeId → StoreCart — har bir do'kon uchun alohida savatcha */
  storeCarts: Record<string, StoreCart>;

  /** Do'konsiz umumiy savatcha — broadcast so'rov uchun */
  broadcastItems: BroadcastCartItem[];

  // ─── Store cart actions ─────────────────────────────────────────
  addStoreItem: (item: CartItem, storeLogo?: string) => void;
  removeStoreItem: (storeId: string, storeProductId: string) => void;
  updateStoreQuantity: (
    storeId: string,
    storeProductId: string,
    quantity: number,
  ) => void;
  clearStoreCart: (storeId: string) => void;
  clearAllStoreCarts: () => void;

  // ─── Broadcast cart actions ─────────────────────────────────────
  addBroadcastItem: (item: BroadcastCartItem) => void;
  removeBroadcastItem: (productId: number) => void;
  updateBroadcastQuantity: (productId: number, quantity: number) => void;
  clearBroadcastCart: () => void;

  // ─── Selectors/helpers ──────────────────────────────────────────
  getStoreCart: (storeId: string) => StoreCart | undefined;
  getTotalItemsCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  storeCarts: {},
  broadcastItems: [],

  addStoreItem: (item, storeLogo) =>
    set((state) => {
      const existing = state.storeCarts[item.store_id];
      if (existing) {
        const dup = existing.items.find(
          (i) => i.store_product_id === item.store_product_id,
        );
        const nextItems = dup
          ? existing.items.map((i) =>
              i.store_product_id === item.store_product_id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i,
            )
          : [...existing.items, item];
        return {
          storeCarts: {
            ...state.storeCarts,
            [item.store_id]: {
              ...existing,
              store_name: existing.store_name || item.store_name,
              store_logo: existing.store_logo ?? storeLogo,
              items: nextItems,
            },
          },
        };
      }
      return {
        storeCarts: {
          ...state.storeCarts,
          [item.store_id]: {
            store_id: item.store_id,
            store_name: item.store_name,
            store_logo: storeLogo,
            items: [item],
          },
        },
      };
    }),

  removeStoreItem: (storeId, storeProductId) =>
    set((state) => {
      const existing = state.storeCarts[storeId];
      if (!existing) return state;
      const nextItems = existing.items.filter(
        (i) => i.store_product_id !== storeProductId,
      );
      if (nextItems.length === 0) {
        const { [storeId]: _, ...rest } = state.storeCarts;
        return { storeCarts: rest };
      }
      return {
        storeCarts: {
          ...state.storeCarts,
          [storeId]: { ...existing, items: nextItems },
        },
      };
    }),

  updateStoreQuantity: (storeId, storeProductId, quantity) =>
    set((state) => {
      const existing = state.storeCarts[storeId];
      if (!existing) return state;
      if (quantity <= 0) {
        const nextItems = existing.items.filter(
          (i) => i.store_product_id !== storeProductId,
        );
        if (nextItems.length === 0) {
          const { [storeId]: _, ...rest } = state.storeCarts;
          return { storeCarts: rest };
        }
        return {
          storeCarts: {
            ...state.storeCarts,
            [storeId]: { ...existing, items: nextItems },
          },
        };
      }
      return {
        storeCarts: {
          ...state.storeCarts,
          [storeId]: {
            ...existing,
            items: existing.items.map((i) =>
              i.store_product_id === storeProductId ? { ...i, quantity } : i,
            ),
          },
        },
      };
    }),

  clearStoreCart: (storeId) =>
    set((state) => {
      if (!state.storeCarts[storeId]) return state;
      const { [storeId]: _, ...rest } = state.storeCarts;
      return { storeCarts: rest };
    }),

  clearAllStoreCarts: () => set({ storeCarts: {} }),

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

  getStoreCart: (storeId) => get().storeCarts[storeId],
  getTotalItemsCount: () => {
    const { storeCarts, broadcastItems } = get();
    const storeCount = Object.values(storeCarts).reduce(
      (sum, c) => sum + c.items.reduce((s, i) => s + i.quantity, 0),
      0,
    );
    const bCount = broadcastItems.reduce((s, i) => s + i.quantity, 0);
    return storeCount + bCount;
  },
}));
