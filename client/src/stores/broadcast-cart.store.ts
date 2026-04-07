import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProductCatalogItem } from "@/interfaces/market.interface";
import { t } from "@/lib/i18n";

export type BroadcastCartItem = {
  productId: number;
  name: string;
  image?: string | null;
  categoryName?: string | null;
  description?: string | null;
  quantity: number;
  parentId?: number | null;
  parentName?: string | null;
};

type BroadcastCartState = {
  items: BroadcastCartItem[];
  addProduct: (product: ProductCatalogItem, parent?: ProductCatalogItem | null) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeProduct: (productId: number) => void;
  clearCart: () => void;
};

function normalizeProductId(productId: number | string | null | undefined) {
  return Number(productId ?? 0);
}

function toCartItem(
  product: ProductCatalogItem,
  parent?: ProductCatalogItem | null,
  quantity: number = 1,
): BroadcastCartItem {
  const lang = 'uz';
  return {
    productId: normalizeProductId(product.id),
    name: t(product.name, lang),
    image: product.images?.[0]?.url ?? parent?.images?.[0]?.url ?? null,
    categoryName: t(product.category?.name ?? parent?.category?.name, lang) || null,
    description: t(product.description ?? parent?.description, lang) || null,
    quantity,
    parentId: parent ? normalizeProductId(parent.id) : null,
    parentName: parent ? t(parent.name, lang) : null,
  };
}

export const useBroadcastCartStore = create<BroadcastCartState>()(
  persist(
    (set) => ({
      items: [],
      addProduct: (product, parent) =>
        set((state) => {
          const productId = normalizeProductId(product.id);
          const existingItem = state.items.find((item) => item.productId === productId);

          if (!existingItem) {
            return {
              items: [...state.items, toCartItem(product, parent, 1)],
            };
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            ),
          };
        }),
      updateQuantity: (productId, quantity) =>
        set((state) => {
          const normalizedId = normalizeProductId(productId);
          const nextQuantity = Math.max(0, quantity);

          if (nextQuantity === 0) {
            return {
              items: state.items.filter((item) => item.productId !== normalizedId),
            };
          }

          return {
            items: state.items.map((item) =>
              item.productId === normalizedId
                ? { ...item, quantity: nextQuantity }
                : item,
            ),
          };
        }),
      removeProduct: (productId) =>
        set((state) => ({
          items: state.items.filter(
            (item) => item.productId !== normalizeProductId(productId),
          ),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: "yaqin_market.broadcast_cart",
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
