import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/api";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/common/status-pill";
import type { OrderSummary } from "@/interfaces/market.interface";
import { formatDateTime, formatMoney } from "@/lib/market";
import { useSocket } from "@/hooks/use-socket";
import { useLang } from "@/context/lang.context";
import { PackageIcon, ShoppingBagIcon } from "lucide-react";

type FilterKey = "all" | "active" | "waiting" | "delivered" | "cancelled";

const ACTIVE_STATUSES = ["PENDING", "ACCEPTED", "READY", "DELIVERING"];
const WAITING_STATUSES = ["PENDING"];
const DELIVERED_STATUSES = ["DELIVERED"];
const CANCELLED_STATUSES = ["CANCELLED"];

/* ------------------------------------------------------------------ */
/*  Progress dots for active orders                                    */
/* ------------------------------------------------------------------ */
function ProgressDots({ status }: { status: string }) {
  const steps = ["PENDING", "ACCEPTED", "READY", "DELIVERING", "DELIVERED"];
  const currentIdx = steps.indexOf(status);
  if (currentIdx === -1) return null;

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {steps.map((step, idx) => (
        <div
          key={step}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            idx <= currentIdx ? "bg-red-500" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function CustomerOrders() {
  const queryClient = useQueryClient();
  const { tr } = useLang();
  const [filter, setFilter] = useState<FilterKey>("all");

  useSocket("customer", (event) => {
    if (event === "order:status-changed") {
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
    }
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", "my"],
    queryFn: async () => (await api.get<OrderSummary[]>("/orders/my")).data,
  });

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
      case "waiting":
        return orders.filter((o) => WAITING_STATUSES.includes(o.status));
      case "delivered":
        return orders.filter((o) => DELIVERED_STATUSES.includes(o.status));
      case "cancelled":
        return orders.filter((o) => CANCELLED_STATUSES.includes(o.status));
      default:
        return orders;
    }
  }, [orders, filter]);

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: "all", label: tr("filter_all") },
    { key: "active", label: tr("filter_active") },
    { key: "waiting", label: tr("filter_waiting") },
    { key: "delivered", label: tr("filter_delivered") },
    { key: "cancelled", label: tr("filter_cancelled") },
  ];

  function getStatusLabel(status: string) {
    switch (status) {
      case "PENDING":
        return tr("status_pending");
      case "ACCEPTED":
        return tr("status_accepted");
      case "READY":
        return tr("status_ready");
      case "DELIVERING":
        return tr("status_delivering");
      case "DELIVERED":
        return tr("status_delivered");
      case "CANCELLED":
        return tr("status_cancelled");
      default:
        return status;
    }
  }

  return (
    <div className="min-h-screen pb-36">
      {/* ---------- Red header ---------- */}
      <div className="bg-red-600 pb-5 pt-10 rounded-b-[1.75rem]">
        <div className="px-5">
          <h1 className="text-xl font-bold text-white">
            {tr("orders_title")}
          </h1>
          <p className="text-sm text-white/70 mt-0.5">
            {orders.length} {tr("tab_orders").toLowerCase()}
          </p>
        </div>
      </div>

      {/* ---------- Filter chips ---------- */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === chip.key
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Content ---------- */}
      <div className="px-4 mt-4 space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-5 shadow-sm animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
              </div>
            ))}
          </>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-4">
              <PackageIcon className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-lg font-semibold text-slate-900">
              {tr("order_empty")}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {tr("order_empty_sub")}
            </p>
            <Link to="/mobile">
              <Button className="mt-5 rounded-full px-6">
                <ShoppingBagIcon className="mr-2 h-4 w-4" />
                {tr("order_shop")}
              </Button>
            </Link>
          </div>
        ) : (
          /* Order cards */
          filtered.map((order) => {
            const isActive = ACTIVE_STATUSES.includes(order.status);
            return (
              <Link
                key={order.id}
                to={`/mobile/orders/${order.id}`}
                className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-[0.99]"
              >
                {/* Top row: store + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">
                      {order.store?.name ?? tr("order_store")}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {order.order_number}
                    </p>
                  </div>
                  <StatusPill
                    status={order.status}
                    label={getStatusLabel(order.status)}
                  />
                </div>

                {/* Progress dots for active orders */}
                {isActive && <ProgressDots status={order.status} />}

                {/* Info row */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>
                      {order.items?.length ?? 0} {tr("order_items")}
                    </span>
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {formatMoney(order.total_price)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
