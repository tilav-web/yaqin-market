import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/api";
import MetricCard from "@/components/common/metric-card";

type CountItem = {
  id: string | number;
};

type DashboardUser = {
  id: string;
  auth?: {
    role?: string;
  } | null;
};

export default function Dashboard() {
  const { data: stores = [] } = useQuery({
    queryKey: ["admin", "stores", "count"],
    queryFn: async () => (await api.get<CountItem[]>("/stores")).data,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories", "count"],
    queryFn: async () => (await api.get<CountItem[]>("/categories")).data,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products", "count"],
    queryFn: async () => (await api.get<CountItem[]>("/products")).data,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users", "count"],
    queryFn: async () => (await api.get<DashboardUser[]>("/users")).data,
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platforma holati bo'yicha tezkor ko'rinish.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Do'konlar" value={stores.length} />
        <MetricCard label="Kategoriyalar" value={categories.length} tone="blue" />
        <MetricCard label="Mahsulotlar" value={products.length} tone="green" />
        <MetricCard label="Foydalanuvchilar" value={users.length} tone="slate" />
        <MetricCard
          label="Sellerlar"
          value={users.filter((user) => user.auth?.role === "SELLER").length}
        />
      </div>
    </div>
  );
}
