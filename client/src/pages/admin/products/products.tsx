import { useQuery } from "@tanstack/react-query";
import CategoryList from "./_components/category-list";
import { api } from "@/api/api";

type Product = {
  id: number;
  name: string;
  slug: string;
  category?: { id: string; name: string };
  unit?: { id: string; name: string; short_name?: string };
  is_active: boolean;
  createdAt: string;
};

export default function Products() {
  const { data: productsRes, isLoading } = useQuery({
    queryKey: ["products", "admin"],
    queryFn: () => api.get("/products"),
  });

  const products: Product[] = productsRes?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mahsulotlar</h1>
        <p className="text-sm text-muted-foreground">
          Kategoriyalarni boshqaring va mahsulotlar ro'yxatini ko'ring.
        </p>
      </div>

      <CategoryList />

      <section className="rounded-3xl border border-border bg-card/80 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Mahsulotlar ro'yxati
            </h3>
            <p className="text-xs text-muted-foreground">
              Barcha mahsulotlar umumiy ko'rinishda.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hozircha mahsulotlar yo'q.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Nomi</th>
                  <th className="px-4 py-3">Kategoriya</th>
                  <th className="px-4 py-3">Birlik</th>
                  <th className="px-4 py-3">Holat</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {product.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {product.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {product.category?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {product.unit?.short_name ?? product.unit?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          product.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {product.is_active ? "Faol" : "Faol emas"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
