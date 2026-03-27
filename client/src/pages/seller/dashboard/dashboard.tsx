import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/api";
import MetricCard from "@/components/common/metric-card";

type SellerDashboardItem = {
  id: string;
};

export default function SellerDashboard() {
  const { data: orders = [] } = useQuery({
    queryKey: ["seller", "orders", "dashboard"],
    queryFn: async () => (await api.get<SellerDashboardItem[]>("/orders/store/my")).data,
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["seller", "requests", "dashboard"],
    queryFn: async () =>
      (await api.get<SellerDashboardItem[]>("/orders/broadcast-requests/store/feed?radius=12")).data,
  });
  const { data: stores = [] } = useQuery({
    queryKey: ["seller", "stores", "dashboard"],
    queryFn: async () => (await api.get<SellerDashboardItem[]>("/stores/my")).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Seller panel</h1>
        <p className="text-sm text-muted-foreground">
          Do'koningizni boshqarish uchun tezkor bo'limlar.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Do'konlar" value={stores.length} />
        <MetricCard label="Buyurtmalar" value={orders.length} tone="blue" />
        <MetricCard label="Yaqin so'rovlar" value={requests.length} tone="green" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/seller/store"
          className="rounded-3xl border border-border bg-card/90 p-6 text-center shadow-[0_18px_50px_-45px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
        >
          <span className="text-3xl">🏪</span>
          <p className="mt-3 font-medium text-foreground">Mening do'konim</p>
          <p className="text-xs text-muted-foreground">Profil va sozlamalar</p>
        </Link>
        <Link
          to="/seller/orders"
          className="rounded-3xl border border-border bg-card/90 p-6 text-center shadow-[0_18px_50px_-45px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
        >
          <span className="text-3xl">📦</span>
          <p className="mt-3 font-medium text-foreground">Buyurtmalar</p>
          <p className="text-xs text-muted-foreground">Yangi buyurtmalar oqimi</p>
        </Link>
        <Link
          to="/seller/requests"
          className="rounded-3xl border border-border bg-card/90 p-6 text-center shadow-[0_18px_50px_-45px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
        >
          <span className="text-3xl">📣</span>
          <p className="mt-3 font-medium text-foreground">Broadcast feed</p>
          <p className="text-xs text-muted-foreground">Yaqin mijoz so'rovlariga javob bering</p>
        </Link>
      </div>
    </div>
  );
}
