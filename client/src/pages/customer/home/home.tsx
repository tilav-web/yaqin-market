import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  ChevronRightIcon,
  CrownIcon,
  LocateFixedIcon,
  MapPinIcon,
  SearchIcon,
  ShoppingBagIcon,
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
import { calculateDeliveryQuote, formatMoney } from "@/lib/market";
import { useBroadcastCartStore } from "@/stores/broadcast-cart.store";

type PromoTone = "prime" | "nearby" | "rated" | "value";

type PromoStore = {
  store: StoreSummary;
  badge: string;
  summary: string;
  description: string;
  tone: PromoTone;
};

type FeedItem =
  | {
      type: "product";
      product: ProductCatalogItem;
    }
  | {
      type: "store";
      promo: PromoStore;
    };

const PROMO_THEME: Record<
  PromoTone,
  {
    border: string;
    badge: string;
    panel: string;
  }
> = {
  prime: {
    border:
      "border-red-200 bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(239,68,68,0.9))]",
    badge: "bg-white/18 text-white",
    panel: "bg-white/14",
  },
  nearby: {
    border:
      "border-sky-200 bg-[linear-gradient(135deg,rgba(27,93,155,0.95),rgba(38,132,255,0.92))]",
    badge: "bg-white/18 text-white",
    panel: "bg-white/14",
  },
  rated: {
    border:
      "border-amber-200 bg-[linear-gradient(135deg,rgba(26,32,44,0.96),rgba(71,85,105,0.92))]",
    badge: "bg-white/16 text-white",
    panel: "bg-white/12",
  },
  value: {
    border:
      "border-emerald-200 bg-[linear-gradient(135deg,rgba(6,95,70,0.96),rgba(16,185,129,0.9))]",
    badge: "bg-white/18 text-white",
    panel: "bg-white/14",
  },
};

const PRODUCTS_PAGE_SIZE = 12;

