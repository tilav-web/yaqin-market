import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../api/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StoreProduct {
  id: string;
  product: {
    id: number;
    name: string;
    images: { url: string; is_main: boolean }[];
  };
  price: number;
  stock: number;
  status: string;
}

export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
      );
    }
  }, []);

  const { data: storeRes } = useQuery({
    queryKey: ["store", id],
    queryFn: () => api.get(`/stores/${id}`),
    enabled: !!id,
    staleTime: 60000,
  });

  const { data: productsRes } = useQuery({
    queryKey: ["store-products", id],
    queryFn: () => api.get(`/store-products?store_id=${id}`),
    enabled: !!id,
    staleTime: 60000,
  });

  const store = storeRes?.data;
  const products: StoreProduct[] = productsRes?.data ?? [];
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
    } catch (err: any) {
      setOrderError(err?.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  return (
    <div className="min-h-screen pb-28">
      <div className="relative h-48 overflow-hidden rounded-b-3xl bg-muted">
        {store?.banner && (
          <img src={store.banner} alt={store.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute bottom-4 left-4 flex items-end gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-border bg-white shadow">
            {store?.logo ? (
              <img src={store.logo} alt={store.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl">🏪</span>
            )}
          </div>
          <div className="text-white">
            <h1 className="text-xl font-semibold drop-shadow">{store?.name}</h1>
            <p className="text-xs opacity-90">⭐ {store?.rating} • {store?.is_open ? "Ochiq" : "Yopiq"}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <input
          type="text"
          placeholder="Yetkazib berish manzili (ixtiyoriy)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none"
        />
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Mahsulotlar</h2>
          {minOrder > 0 && (
            <span className="text-xs text-muted-foreground">
              Minimal buyurtma: {Number(minOrder).toLocaleString()} so'm
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {products.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-background p-3">
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
              <p className="text-amber-600 font-bold">
                {Number(item.price).toLocaleString()} so'm
              </p>
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
      </div>

      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur">
          {isBelowMinOrder && (
            <p className="text-xs text-orange-600 mb-2">
              Minimal buyurtma: {Number(minOrder).toLocaleString()} so'm (yana{" "}
              {(Number(minOrder) - totalPrice).toLocaleString()} so'm qo'shing)
            </p>
          )}
          {orderError && (
            <p className="text-xs text-red-600 mb-2">{orderError}</p>
          )}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">{cartItems.length} ta mahsulot</span>
            <span className="text-xl font-semibold text-foreground">{totalPrice.toLocaleString()} so'm</span>
          </div>
          <button
            onClick={handleOrder}
            disabled={isBelowMinOrder}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Buyurtma berish
          </button>
        </div>
      )}
    </div>
  );
}
