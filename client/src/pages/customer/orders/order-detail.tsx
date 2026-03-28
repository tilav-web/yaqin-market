import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/api/api";
import StatusPill from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import type { OrderSummary } from "@/interfaces/market.interface";
import { getClickPaymentUrl } from "@/services/payment.service";
import {
  extractErrorMessage,
  formatDateTime,
  formatMoney,
  getOrderStatusLabel,
  getPaymentMethodLabel,
} from "@/lib/market";

export default function CustomerOrderDetailPage() {
  const { id } = useParams();
  const [isPaying, setIsPaying] = useState(false);

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
          <StatusPill
            status={order.status}
            label={getOrderStatusLabel(order.status)}
          />
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
