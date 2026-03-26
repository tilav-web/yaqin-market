import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../api/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Skeleton } from "../../../components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StoreDeliverySettings {
  min_order_amount: number;
  delivery_fee: number;
  preparation_time: number;
  free_delivery_radius: number;
  delivery_price_per_km: number;
  max_delivery_radius: number;
  is_delivery_enabled: boolean;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  rating: number;
  is_active: boolean;
  is_prime: boolean;
  lat?: number;
  lng?: number;
  phone?: string;
  address?: string;
  today_hours?: {
    open_time: string;
    close_time: string;
    is_open: boolean;
  } | null;
  deliverySettings?: StoreDeliverySettings[];
}

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
  is_prime: boolean;
}

export default function SellerStore() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: "",
    phone: "",
    address: "",
    lat: "",
    lng: "",
  });
  const [deliveryForm, setDeliveryForm] = useState({
    min_order_amount: "",
    delivery_fee: "",
    preparation_time: "",
    free_delivery_radius: "",
    delivery_price_per_km: "",
    max_delivery_radius: "",
    is_delivery_enabled: true,
  });

  const { data: storesRes, isLoading: storesLoading } = useQuery({
    queryKey: ["seller", "stores"],
    queryFn: () => api.get("/stores/my"),
  });

  const stores: Store[] = storesRes?.data || [];
  const store = stores[0];

  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ["store-products", store?.id],
    queryFn: () => api.get(`/store-products?store_id=${store?.id}&include_inactive=true`),
    enabled: !!store?.id,
  });

  const products: StoreProduct[] = productsRes?.data || [];
  const settings = useMemo(
    () => store?.deliverySettings?.[0],
    [store?.deliverySettings],
  );

  useEffect(() => {
    if (!store) return;
    setStoreForm({
      name: store.name ?? "",
      phone: store.phone ?? "",
      address: store.address ?? "",
      lat: store.lat ? String(store.lat) : "",
      lng: store.lng ? String(store.lng) : "",
    });
  }, [store]);

  useEffect(() => {
    if (!settings) return;
    setDeliveryForm({
      min_order_amount: String(settings.min_order_amount ?? 0),
      delivery_fee: String(settings.delivery_fee ?? 0),
      preparation_time: String(settings.preparation_time ?? 15),
      free_delivery_radius: String(settings.free_delivery_radius ?? 0),
      delivery_price_per_km: String(settings.delivery_price_per_km ?? 2000),
      max_delivery_radius: String(settings.max_delivery_radius ?? 10000),
      is_delivery_enabled: settings.is_delivery_enabled ?? true,
    });
  }, [settings]);

  const updateStore = useMutation({
    mutationFn: (data: Partial<Store>) => api.put(`/stores/${store?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller", "stores"] });
      setIsEditing(false);
      toast.success("Do'kon ma'lumotlari yangilandi");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Do'konni yangilashda xatolik",
      );
    },
  });

  const updateSettings = useMutation({
    mutationFn: (data: any) =>
      api.put(`/stores/${store?.id}/delivery-settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller", "stores"] });
      toast.success("Yetkazib berish sozlamalari saqlandi");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Sozlamalarni yangilashda xatolik",
      );
    },
  });

  const setPrice = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) =>
      api.post(`/store-products/${id}/price?store_id=${store?.id}`, { price }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-products", store?.id] });
    },
  });

  if (storesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Mening do'konim</h1>
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm text-muted-foreground mb-4">
            Sizda hali do'kon yo'q. Yangi do'kon yaratish uchun admin bilan bog'laning.
          </p>
          <Button variant="outline">So'rov yuborish</Button>
        </div>
      </div>
    );
  }

  const handleSaveStore = () => {
    updateStore.mutate({
      name: storeForm.name,
      phone: storeForm.phone,
      address: storeForm.address,
      lat: storeForm.lat ? Number(storeForm.lat) : undefined,
      lng: storeForm.lng ? Number(storeForm.lng) : undefined,
    });
  };

  const handleSaveDelivery = () => {
    updateSettings.mutate({
      min_order_amount: Number(deliveryForm.min_order_amount) || 0,
      delivery_fee: Number(deliveryForm.delivery_fee) || 0,
      preparation_time: Number(deliveryForm.preparation_time) || 0,
      free_delivery_radius: Number(deliveryForm.free_delivery_radius) || 0,
      delivery_price_per_km: Number(deliveryForm.delivery_price_per_km) || 0,
      max_delivery_radius: Number(deliveryForm.max_delivery_radius) || 0,
      is_delivery_enabled: deliveryForm.is_delivery_enabled,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card/90 p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Do'konim
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              {store.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {store.address ?? "Manzil kiritilmagan"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-semibold",
                  store.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700",
                )}
              >
                {store.is_active ? "Faol" : "Faol emas"}
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                ⭐ {Number(store.rating ?? 0).toFixed(1)}
              </span>
              {store.is_prime && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-semibold text-indigo-700">
                  Prime
                </span>
              )}
              {store.today_hours && (
                <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
                  {store.today_hours.is_open ? "Ochiq" : "Yopiq"} · {store.today_hours.open_time} - {store.today_hours.close_time}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={() => setIsEditing((prev) => !prev)}>
            {isEditing ? "Bekor qilish" : "Tahrirlash"}
          </Button>
        </div>

        {isEditing && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Input
              placeholder="Do'kon nomi"
              value={storeForm.name}
              onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
            />
            <Input
              placeholder="Telefon"
              value={storeForm.phone}
              onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
            />
            <Input
              placeholder="Manzil"
              value={storeForm.address}
              onChange={(e) =>
                setStoreForm({ ...storeForm, address: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Input
                placeholder="Latitude"
                type="number"
                value={storeForm.lat}
                onChange={(e) => setStoreForm({ ...storeForm, lat: e.target.value })}
              />
              <Input
                placeholder="Longitude"
                type="number"
                value={storeForm.lng}
                onChange={(e) => setStoreForm({ ...storeForm, lng: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={handleSaveStore} disabled={updateStore.isPending}>
                {updateStore.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card/90 p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Yetkazib berish sozlamalari
          </h2>
          <p className="text-sm text-muted-foreground">
            Minimal buyurtma va yetkazib berish narxlarini sozlang.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Minimal buyurtma (so'm)"
            value={deliveryForm.min_order_amount}
            onChange={(e) =>
              setDeliveryForm({ ...deliveryForm, min_order_amount: e.target.value })
            }
          />
          <Input
            placeholder="Yetkazib berish narxi (so'm)"
            value={deliveryForm.delivery_fee}
            onChange={(e) =>
              setDeliveryForm({ ...deliveryForm, delivery_fee: e.target.value })
            }
          />
          <Input
            placeholder="Tayyorlash vaqti (min)"
            value={deliveryForm.preparation_time}
            onChange={(e) =>
              setDeliveryForm({ ...deliveryForm, preparation_time: e.target.value })
            }
          />
          <Input
            placeholder="Bepul radius (m)"
            value={deliveryForm.free_delivery_radius}
            onChange={(e) =>
              setDeliveryForm({
                ...deliveryForm,
                free_delivery_radius: e.target.value,
              })
            }
          />
          <Input
            placeholder="1km narxi (so'm)"
            value={deliveryForm.delivery_price_per_km}
            onChange={(e) =>
              setDeliveryForm({
                ...deliveryForm,
                delivery_price_per_km: e.target.value,
              })
            }
          />
          <Input
            placeholder="Maksimal radius (m)"
            value={deliveryForm.max_delivery_radius}
            onChange={(e) =>
              setDeliveryForm({
                ...deliveryForm,
                max_delivery_radius: e.target.value,
              })
            }
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setDeliveryForm({
                ...deliveryForm,
                is_delivery_enabled: !deliveryForm.is_delivery_enabled,
              })
            }
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold transition",
              deliveryForm.is_delivery_enabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-muted text-muted-foreground",
            )}
          >
            {deliveryForm.is_delivery_enabled
              ? "Yetkazib berish faol"
              : "Yetkazib berish o'chirilgan"}
          </button>
          <Button onClick={handleSaveDelivery} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card/90 p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Mening mahsulotlarim
            </h2>
            <p className="text-sm text-muted-foreground">
              Narxni yangilash uchun mahsulotga teging.
            </p>
          </div>
        </div>

        {productsLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hozircha mahsulotlar yo'q.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {products.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4"
              >
                <div className="h-14 w-14 overflow-hidden rounded-xl bg-muted">
                  {item.product.images?.[0]?.url ? (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">
                      📦
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Holat: {item.status}
                  </p>
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    placeholder="Narx"
                    className="h-9 text-sm"
                    defaultValue={item.price}
                    onBlur={(e) =>
                      setPrice.mutate({
                        id: item.id,
                        price: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
