import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/api";

export default function Dashboard() {
  const { data: storesRes } = useQuery({
    queryKey: ["admin", "stores", "count"],
    queryFn: () => api.get("/stores"),
  });
  const { data: categoriesRes } = useQuery({
    queryKey: ["admin", "categories", "count"],
    queryFn: () => api.get("/categories"),
  });
  const { data: productsRes } = useQuery({
    queryKey: ["admin", "products", "count"],
    queryFn: () => api.get("/products"),
  });

  const storesCount = storesRes?.data?.length ?? 0;
  const categoriesCount = categoriesRes?.data?.length ?? 0;
  const productsCount = productsRes?.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platforma holati bo'yicha tezkor ko'rinish.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Do'konlar", value: storesCount },
          { label: "Kategoriyalar", value: categoriesCount },
          { label: "Mahsulotlar", value: productsCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-border bg-card/80 p-5 shadow-[0_18px_50px_-45px_rgba(15,23,42,0.55)]"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
