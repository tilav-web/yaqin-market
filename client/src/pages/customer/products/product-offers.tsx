import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/api/api";
import LocationPickerMap from "@/components/maps/location-picker-map";
import EmptyState from "@/components/common/empty-state";
import { useDiscoveryPreferences } from "@/hooks/use-discovery-preferences";
import { formatMoney } from "@/lib/market";
import type { ProductCatalogItem, StoreProduct } from "@/interfaces/market.interface";

export default function ProductOffersPage() {
  const { productId } = useParams();
  const { location, requestCurrentLocation } = useDiscoveryPreferences();

  useEffect(() => {
    if (!location) {
      requestCurrentLocation().catch(() => undefined);
    }
  }, [location, requestCurrentLocation]);

  const { data: product } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () =>
      (await api.get<ProductCatalogItem>(`/products/${productId}`)).data,
    enabled: !!productId,
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["product-offers", productId, location?.lat, location?.lng],
    queryFn: async () =>
      (
        await api.get<StoreProduct[]>(
          `/store-products/product/${productId}/nearby?lat=${location?.lat ?? 0}&lng=${location?.lng ?? 0}`,
        )
      ).data,
    enabled: !!productId && !!location,
  });

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.3)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Product compare
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950">
              {product?.name ?? "Mahsulot narxlari"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Shu mahsulotni qaysi yaqin do'kon qanday narxda sotayotganini ko'rib chiqing.
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="text-slate-500">Filtr</p>
            <p className="text-lg font-semibold text-slate-950">Store radiusi</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <LocationPickerMap
            center={location}
            markers={[
              ...(location
                ? [
                    {
                      id: "me",
                      lat: location.lat,
                      lng: location.lng,
                      label: "Mening joylashuvim",
                      meta: "Faqat yetkazib bera oladigan store'lar ko'rsatiladi",
                      tone: "accent" as const,
                    },
                  ]
                : []),
              ...offers
                .filter((offer) => offer.store?.lat && offer.store?.lng)
                .map((offer) => ({
                  id: offer.id,
                  lat: Number(offer.store?.lat),
                  lng: Number(offer.store?.lng),
                  label: offer.store?.name ?? "Do'kon",
                  meta: `${formatMoney(offer.price)} · ${offer.distance_meters ? `${Math.round(offer.distance_meters)} m` : "masofa yo'q"}`,
                  tone: offer.is_prime ? ("offer" as const) : ("store" as const),
                })),
            ]}
          />

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">
              Avtomatik yaqinlashtirish
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Mahsulot takliflari sizning joylashuvingiz store delivery radiusiga
              kirgan do'konlardan chiqariladi.
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => requestCurrentLocation().catch(() => undefined)}
            >
              GPS bo'yicha yangilash
            </Button>
          </div>
        </div>
      </section>

      {offers.length === 0 ? (
        <EmptyState
          title="Bu mahsulot uchun yaqin do'kon topilmadi"
          description="Sizning joylashuvingizga shu mahsulotni yetkazib bera oladigan do'kon topilmadi."
          actionLabel="Asosiy katalogga qaytish"
          actionTo="/mobile"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {offers.map((offer) => (
            <Link
              key={offer.id}
              to={`/mobile/stores/${offer.store_id}`}
              className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {offer.store?.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {offer.distance_meters
                      ? `${Math.round(offer.distance_meters)} metr`
                      : "Masofa yo'q"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Yetkazish radiusi:{" "}
                    {Math.round(Number(offer.service_radius_meters ?? 0) / 1000)} km
                  </p>
                </div>
                <div className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  {offer.store?.is_prime ? "Prime" : "Store"}
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Narx</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {formatMoney(offer.price)}
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ombor</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{offer.stock}</p>
                </div>
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rating</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    ⭐ {Number(offer.store?.rating ?? 0).toFixed(1)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
