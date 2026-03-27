import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ChevronRightIcon,
  CrownIcon,
  LocateFixedIcon,
  MapPinIcon,
  SearchIcon,
  SendIcon,
  StarIcon,
} from "lucide-react";
import { api } from "@/api/api";
import EmptyState from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import type { ICategory } from "@/interfaces/category.interface";
import type { ProductCatalogItem, StoreSummary } from "@/interfaces/market.interface";
import { useDiscoveryPreferences } from "@/hooks/use-discovery-preferences";
import { formatMoney } from "@/lib/market";

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
      "border-orange-200 bg-[linear-gradient(135deg,rgba(255,150,92,0.95),rgba(255,113,52,0.9))]",
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

function formatDistance(distance?: number | null) {
  if (distance == null) return "Yaqin";
  if (distance < 1000) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(1)} km`;
}

function getDeliveryFee(store: StoreSummary) {
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

export default function CustomerHome() {
  const [search, setSearch] = useState("");
  const { location, requestCurrentLocation } = useDiscoveryPreferences();

  useEffect(() => {
    if (!location) {
      requestCurrentLocation().catch(() => undefined);
    }
  }, [location, requestCurrentLocation]);

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

  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => (await api.get<ProductCatalogItem[]>("/products")).data,
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

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase();

    return products.filter((product) => {
      const productName = product.name.toLowerCase();
      const categoryName = product.category?.name?.toLowerCase() ?? "";
      return productName.includes(term) || categoryName.includes(term);
    });
  }, [products, search]);

  const visibleProducts = useMemo(
    () => (search.trim() ? filteredProducts : filteredProducts.slice(0, 24)),
    [filteredProducts, search],
  );

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
        getDeliveryFee(left) - getDeliveryFee(right) ||
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
            description: `${formatDistance(primaryStore.distance_meters)} · ${formatMoney(getDeliveryFee(primaryStore))} delivery`,
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
            summary: formatMoney(getDeliveryFee(bestValueStore)),
            description: "Delivery narxi qulay bo'lgan yaqin do'kon",
            tone: "value" as const,
          }
        : null,
      ...morePrimeStores.map((store) => ({
        store,
        badge: store.is_prime ? "Prime" : "Yaqin do'kon",
        summary: `${Number(store.rating ?? 0).toFixed(1)} reyting`,
        description: `${formatDistance(store.distance_meters)} · ${formatMoney(getDeliveryFee(store))} delivery`,
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
  }, [nearbyStores, primeStores]);

  const feedItems = useMemo(() => {
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
    <div className="min-h-screen pb-28">
      <div className="space-y-5 px-4 pb-10 pt-4">
        <header className="rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(255,124,61,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,246,238,0.98))] p-4 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <img
              src="/logo-web.png"
              alt="Yaqin Market"
              className="h-9 w-auto sm:h-10"
            />

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
              <Link to="/mobile/broadcast/new">
                <Button size="sm" className="rounded-full px-4">
                  <SendIcon />
                  Broadcast
                </Button>
              </Link>
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

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
              <MapPinIcon className="h-3.5 w-3.5" />
              {location ? "Joylashuv tayyor" : "Joylashuv olinmoqda"}
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              <CrownIcon className="h-3.5 w-3.5 text-orange-500" />
              {primeStores.length} prime
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              <StarIcon className="h-3.5 w-3.5 text-amber-500" />
              {stores.length} yaqin do'kon
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSearch("")}
                className="shrink-0 rounded-full border border-slate-200 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Hammasi
              </button>
              {categories.slice(0, 10).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSearch(category.name)}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
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
            <span className="text-sm text-slate-400">{filteredProducts.length} ta</span>
          </div>

          {feedItems.length === 0 ? (
            <EmptyState
              title="Mahsulot topilmadi"
              description="Qidiruvni o'zgartirib ko'ring yoki GPS ni yangilang."
              actionLabel="Broadcast so'rov yuborish"
              actionTo="/mobile/broadcast/new"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {feedItems.map((item, index) => {
                if (item.type === "store") {
                  const { promo } = item;
                  const theme = PROMO_THEME[promo.tone];
                  const deliveryFee = getDeliveryFee(promo.store);

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
                                {promo.tone === "prime" ? <CrownIcon className="h-3.5 w-3.5" /> : null}
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

                return (
                  <Link
                    key={product.id}
                    to={`/mobile/products/${product.id}`}
                    className="group rounded-[1.5rem] border border-white/70 bg-white/92 p-3 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.26)] transition hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-[0.92] overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,#fff1e8,#f8fbff)]">
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
                    </div>

                    <div className="mt-3">
                      <p className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-950">
                        {product.name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {product.description ?? product.category?.name ?? "Mahsulot tafsiloti"}
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-orange-700">
                        Narxlarni ko'rish
                        <ChevronRightIcon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
