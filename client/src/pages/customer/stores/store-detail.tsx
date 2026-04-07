import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellIcon,
  BellOffIcon,
  ChevronUpIcon,
  MessageCircleIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { api } from "@/api/api";
import EmptyState from "@/components/common/empty-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiscoveryPreferences } from "@/hooks/use-discovery-preferences";
import type { ICategory } from "@/interfaces/category.interface";
import { getClickPaymentUrl } from "@/services/payment.service";
import {
  calculateDeliveryQuote,
  extractErrorMessage,
  getDeliveryPolicySummary,
  formatMoney,
} from "@/lib/market";
import { t } from "@/lib/i18n";
import { useLang } from "@/context/lang.context";
import type {
  PaginatedResponse,
  SavedLocation,
  StoreProduct,
  StoreSummary,
} from "@/interfaces/market.interface";

const STORE_PRODUCTS_PAGE_SIZE = 12;

function StoreProductCardSkeleton() {
  return (
    <div className="rounded-[1.45rem] border border-white/70 bg-white/92 p-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.25)]">
      <Skeleton className="aspect-[0.98] rounded-[1.1rem]" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-4/5 rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-2/3 rounded-full" />
        <Skeleton className="h-8 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function StoreDetail() {
  const { lang } = useLang();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { location, setLocation, address, setAddress, requestCurrentLocation } =
    useDiscoveryPreferences();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [productCache, setProductCache] = useState<
    Record<string, StoreProduct>
  >({});
  const [orderError, setOrderError] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CLICK">("CASH");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hasScrolledForFloatingCart, setHasScrolledForFloatingCart] =
    useState(false);
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim();

  const { data: savedLocations = [], isFetched: isLocationsFetched } = useQuery(
    {
      queryKey: ["locations", "my"],
      queryFn: async () =>
        (await api.get<SavedLocation[]>("/locations/my")).data,
      staleTime: 60000,
    },
  );

  useEffect(() => {
    if (
      !location &&
      !selectedLocationId &&
      isLocationsFetched &&
      savedLocations.length === 0
    ) {
      requestCurrentLocation().catch(() => undefined);
    }
  }, [
    isLocationsFetched,
    location,
    requestCurrentLocation,
    savedLocations.length,
    selectedLocationId,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 680);
      setHasScrolledForFloatingCart(window.scrollY > 220);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const summaryElement = summaryRef.current;

    if (!summaryElement || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSummaryVisible(entry.isIntersecting);
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(summaryElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  const { data: store } = useQuery({
    queryKey: ["store", id],
    queryFn: async () => (await api.get<StoreSummary>(`/stores/${id}`)).data,
    enabled: !!id,
    staleTime: 60000,
  });

  const { data: isSubscribed = false } = useQuery({
    queryKey: ["store", id, "subscribed"],
    queryFn: async () =>
      (await api.get<{ subscribed: boolean }>(`/stores/${id}/subscribed`)).data
        .subscribed,
    enabled: !!id,
    staleTime: 30000,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => api.post(`/stores/${id}/subscribe`),
    onSuccess: () => {
      queryClient.setQueryData(["store", id, "subscribed"], true);
      toast.success("Do'konga obuna bo'ldingiz");
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => api.delete(`/stores/${id}/subscribe`),
    onSuccess: () => {
      queryClient.setQueryData(["store", id, "subscribed"], false);
      toast.success("Obunadan chiqildingiz");
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const { data: storeCategories = [] } = useQuery({
    queryKey: ["store-products", "categories", id],
    queryFn: async () =>
      (
        await api.get<ICategory[]>("/store-products/categories", {
          params: { store_id: id },
        })
      ).data,
    enabled: !!id,
    staleTime: 60000,
  });

  const {
    data: productPages,
    isLoading: productsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "store-products",
      "catalog",
      id,
      normalizedSearch,
      selectedCategoryId,
    ],
    enabled: !!id,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<PaginatedResponse<StoreProduct>>(
          "/store-products/catalog",
          {
            params: {
              store_id: id,
              q: normalizedSearch || undefined,
              category_id: selectedCategoryId || undefined,
              page:
                typeof pageParam === "number"
                  ? pageParam
                  : Number(pageParam ?? 1),
              limit: STORE_PRODUCTS_PAGE_SIZE,
            },
          },
        )
      ).data,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
    staleTime: 60000,
  });

  const products = useMemo(
    () => productPages?.pages.flatMap((page) => page.items) ?? [],
    [productPages],
  );

  const totalProducts = productPages?.pages[0]?.meta.total ?? products.length;

  useEffect(() => {
    if (selectedLocationId || location || !savedLocations.length) {
      return;
    }

    const preferredLocation =
      savedLocations.find((item) => item.is_default) ?? savedLocations[0];

    if (!preferredLocation) {
      return;
    }

    setSelectedLocationId(preferredLocation.id);
    setLocation({
      lat: Number(preferredLocation.lat),
      lng: Number(preferredLocation.lng),
    });
    setAddress(preferredLocation.address_line);
  }, [location, savedLocations, selectedLocationId, setAddress, setLocation]);

  useEffect(() => {
    setCart({});
    setProductCache({});
    setSearch("");
    setSelectedCategoryId(null);
    setPaymentMethod("CASH");
    setOrderError("");
  }, [id]);

  useEffect(() => {
    if (!products.length) {
      return;
    }

    setProductCache((current) => {
      const next = { ...current };

      for (const product of products) {
        next[product.id] = product;
      }

      return next;
    });
  }, [products]);

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
      { rootMargin: "420px 0px" },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    products.length,
    productsLoading,
  ]);

  const deliverySettings = store?.deliverySettings?.[0];
  const minOrder = deliverySettings?.min_order_amount ?? 0;
  const deliveryPolicy = useMemo(
    () => getDeliveryPolicySummary(deliverySettings),
    [deliverySettings],
  );
  const storeLocation = useMemo(() => {
    if (!store?.lat || !store?.lng) {
      return null;
    }

    return {
      lat: Number(store.lat),
      lng: Number(store.lng),
    };
  }, [store]);

  const addToCart = (productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
    setOrderError("");
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[productId] > 0) {
        newCart[productId] -= 1;
        if (newCart[productId] === 0) delete newCart[productId];
      }
      return newCart;
    });
  };

  const cartItems = useMemo(
    () => Object.entries(cart).filter(([, qty]) => qty > 0),
    [cart],
  );

  const productsById = useMemo(
    () => new Map(Object.entries(productCache)),
    [productCache],
  );

  const cartProducts = useMemo(
    () =>
      cartItems
        .map(([itemId, qty]) => {
          const product = productsById.get(itemId);

          if (!product) {
            return null;
          }

          return { product, qty };
        })
        .filter(
          (item): item is { product: StoreProduct; qty: number } =>
            item !== null,
        ),
    [cartItems, productsById],
  );

  const totalPrice = useMemo(
    () =>
      cartProducts.reduce((sum, { product, qty }) => {
        return sum + (product?.price || 0) * qty;
      }, 0),
    [cartProducts],
  );

  const isBelowMinOrder =
    minOrder > 0 && totalPrice < minOrder && cartItems.length > 0;
  const deliveryQuote = useMemo(
    () => calculateDeliveryQuote(deliverySettings, storeLocation, location),
    [deliverySettings, location, storeLocation],
  );
  const isOutsideDeliveryRadius =
    location != null && deliveryQuote?.isDeliverable === false;
  const estimatedDeliveryPrice =
    location && deliveryQuote?.isDeliverable
      ? deliveryQuote.deliveryPrice
      : null;
  const orderTotal = totalPrice + (estimatedDeliveryPrice ?? 0);
  const shouldShowFloatingCart =
    cartProducts.length > 0 && hasScrolledForFloatingCart && !isSummaryVisible;

  const selectedLocation = useMemo(
    () => savedLocations.find((item) => item.id === selectedLocationId) ?? null,
    [savedLocations, selectedLocationId],
  );

  const locationSummary = useMemo(() => {
    if (selectedLocation) {
      return {
        title: selectedLocation.label,
        subtitle: selectedLocation.address_line,
      };
    }

    if (location) {
      return {
        title: "GPS manzil",
        subtitle:
          address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
      };
    }

    return null;
  }, [address, location, selectedLocation]);

  const handleUseGps = async () => {
    try {
      const nextLocation = await requestCurrentLocation();
      setSelectedLocationId(null);
      setAddress(
        `${nextLocation.lat.toFixed(6)}, ${nextLocation.lng.toFixed(6)}`,
      );
      setOrderError("");
    } catch {
      toast.error("Joylashuvni olib bo'lmadi");
    }
  };

  const handleOrder = async () => {
    if (cartItems.length === 0) return;
    setOrderError("");

    if (!location) {
      setOrderError("Joylashuvingizni aniqlash uchun GPS yoqing");
      return;
    }

    if (deliveryQuote?.isDeliverable === false) {
      setOrderError(
        "Tanlangan manzil do'kon yetkazib berish hududidan tashqarida",
      );
      return;
    }

    if (isBelowMinOrder) {
      setOrderError(
        `Minimal buyurtma: ${Number(minOrder).toLocaleString()} so'm`,
      );
      return;
    }

    try {
      setIsSubmittingOrder(true);
      const items = cartItems.map(([store_product_id, quantity]) => ({
        store_product_id,
        quantity,
      }));
      const order = (
        await api.post<{ id: string }>("/orders", {
          order_type: "DIRECT",
          store_id: id,
          items,
          payment_method: paymentMethod,
          delivery_lat: location.lat,
          delivery_lng: location.lng,
          delivery_address:
            address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        })
      ).data;

      setCart({});

      if (paymentMethod === "CLICK") {
        try {
          const payment = await getClickPaymentUrl(order.id);
          window.location.assign(payment.url);
          return;
        } catch (paymentError) {
          toast.error(
            extractErrorMessage(paymentError) ||
              "Buyurtma yaratildi, lekin to'lov sahifasi ochilmadi",
          );
          navigate(`/mobile/orders/${order.id}`);
          return;
        }
      }

      toast.success("Buyurtma muvaffaqiyatli yuborildi!");
      navigate("/mobile/orders");
    } catch (error) {
      setOrderError(extractErrorMessage(error));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="space-y-5 px-4 pb-32 pt-4">
      {shouldShowFloatingCart ? (
        <section className="sticky top-3 z-20 rounded-[1.7rem] border border-white/80 bg-white/92 p-3 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] bg-primary text-primary-foreground shadow-[0_16px_30px_-18px_rgba(220,38,38,0.8)]">
                <ShoppingBagIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  Savatda {cartProducts.length} tur mahsulot
                </p>
                <p className="text-xs text-slate-500">
                  Jami: {formatMoney(orderTotal)}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="h-9 rounded-full px-4 text-xs font-semibold"
              onClick={handleOrder}
              disabled={isBelowMinOrder || isSubmittingOrder}
            >
              {paymentMethod === "CLICK" ? "Online" : "Buyurtma"}
            </Button>
          </div>

          <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
            {cartProducts.map(({ product, qty }) => (
              <div
                key={product.id}
                className="min-w-[215px] rounded-[1.3rem] border border-slate-200 bg-[linear-gradient(180deg,#fffdfd,#fff5f6)] p-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[1rem] bg-slate-100">
                    {product.product.images?.[0]?.url ? (
                      <img
                        src={product.product.images[0].url}
                        alt={t(product.product.name, lang)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">
                        📦
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {t(product.product.name, lang)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {formatMoney(product.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition active:scale-95"
                      >
                        <MinusIcon className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-6 text-center text-xs font-semibold text-slate-900">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => addToCart(product.id)}
                        disabled={
                          product.status !== "ACTIVE" || product.stock === 0
                        }
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-white transition active:scale-95",
                          product.status !== "ACTIVE" || product.stock === 0
                            ? "bg-slate-200 text-slate-400"
                            : "bg-primary",
                        )}
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.35)]">
        <div className="relative h-52 bg-[linear-gradient(135deg,#fff1f2,#f8fbff)]">
          {store?.banner ? (
            <img
              src={store.banner}
              alt={store.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">
              🏪
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent px-5 py-5 text-white">
            <div className="flex items-end gap-4">
              <div className="h-18 w-18 overflow-hidden rounded-[1.35rem] border border-white/40 bg-white shadow-lg">
                {store?.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-3xl text-slate-900">
                    🏪
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-semibold">{store?.name}</h1>
                <p className="mt-1 text-sm text-white/80">
                  ⭐ {Number(store?.rating ?? 0).toFixed(1)} ·{" "}
                  {store?.is_open ? "Hozir ochiq" : "Hozir yopiq"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  onClick={() =>
                    isSubscribed
                      ? unsubscribeMutation.mutate()
                      : subscribeMutation.mutate()
                  }
                  disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
                  className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
                >
                  {isSubscribed ? (
                    <><BellOffIcon className="h-3.5 w-3.5" />Obunani bekor qilish</>
                  ) : (
                    <><BellIcon className="h-3.5 w-3.5" />Obuna bo'lish</>
                  )}
                </button>
                <button
                  onClick={() => navigate(`/mobile/chat?store_id=${id}&store_name=${encodeURIComponent(store?.name ?? "")}`)}
                  className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25"
                >
                  <MessageCircleIcon className="h-3.5 w-3.5" />
                  Xabar yozish
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">
                {store?.address ?? "Manzil yo'q"}
              </p>
              <p className="mt-1">
                Minimal buyurtma: {formatMoney(minOrder)} · Yetkazib berish:{" "}
                {!location
                  ? "manzil tanlang"
                  : isOutsideDeliveryRadius
                    ? "hududdan tashqari"
                    : formatMoney(estimatedDeliveryPrice)}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {deliveryPolicy}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                <span className="text-primary">Siz turgan joygacha:</span>
                <span>
                  {!location
                    ? "manzil tanlang"
                    : isOutsideDeliveryRadius
                      ? "yetkazib bera olmaydi"
                      : formatMoney(estimatedDeliveryPrice)}
                </span>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Yetkazib berish nuqtasi
                  </h2>
                  <p className="text-sm text-slate-500">
                    Tayyor manzilni tanlang yoki GPS ishlating
                  </p>
                </div>
                <Button variant="outline" onClick={handleUseGps}>
                  GPS olish
                </Button>
              </div>
              <div className="mt-4">
                {locationSummary ? (
                  <div className="mb-4 rounded-[1.2rem] border border-primary/15 bg-primary/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                      Tanlangan manzil
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {locationSummary.title}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {locationSummary.subtitle}
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Hozircha delivery manzili tanlanmagan.
                  </div>
                )}

                <div className="mb-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Saqlangan manzillar
                    </p>
                    <Link
                      to="/mobile/locations"
                      className="text-xs font-semibold text-primary"
                    >
                      Boshqarish
                    </Link>
                  </div>

                  {savedLocations.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {savedLocations.map((savedLocation) => {
                        const isSelected =
                          savedLocation.id === selectedLocationId;

                        return (
                          <button
                            key={savedLocation.id}
                            type="button"
                            onClick={() => {
                              setSelectedLocationId(savedLocation.id);
                              setLocation({
                                lat: Number(savedLocation.lat),
                                lng: Number(savedLocation.lng),
                              });
                              setAddress(savedLocation.address_line);
                            }}
                            className={cn(
                              "rounded-[1.15rem] border px-4 py-3 text-left transition",
                              isSelected
                                ? "border-primary/15 bg-primary/10"
                                : "border-slate-200 bg-white",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-slate-900">
                                {savedLocation.label}
                              </p>
                              {savedLocation.is_default ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                  Asosiy
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {savedLocation.address_line}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[1.15rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Saqlangan manzil yo'q. Direct order uchun{" "}
                      <Link
                        to="/mobile/locations"
                        className="font-semibold text-primary"
                      >
                        locations sahifasida
                      </Link>{" "}
                      manzil qo'shing.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            ref={summaryRef}
            className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fff5f6)] p-4 lg:sticky lg:top-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">
                Buyurtma xulosasi
              </h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {cartItems.length} tur
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {cartItems.length === 0 ? (
                <p className="rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Savat bo'sh. Mahsulotlarni pastdagi ro'yxatdan qo'shing.
                </p>
              ) : (
                cartProducts.map(({ product, qty }) => {
                  if (!product) return null;

                  return (
                    <div
                      key={product.id}
                      className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[0.95rem] bg-slate-100">
                            {product.product.images?.[0]?.url ? (
                              <img
                                src={product.product.images[0].url}
                                alt={t(product.product.name, lang)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-lg">
                                📦
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {t(product.product.name, lang)}
                            </p>
                            <p className="text-sm text-slate-500">
                              {qty} x {formatMoney(product.price)}
                            </p>
                          </div>
                        </div>
                        <div className="pl-3 text-right">
                          <p className="text-sm text-slate-500">
                            {formatMoney(Number(product.price) * qty)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition active:scale-95"
                        >
                          <MinusIcon className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold text-slate-900">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(product.id)}
                          disabled={
                            product.status !== "ACTIVE" || product.stock === 0
                          }
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-white transition active:scale-95",
                            product.status !== "ACTIVE" || product.stock === 0
                              ? "bg-slate-200 text-slate-400"
                              : "bg-primary",
                          )}
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isBelowMinOrder ? (
              <p className="mt-4 rounded-[1.25rem] bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Minimal buyurtma uchun yana{" "}
                {formatMoney(Number(minOrder) - totalPrice)} qo'shing.
              </p>
            ) : null}

            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-950">
                To'lov usuli
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { value: "CASH" as const, label: "Naqd" },
                  { value: "CLICK" as const, label: "Online" },
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={cn(
                      "rounded-[1rem] border px-3 py-3 text-sm font-semibold transition",
                      paymentMethod === method.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-slate-200 bg-white text-slate-700",
                    )}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {isOutsideDeliveryRadius ? (
              <p className="mt-4 rounded-[1.25rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Tanlangan manzil do'konning yetkazib berish radiusiga kirmaydi.
              </p>
            ) : null}

            {orderError ? (
              <p className="mt-4 rounded-[1.25rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {orderError}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
              <span>Mahsulotlar</span>
              <span className="font-semibold text-slate-950">
                {formatMoney(totalPrice)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
              <span>Yetkazib berish</span>
              <span className="font-semibold text-slate-950">
                {!location
                  ? "—"
                  : isOutsideDeliveryRadius
                    ? "Hududdan tashqari"
                    : formatMoney(estimatedDeliveryPrice)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>Umumiy summa</span>
              <span className="text-2xl font-semibold text-slate-950">
                {formatMoney(orderTotal)}
              </span>
            </div>
            <Button
              className="mt-4 h-12 w-full rounded-[1.25rem] text-sm font-semibold"
              onClick={handleOrder}
              disabled={
                !cartItems.length ||
                isBelowMinOrder ||
                isOutsideDeliveryRadius ||
                isSubmittingOrder
              }
            >
              {paymentMethod === "CLICK"
                ? isSubmittingOrder
                  ? "Yo'naltirilmoqda..."
                  : "Online to'lovga o'tish"
                : isSubmittingOrder
                  ? "Yuborilmoqda..."
                  : "Buyurtma berish"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Do'kondagi mahsulotlar
            </h2>
            <p className="text-sm text-slate-500">
              Nom bo'yicha qidiring yoki kategoriya bilan saralang
            </p>
          </div>
          <span className="text-sm text-slate-400">
            {totalProducts > products.length
              ? `${products.length} / ${totalProducts} ta`
              : `${products.length} ta`}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3">
          <SearchIcon className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Do'kondan mahsulot qidiring"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        {storeCategories.length > 0 ? (
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                !selectedCategoryId
                  ? "border-slate-200 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary/15 hover:text-primary",
              )}
            >
              Hammasi
            </button>
            {storeCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setSelectedCategoryId((current) =>
                    current === category.id ? null : category.id,
                  )
                }
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  selectedCategoryId === category.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-slate-200 bg-white text-slate-700 hover:border-primary/15 hover:text-primary",
                )}
              >
                {t(category.name, lang)}
              </button>
            ))}
          </div>
        ) : null}

        {productsLoading && products.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <StoreProductCardSkeleton key={index} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="Mahsulot topilmadi"
            description="Qidiruv yoki kategoriya filtrini o'zgartirib ko'ring."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {products.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.45rem] border border-white/70 bg-white/92 p-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.25)]"
                >
                  <div className="mb-2 flex aspect-[0.98] items-center justify-center overflow-hidden rounded-[1.1rem] bg-muted">
                    {item.product.images?.[0]?.url ? (
                      <img
                        src={item.product.images[0].url}
                        alt={t(item.product.name, lang)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">📦</span>
                    )}
                  </div>
                  <p className="mb-1 line-clamp-2 min-h-10 text-sm font-semibold text-foreground">
                    {t(item.product.name, lang)}
                  </p>
                  <p className="font-bold text-primary">
                    {formatMoney(item.price)}
                  </p>
                  {item.product.category?.name ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {t(item.product.category.name, lang)}
                    </p>
                  ) : null}
                  {item.stock <= 5 && item.stock > 0 && (
                    <p className="mt-1 text-xs text-primary/80">
                      Omborda {item.stock} ta
                    </p>
                  )}
                  {item.stock === 0 && (
                    <p className="mt-1 text-xs font-medium text-red-500">
                      Tugagan
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      disabled={!cart[item.id]}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white disabled:opacity-50"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="flex-1 text-center text-sm font-medium">
                      {cart[item.id] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(item.id)}
                      disabled={item.status !== "ACTIVE" || item.stock === 0}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-white",
                        item.status !== "ACTIVE" || item.stock === 0
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary",
                      )}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {isFetchingNextPage ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <StoreProductCardSkeleton key={`next-page-${index}`} />
                ))}
              </div>
            ) : null}

            {hasNextPage ? (
              <div ref={loadMoreRef} className="h-4 w-full" />
            ) : null}
          </>
        )}
      </section>

      <Button
        type="button"
        size="icon"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "fixed bottom-28 right-4 z-30 h-12 w-12 rounded-full shadow-[0_20px_45px_-20px_rgba(220,38,38,0.75)] transition-all duration-300",
          showScrollTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <ChevronUpIcon className="h-5 w-5" />
      </Button>
    </div>
  );
}
