import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import LocationPickerMap from "@/components/maps/location-picker-map";
import { useDiscoveryPreferences } from "@/hooks/use-discovery-preferences";
import { extractErrorMessage, formatMoney } from "@/lib/market";
import type { StoreProduct, StoreSummary } from "@/interfaces/market.interface";

export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { location, setLocation, address, setAddress, requestCurrentLocation } =
    useDiscoveryPreferences();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    if (!location) {
      requestCurrentLocation().catch(() => undefined);
    }
  }, [location, requestCurrentLocation]);

  const { data: store } = useQuery({
    queryKey: ["store", id],
    queryFn: async () => (await api.get<StoreSummary>(`/stores/${id}`)).data,
    enabled: !!id,
    staleTime: 60000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["store-products", id],
    queryFn: async () =>
      (await api.get<StoreProduct[]>(`/store-products?store_id=${id}`)).data,
    enabled: !!id,
    staleTime: 60000,
  });

  const deliverySettings = store?.deliverySettings?.[0];
  const minOrder = deliverySettings?.min_order_amount ?? 0;

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

  const totalPrice = useMemo(
    () =>
      cartItems.reduce((sum, [itemId, qty]) => {
        const product = products.find((p) => p.id === itemId);
        return sum + (product?.price || 0) * qty;
      }, 0),
    [cartItems, products],
  );

  const isBelowMinOrder = minOrder > 0 && totalPrice < minOrder && cartItems.length > 0;

  const handleOrder = async () => {
    if (cartItems.length === 0) return;
    setOrderError("");

    if (!location) {
      setOrderError("Joylashuvingizni aniqlash uchun GPS yoqing");
      return;
    }

    if (isBelowMinOrder) {
      setOrderError(`Minimal buyurtma: ${Number(minOrder).toLocaleString()} so'm`);
      return;
    }

    try {
      const items = cartItems.map(([store_product_id, quantity]) => ({
        store_product_id,
        quantity,
      }));
      await api.post("/orders", {
        order_type: "DIRECT",
        store_id: id,
        items,
        delivery_lat: location.lat,
        delivery_lng: location.lng,
        delivery_address: address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
      });
      toast.success("Buyurtma muvaffaqiyatli yuborildi!");
      setCart({});
      navigate("/mobile/orders");
    } catch (error) {
      setOrderError(extractErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5 px-4 pb-32 pt-4">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.35)]">
        <div className="relative h-52 bg-[linear-gradient(135deg,#fff1e8,#f8fbff)]">
          {store?.banner ? (
            <img src={store.banner} alt={store.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">🏪</div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent px-5 py-5 text-white">
            <div className="flex items-end gap-4">
              <div className="h-18 w-18 overflow-hidden rounded-[1.35rem] border border-white/40 bg-white shadow-lg">
                {store?.logo ? (
                  <img src={store.logo} alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-3xl text-slate-900">
                    🏪
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{store?.name}</h1>
                <p className="mt-1 text-sm text-white/80">
                  ⭐ {Number(store?.rating ?? 0).toFixed(1)} ·{" "}
                  {store?.is_open ? "Hozir ochiq" : "Hozir yopiq"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{store?.address ?? "Manzil yo'q"}</p>
              <p className="mt-1">
                Minimal buyurtma: {formatMoney(minOrder)} · Delivery:{" "}
                {formatMoney(deliverySettings?.delivery_fee ?? 0)}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Yetkazib berish nuqtasi</h2>
                  <p className="text-sm text-slate-500">
                    Xarita ustiga bosib manzilni yangilashingiz mumkin
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => requestCurrentLocation().catch(() => undefined)}
                >
                  GPS olish
                </Button>
              </div>
              <div className="mt-4">
                <LocationPickerMap
                  center={location}
                  markers={[
                    ...(store?.lat && store?.lng
                      ? [
                          {
                            id: store.id,
                            lat: Number(store.lat),
                            lng: Number(store.lng),
                            label: store.name,
                            meta: "Do'kon joylashuvi",
                            tone: "store" as const,
                          },
                        ]
                      : []),
                    ...(location
                      ? [
                          {
                            id: "me",
                            lat: location.lat,
                            lng: location.lng,
                            label: "Mening manzilim",
                            meta: address || "Tanlangan delivery nuqtasi",
                            tone: "accent" as const,
                          },
                        ]
                      : []),
                  ]}
                  radiusKm={radiusKmFromMeters(Number(deliverySettings?.max_delivery_radius ?? 5000))}
                  interactive
                  onLocationSelect={setLocation}
                  className="h-full"
                />
              </div>
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Aniq yetkazib berish manzilini yozing"
                className="mt-4 h-24 w-full rounded-[1.25rem] border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fff7f1)] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Buyurtma xulosasi</h2>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                {cartItems.length} tur
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {cartItems.length === 0 ? (
                <p className="rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Savat bo'sh. Mahsulotlarni pastdagi ro'yxatdan qo'shing.
                </p>
              ) : (
                cartItems.map(([itemId, qty]) => {
                  const product = products.find((candidate) => candidate.id === itemId);
                  if (!product) return null;

                  return (
                    <div
                      key={itemId}
                      className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{product.product.name}</p>
                        <p className="text-sm text-slate-500">
                          {qty} x {formatMoney(product.price)}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-950">
                        {formatMoney(Number(product.price) * qty)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {isBelowMinOrder ? (
              <p className="mt-4 rounded-[1.25rem] bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Minimal buyurtma uchun yana {formatMoney(Number(minOrder) - totalPrice)} qo'shing.
              </p>
            ) : null}

            {orderError ? (
              <p className="mt-4 rounded-[1.25rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {orderError}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
              <span>Umumiy summa</span>
              <span className="text-2xl font-semibold text-slate-950">
                {formatMoney(totalPrice)}
              </span>
            </div>
            <Button
              className="mt-4 h-12 w-full rounded-[1.25rem] text-sm font-semibold"
              onClick={handleOrder}
              disabled={!cartItems.length || isBelowMinOrder}
            >
              Buyurtma berish
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Do'kondagi mahsulotlar</h2>
            <p className="text-sm text-slate-500">
              Narxlar do'kon tomonidan oldindan belgilangan
            </p>
          </div>
          {minOrder > 0 ? (
            <span className="text-sm text-slate-400">Min. {formatMoney(minOrder)}</span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((item) => (
            <div key={item.id} className="rounded-[1.6rem] border border-white/70 bg-white/90 p-4 shadow-sm">
              <div className="h-24 rounded-xl bg-muted mb-2 flex items-center justify-center overflow-hidden">
                {item.product.images?.[0]?.url ? (
                  <img
                    src={item.product.images[0].url}
                    alt={item.product.name}
                    className="h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">📦</span>
                )}
              </div>
              <p className="font-medium text-sm mb-1 text-foreground">{item.product.name}</p>
              <p className="text-amber-600 font-bold">{formatMoney(item.price)}</p>
              {item.stock <= 5 && item.stock > 0 && (
                <p className="text-xs text-orange-500">Omborda {item.stock} ta</p>
              )}
              {item.stock === 0 && (
                <p className="text-xs text-red-500 font-medium">Tugagan</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => removeFromCart(item.id)}
                  disabled={!cart[item.id]}
                  className="h-8 w-8 rounded-full border border-border disabled:opacity-50"
                >
                  -
                </button>
                <span className="flex-1 text-center text-sm font-medium">
                  {cart[item.id] || 0}
                </span>
                <button
                  onClick={() => addToCart(item.id)}
                  disabled={item.status !== "ACTIVE" || item.stock === 0}
                  className={cn(
                    "h-8 w-8 rounded-full text-white",
                    item.status !== "ACTIVE" || item.stock === 0
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary",
                  )}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function radiusKmFromMeters(value: number) {
  return Math.max(1, Math.round(value / 1000));
}
