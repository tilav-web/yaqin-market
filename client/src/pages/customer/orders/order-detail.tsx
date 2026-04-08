import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BikeIcon, MessageCircleIcon, NavigationIcon } from "lucide-react";
import { api } from "@/api/api";
import StatusPill from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import type { Conversation, OrderSummary } from "@/interfaces/market.interface";
import { getClickPaymentUrl } from "@/services/payment.service";
import {
  extractErrorMessage,
  formatDateTime,
  formatMoney,
  getOrderStatusLabel,
  getPaymentMethodLabel,
} from "@/lib/market";
import { useSocket } from "@/hooks/use-socket";

export default function CustomerOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPaying, setIsPaying] = useState(false);
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Socket — real-time buyurtma yangilash va kuryer tracking
  const { subscribeToOrder } = useSocket("customer", (event, data) => {
    if (data?.order_id === id || data?.orderId === id) {
      if (event === "order:status-changed") {
        queryClient.invalidateQueries({ queryKey: ["order", id] });
        queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
        toast.info(`Buyurtma holati: ${data.status}`);
      }
      if (event === "courier:location-changed") {
        setCourierLocation({ lat: data.lat, lng: data.lng });
      }
    }
  });

  useEffect(() => {
    if (id) subscribeToOrder(id);
  }, [id, subscribeToOrder]);

  const startChat = useMutation({
    mutationFn: async (orderId: string) =>
      (
        await api.post<Conversation>("/conversations", {
          type: "ORDER",
          reference_id: orderId,
        })
      ).data,
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", "my"] });
      navigate(`/mobile/chat/${conv.id}`);
    },
    onError: (error) => toast.error(extractErrorMessage(error)),
  });

  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await api.get<OrderSummary>(`/orders/${id}`)).data,
    enabled: !!id,
  });

  const handlePayOrder = async () => {
    if (!order) {
      return;
    }

    try {
      setIsPaying(true);
      const payment = await getClickPaymentUrl(order.id);
      window.location.assign(payment.url);
    } catch (error) {
      toast.error(extractErrorMessage(error));
      setIsPaying(false);
    }
  };

  if (!order) {
    return null;
  }

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      {/* Courier tracking — faqat yetkazish paytida */}
      {order.status === "DELIVERING" && courierLocation && (
        <section className="rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-[0_20px_50px_-30px_rgba(16,185,129,0.3)]">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-emerald-500 text-white shadow-[0_12px_28px_-12px_rgba(16,185,129,0.7)]">
              <BikeIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Kuryer yo'lda</p>
              <p className="text-xs text-emerald-600">
                Joylashuv: {courierLocation.lat.toFixed(5)}, {courierLocation.lng.toFixed(5)}
              </p>
            </div>
            <span className="ml-auto flex h-3 w-3 items-center justify-center">
              <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.3)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Order detail
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950">
              {order.order_number}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill
              status={order.status}
              label={getOrderStatusLabel(order.status)}
            />
            <button
              onClick={() => startChat.mutate(order.id)}
              disabled={startChat.isPending}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <MessageCircleIcon className="h-3.5 w-3.5" />
              Do'kon bilan chat
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Store
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {order.store?.name ?? "—"}
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              To'lov
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {getPaymentMethodLabel(order.payment_method)}
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Jami
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {formatMoney(order.total_price)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Mahsulotlar</h2>
        <div className="mt-4 space-y-3">
          {order.items.map((item) => (
            <div
              key={`${item.product_id}-${item.store_product_id ?? "manual"}`}
              className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {item.product_name}
                </p>
                <p className="text-sm text-slate-500">
                  {item.quantity} x {formatMoney(item.price)}
                </p>
              </div>
              <p className="font-semibold text-slate-950">
                {formatMoney(item.total_price)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Delivery</h2>
          <p className="mt-4 text-sm text-slate-600">
            {order.delivery_address}
          </p>
          {order.delivery_details ? (
            <p className="mt-2 text-sm text-slate-500">
              {order.delivery_details}
            </p>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            To'lov tafsiloti
          </h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Savat</span>
              <span>{formatMoney(order.items_price)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{formatMoney(order.delivery_price)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 font-semibold text-slate-950">
              <span>Jami</span>
              <span>{formatMoney(order.total_price)}</span>
            </div>
          </div>

          {order.payment_method === "CLICK" &&
          !order.is_paid &&
          order.status !== "CANCELLED" ? (
            <div className="mt-4 rounded-[1.25rem] border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-slate-950">
                Online to'lov kutilmoqda
              </p>
              <p className="mt-1 text-sm text-slate-500">
                To'lov yarim yo'lda qolgan bo'lsa, shu yerdan qayta davom
                ettiring.
              </p>
              <Button
                className="mt-4 h-11 rounded-[1rem]"
                onClick={handlePayOrder}
                disabled={isPaying}
              >
                {isPaying ? "Yo'naltirilmoqda..." : "Click orqali to'lash"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
