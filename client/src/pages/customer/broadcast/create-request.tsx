import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SearchIcon } from "lucide-react";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import LocationPickerMap from "@/components/maps/location-picker-map";
import { useDiscoveryPreferences } from "@/hooks/use-discovery-preferences";
import type { ProductCatalogItem } from "@/interfaces/market.interface";
import { extractErrorMessage } from "@/lib/market";
import { t } from "@/lib/i18n";
import { useLang } from "@/context/lang.context";

export default function CreateBroadcastRequestPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { location, setLocation, radiusKm, setRadiusKm, address, setAddress, requestCurrentLocation } =
    useDiscoveryPreferences();
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!location) {
      requestCurrentLocation().catch(() => undefined);
    }
  }, [location, requestCurrentLocation]);

  const { data: products = [] } = useQuery({
    queryKey: ["products", "broadcast"],
    queryFn: async () => (await api.get<ProductCatalogItem[]>("/products")).data,
  });

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase();
    return products.filter((product) => t(product.name, lang).toLowerCase().includes(term));
  }, [products, search, lang]);

  const selectedProducts = useMemo(
    () =>
      products.filter((product) => selectedItems[product.id]).map((product) => ({
        ...product,
        quantity: selectedItems[product.id],
      })),
    [products, selectedItems],
  );

  const createRequest = useMutation({
    mutationFn: async () =>
      (
        await api.post("/orders/broadcast-requests", {
          title: title.trim() || undefined,
          note: note.trim() || undefined,
          radius_km: radiusKm,
          delivery_lat: location?.lat,
          delivery_lng: location?.lng,
          delivery_address:
            address || (location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : ""),
          items: Object.entries(selectedItems).map(([productId, quantity]) => ({
            product_id: Number(productId),
            quantity,
          })),
        })
      ).data,
    onSuccess: (data: { id: string }) => {
      toast.success("Broadcast so'rov yuborildi");
      navigate(`/mobile/requests/${data.id}`);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const changeQuantity = (productId: number, delta: number) => {
    setSelectedItems((current) => {
      const nextQty = Math.max(0, (current[productId] ?? 0) + delta);
      if (!nextQty) {
        const rest = { ...current };
        delete rest[productId];
        return rest;
      }

      return {
        ...current,
        [productId]: nextQty,
      };
    });
  };

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.3)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Broadcast request
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">
          Sellerlar orasiga savat tashlash
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Qaysi mahsulotlar kerakligini tanlang, radius belgilang va do'konlar sizga taklif yuboradi.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="So'rov nomi, masalan: Kechki bozor savati"
              className="h-12 w-full rounded-[1.25rem] border border-slate-200 px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Qo'shimcha izoh yoki muqobil variantlarni yozing"
              className="h-28 w-full rounded-[1.25rem] border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Joylashuv va radius</p>
                <span className="text-sm text-slate-500">{radiusKm} km</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                className="mt-3 w-full accent-primary"
              />
              <div className="mt-4">
                <LocationPickerMap
                  center={location}
                  markers={
                    location
                      ? [
                          {
                            id: "delivery-point",
                            lat: location.lat,
                            lng: location.lng,
                            label: "Yetkazib berish nuqtasi",
                            meta: address || "Tanlangan delivery point",
                            tone: "accent",
                          },
                        ]
                      : []
                  }
                  radiusKm={radiusKm}
                  interactive
                  onLocationSelect={setLocation}
                />
              </div>
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Yetkazib berish manzili"
                className="mt-4 h-24 w-full rounded-[1.25rem] border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fff5f6)] p-4">
            <p className="text-sm font-semibold text-slate-900">Tanlangan savat</p>
            <div className="mt-4 space-y-3">
              {selectedProducts.length === 0 ? (
                <p className="rounded-[1.25rem] border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Hali mahsulot tanlanmadi
                </p>
              ) : (
                selectedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{t(product.name, lang)}</p>
                        <p className="text-sm text-slate-500">
                          {t(product.category?.name, lang) || "Kategoriya yo'q"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => changeQuantity(product.id, -1)}
                          className="h-8 w-8 rounded-full border border-slate-200"
                        >
                          -
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold text-slate-950">
                          {product.quantity}
                        </span>
                        <button
                          onClick={() => changeQuantity(product.id, 1)}
                          className="h-8 w-8 rounded-full bg-primary text-primary-foreground"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Button
              className="mt-5 h-12 w-full rounded-[1.25rem]"
              onClick={() => createRequest.mutate()}
              disabled={!location || !selectedProducts.length || createRequest.isPending}
            >
              {createRequest.isPending ? "Yuborilmoqda..." : "Sellerlarga yuborish"}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.25)]">
        <div className="flex items-center gap-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
          <SearchIcon className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Mahsulot qidiring..."
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-3"
            >
              <div className="flex h-28 items-center justify-center overflow-hidden rounded-[1.15rem] bg-slate-50">
                {product.images?.[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={t(product.name, lang)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">📦</span>
                )}
              </div>
              <p className="mt-3 font-medium text-slate-900">{t(product.name, lang)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {t(product.category?.name, lang) || "Kategoriya yo'q"}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => changeQuantity(product.id, -1)}
                  className="h-8 w-8 rounded-full border border-slate-200"
                >
                  -
                </button>
                <span className="text-sm font-semibold text-slate-950">
                  {selectedItems[product.id] ?? 0}
                </span>
                <button
                  onClick={() => changeQuantity(product.id, 1)}
                  className="h-8 w-8 rounded-full bg-primary text-primary-foreground"
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
