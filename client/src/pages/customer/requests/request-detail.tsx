import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import LocationPickerMap from "@/components/maps/location-picker-map";
import StatusPill from "@/components/common/status-pill";
import { useBroadcastSocket } from "@/hooks/use-broadcast-socket";
import type { BroadcastRequest } from "@/interfaces/market.interface";
import {
  extractErrorMessage,
  formatDateTime,
  formatMoney,
  getBroadcastStatusLabel,
} from "@/lib/market";

const paymentMethods = [
  { value: "CASH", label: "Naqd" },
  { value: "CARD", label: "Karta" },
  { value: "WALLET", label: "Wallet" },
];

export default function BroadcastRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  useBroadcastSocket({
    role: "customer",
    enabled: !!id,
    onOfferUpdated: (payload) => {
      if (payload.requestId !== id) return;
      queryClient.invalidateQueries({ queryKey: ["broadcast-request", id] });
      queryClient.invalidateQueries({ queryKey: ["broadcast-requests", "my"] });
    },
    onRequestUpdated: (payload) => {
      if (payload.requestId !== id) return;
      queryClient.invalidateQueries({ queryKey: ["broadcast-request", id] });
      queryClient.invalidateQueries({ queryKey: ["broadcast-requests", "my"] });
    },
  });

  const { data: request } = useQuery({
    queryKey: ["broadcast-request", id],
    queryFn: async () =>
      (await api.get<BroadcastRequest>(`/orders/broadcast-requests/${id}`)).data,
    enabled: !!id,
  });

  const selectOffer = useMutation({
    mutationFn: async (offerId: string) =>
      (
        await api.post(`/orders/broadcast-requests/${id}/select-offer`, {
          offer_id: offerId,
          payment_method: paymentMethod,
        })
      ).data,
    onSuccess: (order: { id: string }) => {
      toast.success("Taklif tanlandi va order yaratildi");
      queryClient.invalidateQueries({ queryKey: ["broadcast-requests", "my"] });
      navigate(`/mobile/orders/${order.id}`);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  if (!request) {
    return null;
  }

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.3)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">{request.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{request.delivery_address}</p>
          </div>
          <StatusPill
            status={request.status}
            label={getBroadcastStatusLabel(request.status)}
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <LocationPickerMap
            center={{ lat: request.delivery_lat, lng: request.delivery_lng }}
            markers={[
              {
                id: request.id,
                lat: request.delivery_lat,
                lng: request.delivery_lng,
                label: "Delivery nuqta",
                meta: request.delivery_address,
                tone: "accent",
              },
              ...request.offers
                .filter((offer) => offer.store.lat && offer.store.lng)
                .map((offer) => ({
                  id: offer.id,
                  lat: Number(offer.store.lat),
                  lng: Number(offer.store.lng),
                  label: offer.store.name,
                  meta: formatMoney(offer.total_price),
                  tone: "offer" as const,
                })),
            ]}
            radiusKm={request.radius_km}
          />

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">So'rov tafsiloti</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.25rem] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Yaratilgan</p>
                <p className="mt-2 font-semibold text-slate-950">
                  {formatDateTime(request.createdAt)}
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Radius</p>
                <p className="mt-2 font-semibold text-slate-950">{request.radius_km} km</p>
              </div>
              <div className="rounded-[1.25rem] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">To'lov</p>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-950 outline-none"
                >
                  {paymentMethods.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">So'ralgan mahsulotlar</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {request.items.map((item) => (
            <div key={item.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="font-medium text-slate-900">{item.product_name}</p>
              <p className="mt-1 text-sm text-slate-500">{item.quantity} ta</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Seller takliflari</h2>
            <p className="text-sm text-slate-500">
              Eng qulay narxni tanlab, orderni davom ettiring
            </p>
          </div>
          <span className="text-sm text-slate-400">{request.offers.length} ta</span>
        </div>

        {request.offers.length === 0 ? (
          <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
            Hozircha takliflar kelmadi. Keyinroq yana tekshirib ko'ring.
          </p>
        ) : (
          <div className="space-y-3">
            {request.offers.map((offer) => (
              <article
                key={offer.id}
                className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">{offer.store.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      ETA {offer.estimated_minutes} min · {offer.message || "Izoh qoldirilmagan"}
                    </p>
                  </div>
                  <StatusPill status={offer.status} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Savat</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatMoney(offer.subtotal_price)}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Delivery</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatMoney(offer.delivery_price)}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Jami</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatMoney(offer.total_price)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {offer.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-[1.15rem] border border-slate-200 px-4 py-3 text-sm"
                    >
                      <span className="text-slate-700">
                        {item.product_name} x{item.quantity}
                      </span>
                      <span className="font-semibold text-slate-950">
                        {formatMoney(item.total_price)}
                      </span>
                    </div>
                  ))}
                </div>

                {request.status === "OPEN" ? (
                  <Button
                    className="mt-4 h-12 rounded-[1.25rem]"
                    onClick={() => selectOffer.mutate(offer.id)}
                    disabled={selectOffer.isPending}
                  >
                    Shu taklifni tanlash
                  </Button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
