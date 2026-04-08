import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MapPinIcon,
  PlusIcon,
  RocketIcon,
  SearchIcon,
  ShoppingBagIcon,
  MapIcon,
  StarIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/api/api";
import BroadcastCartSheet from "@/components/customer/broadcast-cart-sheet";
import ProductDrawer from "@/components/customer/product-drawer";
import EmptyState from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiscoveryPreferences } from "@/hooks/use-discovery-preferences";
import type { ICategory } from "@/interfaces/category.interface";
import type {
  PaginatedResponse,
  ProductCatalogItem,
  StoreSummary,
} from "@/interfaces/market.interface";
import { formatMoney } from "@/lib/market";
import { useBroadcastCartStore } from "@/stores/broadcast-cart.store";
import { useLang } from "@/context/lang.context";

const PRODUCTS_PAGE_SIZE = 12;
const STORE_INSERT_EVERY = 8;

function imageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return path;
}

/* ── Skeleton ──────────────────────────────────────────────────────────────── */

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3.5 w-4/5 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}

/* ── Prime Store Inline Card ───────────────────────────────────────────────── */

function PrimeStoreInline({ store }: { store: StoreSummary }) {
  const img = imageUrl(store.banner);
  return (
    <Link
      to={`/mobile/stores/${store.id}`}
      className="relative col-span-2 block h-36 overflow-hidden rounded-2xl shadow-md"
    >
      {img ? (
        <img
          src={img}
          alt={store.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <ShoppingBagIcon className="h-8 w-8 text-red-300" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/35" />

      {/* Badge */}
      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1">
        <StarIcon className="h-3 w-3 fill-amber-500 text-amber-500" />
        <span className="text-[10px] font-bold text-amber-700">Premium</span>
      </div>

      {/* Bottom info */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-3">
        {store.logo ? (
          <img
            src={imageUrl(store.logo)!}
            alt={store.name}
            className="h-8 w-8 rounded-full border-2 border-white object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600">
            <ShoppingBagIcon className="h-3.5 w-3.5 text-white" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{store.name}</p>
          <p className="text-[11px] text-white/80">20-35 min</p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25">
          <ChevronRightIcon className="h-4 w-4 text-white" />
        </div>
      </div>
    </Link>
  );
}

/* ── Main Component ────────────────────────────────────────────────────────── */

export default function CustomerHome() {
  const { lang, setLang, tr, t } = useLang();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<ProductCatalogItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { location, requestCurrentLocation } = useDiscoveryPreferences();
  const cartItems = useBroadcastCartStore((state) => state.items);
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim();

  useEffect(() => {
    if (!location) {
      requestCurrentLocation().catch(() => undefined);
    }
  }, [location, requestCurrentLocation]);

  const totalCartItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  /* ── Queries ─────────────────────────────────────────────────────────────── */

  const { data: primeStores = [] } = useQuery({
    queryKey: ["stores", "prime", location?.lat, location?.lng],
    queryFn: async () =>
      (
        await api.get<StoreSummary[]>(
          `/stores/prime?lat=${location?.lat ?? 0}&lng=${location?.lng ?? 0}`,
        )
      ).data,
    enabled: !!location,
    staleTime: 60000,
  });

  const {
    data: productPages,
    isLoading: productsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["products", "catalog", normalizedSearch, selectedCategoryId],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<PaginatedResponse<ProductCatalogItem>>("/products/catalog", {
          params: {
            q: normalizedSearch || undefined,
            category_id: selectedCategoryId || undefined,
            page: typeof pageParam === "number" ? pageParam : Number(pageParam ?? 1),
            limit: PRODUCTS_PAGE_SIZE,
          },
        })
      ).data,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
    staleTime: 60000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: async () => (await api.get<ICategory[]>("/categories")).data,
    staleTime: 60000,
  });

  /* ── Derived data ────────────────────────────────────────────────────────── */

  const visibleProducts = useMemo(
    () => productPages?.pages.flatMap((page) => page.items) ?? [],
    [productPages],
  );

  // Mix prime stores into products every STORE_INSERT_EVERY items
  const mixedItems = useMemo(() => {
    const items: Array<
      | { _type: "product"; data: ProductCatalogItem }
      | { _type: "store"; data: StoreSummary }
    > = [];
    let storeIdx = 0;

    for (let i = 0; i < visibleProducts.length; i++) {
      items.push({ _type: "product", data: visibleProducts[i] });
      if (
        (i + 1) % STORE_INSERT_EVERY === 0 &&
        storeIdx < primeStores.length
      ) {
        items.push({ _type: "store", data: primeStores[storeIdx] });
        storeIdx++;
      }
    }

    return items;
  }, [visibleProducts, primeStores]);

  /* ── Infinite scroll observer ────────────────────────────────────────────── */

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage || isFetchingNextPage || productsLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage().catch(() => undefined);
        }
      },
      { rootMargin: "480px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, productsLoading, visibleProducts.length]);

  const resetCatalogFilters = () => {
    setSearch("");
    setSelectedCategoryId(null);
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* ── Header (red, rounded bottom) ─────────────────────────────────── */}
      <header className="bg-red-600 px-4 pb-4 pt-3 text-white rounded-b-[1.75rem]">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => requestCurrentLocation().catch(() => undefined)}
              className="flex items-center gap-1 text-white/85"
            >
              <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">
                {location ? tr("location_ready") : tr("location_detecting")}
              </span>
              <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />
            </button>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">
              Yaqin Market
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "uz" ? "ru" : "uz")}
              className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30"
            >
              {lang === "uz" ? "RU" : "UZ"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Search bar area (continues red bg with rounded bottom) ────── */}
      <div className="bg-red-600 px-4 pb-5 rounded-b-[1.75rem] -mt-1">
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-md">
          <SearchIcon className="h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder={tr("search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          <Link
            to="/mobile/stores-map"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50"
          >
            <MapIcon className="h-4 w-4 text-red-600" />
          </Link>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* ── Promo Banner (broadcast order) ──────────────────────────────── */}
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="flex w-full items-center overflow-hidden rounded-2xl bg-red-800 p-4 text-left shadow-lg"
        >
          <div className="flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
              {tr("promo_label")}
            </p>
            <p className="text-lg font-extrabold leading-snug text-white">
              {tr("promo_title")}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/20 px-3 py-1.5">
              <span className="text-xs font-bold text-white">{tr("promo_btn")}</span>
              <ChevronRightIcon className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <div className="flex w-20 items-center justify-center">
            <RocketIcon className="h-12 w-12 text-white/30" />
          </div>
        </button>

        {/* ── Category Chips ──────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <button
              type="button"
              onClick={resetCatalogFilters}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                !selectedCategoryId
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-700 shadow-sm hover:bg-gray-50"
              }`}
            >
              {tr("all")}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setSelectedCategoryId((current) =>
                    current === String(category.id) ? null : String(category.id),
                  )
                }
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                  selectedCategoryId === String(category.id)
                    ? "bg-red-600 text-white"
                    : "bg-white text-gray-700 shadow-sm hover:bg-gray-50"
                }`}
              >
                {t(category.name)}
              </button>
            ))}
          </div>
        )}

        {/* ── Section title ───────────────────────────────────────────────── */}
        <h2 className="text-[17px] font-bold text-gray-900">
          {selectedCategoryId
            ? t(categories.find((c) => String(c.id) === selectedCategoryId)?.name)
            : tr("all_products")}
        </h2>

        {/* ── Product Grid ────────────────────────────────────────────────── */}
        {productsLoading && visibleProducts.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : mixedItems.length === 0 ? (
          <EmptyState
            title={tr("empty_products")}
            description={tr("empty_products_sub")}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {mixedItems.map((item, index) => {
                if (item._type === "store") {
                  return (
                    <PrimeStoreInline
                      key={`store-${item.data.id}-${index}`}
                      store={item.data}
                    />
                  );
                }

                const product = item.data;
                const price = (product as any).store_products?.[0]?.price;
                const img = product.images?.[0]?.url;

                return (
                  <button
                    key={`product-${product.id}`}
                    type="button"
                    onClick={() => setActiveProduct(product)}
                    className="relative overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:shadow-md"
                  >
                    {img ? (
                      <img
                        src={imageUrl(img)!}
                        alt={t(product.name)}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-gray-100">
                        <ShoppingBagIcon className="h-9 w-9 text-red-200" />
                      </div>
                    )}

                    <div className="p-3 pb-4">
                      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-gray-900">
                        {t(product.name)}
                      </p>
                      {price != null && (
                        <p className="mt-1 text-sm font-bold text-red-600">
                          {formatMoney(price)}
                        </p>
                      )}
                    </div>

                    {/* + button */}
                    <div className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 shadow-sm">
                      <PlusIcon className="h-4 w-4 text-white" />
                    </div>
                  </button>
                );
              })}
            </div>

            {isFetchingNextPage && (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={`next-${i}`} />
                ))}
              </div>
            )}

            {hasNextPage && <div ref={loadMoreRef} className="h-4 w-full" />}
          </>
        )}
      </div>

      {/* ── Floating cart button ──────────────────────────────────────────── */}
      {totalCartItems > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-20 px-4 sm:bottom-6">
          <Button
            className="h-14 w-full rounded-2xl shadow-lg"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBagIcon />
            {tr("cart_send")}
            <span className="rounded-full bg-white/16 px-2 py-0.5 text-xs">
              {totalCartItems}
            </span>
          </Button>
        </div>
      )}

      {/* ── Drawers / Sheets ─────────────────────────────────────────────── */}
      <ProductDrawer
        open={!!activeProduct}
        product={activeProduct}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setActiveProduct(null);
        }}
      />

      <BroadcastCartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