function formatDistance(distance?: number | null) {
  if (distance == null) return "Yaqin";
  if (distance < 1000) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(1)} km`;
}

function getDeliveryFee(
  store: StoreSummary,
  location?: { lat: number; lng: number } | null,
) {
  if (location && store.lat && store.lng) {
    const quote = calculateDeliveryQuote(
      store.deliverySettings?.[0],
      {
        lat: Number(store.lat),
        lng: Number(store.lng),
      },
      location,
    );

    if (quote?.isDeliverable) {
      return Number(quote.deliveryPrice ?? 0);
    }
  }

  return Number(store.deliverySettings?.[0]?.delivery_fee ?? 0);
}

function dedupeStores(stores: StoreSummary[]) {
  const map = new Map<string, StoreSummary>();

  for (const store of stores) {
    if (!map.has(store.id)) {
      map.set(store.id, store);
    }
  }

  return Array.from(map.values());
}

function ProductFeedSkeleton() {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/92 p-3 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.26)]">
      <Skeleton className="aspect-[0.92] rounded-[1.25rem]" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-4/5 rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-2/3 rounded-full" />
        <Skeleton className="h-4 w-24 rounded-full" />
      </div>
    </div>
  );
}

export default function CustomerHome() {
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

  const { data: stores = [] } = useQuery({
    queryKey: ["stores", "nearby", location?.lat, location?.lng],
    queryFn: async () =>
      (
        await api.get<StoreSummary[]>(
          `/stores/nearby?lat=${location?.lat ?? 0}&lng=${location?.lng ?? 0}`,
        )
      ).data,
    enabled: !!location,
    staleTime: 60000,
  });

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

  const nearbyStores = useMemo(
    () => dedupeStores([...primeStores, ...stores]),
    [primeStores, stores],
  );

  const visibleProducts = useMemo(() => {
    return productPages?.pages.flatMap((page) => page.items) ?? [];
  }, [productPages]);

  const totalProducts = productPages?.pages[0]?.meta.total ?? visibleProducts.length;

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || !hasNextPage || isFetchingNextPage || productsLoading) {
      return;
    }

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

  const promoStores = useMemo(() => {
    if (!nearbyStores.length) return [] as PromoStore[];

    const rankedByPrime = [...(primeStores.length ? primeStores : nearbyStores)].sort(
      (left, right) =>
        Number(right.rating ?? 0) - Number(left.rating ?? 0) ||
        Number(left.distance_meters ?? Number.MAX_SAFE_INTEGER) -
          Number(right.distance_meters ?? Number.MAX_SAFE_INTEGER),
    );

    const nearestStore = [...nearbyStores].sort(
      (left, right) =>
        Number(left.distance_meters ?? Number.MAX_SAFE_INTEGER) -
        Number(right.distance_meters ?? Number.MAX_SAFE_INTEGER),
    )[0];

    const topRatedStore = [...nearbyStores].sort(
      (left, right) =>
        Number(right.rating ?? 0) - Number(left.rating ?? 0) ||
        Number(left.distance_meters ?? Number.MAX_SAFE_INTEGER) -
          Number(right.distance_meters ?? Number.MAX_SAFE_INTEGER),
    )[0];

    const bestValueStore = [...nearbyStores].sort(
      (left, right) =>
        getDeliveryFee(left, location) - getDeliveryFee(right, location) ||
        Number(left.distance_meters ?? Number.MAX_SAFE_INTEGER) -
          Number(right.distance_meters ?? Number.MAX_SAFE_INTEGER),
    )[0];

    const primaryStore = rankedByPrime[0] ?? nearestStore ?? topRatedStore ?? bestValueStore;
    const morePrimeStores = rankedByPrime.slice(1, 4);

    const candidates = [
      primaryStore
        ? {
            store: primaryStore,
            badge: primaryStore.is_prime ? "Prime tavsiya" : "Bugungi tavsiya",
            summary: `${Number(primaryStore.rating ?? 0).toFixed(1)} reyting`,
            description: `${formatDistance(primaryStore.distance_meters)} · ${formatMoney(getDeliveryFee(primaryStore, location))} delivery`,
            tone: "prime" as const,
          }
        : null,
      nearestStore
        ? {
            store: nearestStore,
            badge: "Sizga eng yaqin",
            summary: formatDistance(nearestStore.distance_meters),
            description: "Hozir shu do'kondan tez buyurtma berish mumkin",
            tone: "nearby" as const,
          }
        : null,
      topRatedStore
        ? {
            store: topRatedStore,
            badge: "Eng nufuzli",
            summary: `⭐ ${Number(topRatedStore.rating ?? 0).toFixed(1)}`,
            description: "Atrofdagi eng yaxshi baholangan do'konlardan biri",
            tone: "rated" as const,
          }
        : null,
      bestValueStore
        ? {
            store: bestValueStore,
            badge: "Eng qulay",
            summary: formatMoney(getDeliveryFee(bestValueStore, location)),
            description: "Delivery narxi qulay bo'lgan yaqin do'kon",
            tone: "value" as const,
          }
        : null,
      ...morePrimeStores.map((store) => ({
        store,
        badge: store.is_prime ? "Prime" : "Yaqin do'kon",
        summary: `${Number(store.rating ?? 0).toFixed(1)} reyting`,
        description: `${formatDistance(store.distance_meters)} · ${formatMoney(getDeliveryFee(store, location))} delivery`,
        tone: "prime" as const,
      })),
    ].filter((item): item is PromoStore => item !== null);

    const unique = new Map<string, PromoStore>();

    for (const promo of candidates) {
      if (!unique.has(promo.store.id)) {
        unique.set(promo.store.id, promo);
      }
    }

    return Array.from(unique.values());
  }, [location, nearbyStores, primeStores]);

  const feedItems = useMemo(() => {
    if (!visibleProducts.length) return [] as FeedItem[];

    const items: FeedItem[] = [];
    let promoIndex = 0;

    if (promoStores[promoIndex]) {
      items.push({ type: "store", promo: promoStores[promoIndex] });
      promoIndex += 1;
    }

    visibleProducts.forEach((product, index) => {
      items.push({ type: "product", product });

      if (!promoStores[promoIndex]) return;

      const shouldInsertPromo = index === 1 || (index + 1) % 4 === 0;

      if (shouldInsertPromo) {
        items.push({ type: "store", promo: promoStores[promoIndex] });
        promoIndex += 1;
      }
    });

    return items;
  }, [promoStores, visibleProducts]);

  return (
    <div className="min-h-screen pb-32">
      <div className="space-y-5 px-4 pb-10 pt-4">
        <header className="rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,244,245,0.98))] p-4 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetCatalogFilters}
              className="shrink-0 rounded-2xl transition active:scale-[0.98]"
              aria-label="Filterlarni tozalash"
            >
              <img
                src="/logo-web.png"
                alt="Yaqin Market"
                className="h-9 w-auto sm:h-10"
              />
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => requestCurrentLocation().catch(() => undefined)}
              >
                <LocateFixedIcon />
                GPS
              </Button>
              <Button
                size="sm"
                className="rounded-full px-4"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingBagIcon />
                Savat {totalCartItems ? `(${totalCartItems})` : ""}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3">
            <SearchIcon className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Mahsulot yoki kategoriya"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <MapPinIcon className="h-3.5 w-3.5" />
              {location ? "Joylashuv tayyor" : "Joylashuv olinmoqda"}
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              <CrownIcon className="h-3.5 w-3.5 text-primary" />
              {primeStores.length} prime
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              <StarIcon className="h-3.5 w-3.5 text-amber-500" />
              {stores.length} yaqin do'kon
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={resetCatalogFilters}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  !selectedCategoryId
                    ? "border-slate-200 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-primary/15 hover:text-primary"
                }`}
              >
                Hammasi
              </button>
              {categories.slice(0, 10).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategoryId((current) =>
                      current === String(category.id) ? null : String(category.id),
                    )
                  }
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedCategoryId === String(category.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-slate-200 bg-white text-slate-700 hover:border-primary/15 hover:text-primary"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Feed</h2>
            <span className="text-sm text-slate-400">
              {totalProducts > visibleProducts.length
                ? `${visibleProducts.length} / ${totalProducts} ta`
                : `${visibleProducts.length} ta`}
            </span>
          </div>

          {productsLoading && visibleProducts.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProductFeedSkeleton key={index} />
              ))}
            </div>
          ) : feedItems.length === 0 ? (
            <EmptyState
              title="Mahsulot topilmadi"
              description="Qidiruv yoki kategoriya filtrini o'zgartirib ko'ring."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {feedItems.map((item, index) => {
                  if (item.type === "store") {
                    const { promo } = item;
                    const theme = PROMO_THEME[promo.tone];
                    const deliveryFee = getDeliveryFee(promo.store, location);

                    return (
                      <Link
                        key={`${promo.store.id}-${promo.badge}-${index}`}
                        to={`/mobile/stores/${promo.store.id}`}
                        className={`col-span-full overflow-hidden rounded-[1.9rem] border text-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.55)] ${theme.border}`}
                      >
                        <div className="relative overflow-hidden">
                          {promo.store.banner ? (
                            <img
                              src={promo.store.banner}
                              alt={promo.store.name}
                              className="absolute inset-0 h-full w-full object-cover opacity-20"
                            />
                          ) : null}

                          <div className="relative grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                            <div className="flex items-start gap-3">
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.35rem] border border-white/25 bg-white/90">
                                {promo.store.logo ? (
                                  <img
                                    src={promo.store.logo}
                                    alt={promo.store.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-2xl text-slate-900">
                                    🏪
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}
                                >
                                  {promo.tone === "prime" ? (
                                    <CrownIcon className="h-3.5 w-3.5" />
                                  ) : null}
                                  {promo.badge}
                                </div>

                                <h3 className="mt-3 text-xl font-semibold leading-tight md:text-2xl">
                                  {promo.store.name}
                                </h3>

                                <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-white/80">
                                  <span>⭐ {Number(promo.store.rating ?? 0).toFixed(1)}</span>
                                  <span>{formatDistance(promo.store.distance_meters)}</span>
                                  <span>{formatMoney(deliveryFee)} delivery</span>
                                </div>

                                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/86">
                                  {promo.store.address ?? promo.description}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className={`rounded-[1.35rem] p-4 ${theme.panel}`}>
                                <p className="text-xs uppercase tracking-[0.2em] text-white/55">
                                  Tavsiya
                                </p>
                                <p className="mt-2 text-2xl font-semibold">{promo.summary}</p>
                                <p className="mt-1 text-sm text-white/80">
                                  {promo.description}
                                </p>
                              </div>

                              <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                                Do'konni ochish
                                <ChevronRightIcon className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  }

                  const { product } = item;
                  const childCount =
                    product.children?.filter((child) => child.is_active !== false).length ?? 0;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setActiveProduct(product)}
                      className="group rounded-[1.5rem] border border-white/70 bg-white/92 p-3 text-left shadow-[0_18px_48px_-40px_rgba(15,23,42,0.26)] transition hover:-translate-y-0.5"
                    >
                      <div className="relative aspect-[0.92] overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,#fff1f1,#f8fbff)]">
                        {product.images?.[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-4xl">
                            📦
                          </div>
                        )}

                        {product.category?.name ? (
                          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                            {product.category.name}
                          </span>
                        ) : null}

                        {childCount > 0 ? (
                          <span className="absolute right-2 top-2 rounded-full bg-slate-950/86 px-2.5 py-1 text-[11px] font-semibold text-white">
                            {childCount} variant
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3">
                        <p className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-950">
                          {product.name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {product.description ?? product.category?.name ?? "Mahsulot tafsiloti"}
                        </p>
                        <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                          {childCount > 0 ? "Variant tanlash" : "Savatga qo'shish"}
                          <ChevronRightIcon className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {isFetchingNextPage ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <ProductFeedSkeleton key={`next-page-${index}`} />
                  ))}
                </div>
              ) : null}

              {hasNextPage ? <div ref={loadMoreRef} className="h-4 w-full" /> : null}
            </>
          )}
        </section>
      </div>

      {totalCartItems > 0 ? (
        <div className="fixed inset-x-0 bottom-24 z-20 px-4 sm:bottom-6">
          <Button
            className="h-14 w-full rounded-[1.4rem] shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBagIcon />
            Savatni yuborish
            <span className="rounded-full bg-white/16 px-2 py-0.5 text-xs">
              {totalCartItems}
            </span>
          </Button>
        </div>
      ) : null}

      <ProductDrawer
        open={!!activeProduct}
        product={activeProduct}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setActiveProduct(null);
          }
        }}
      />

      <BroadcastCartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
