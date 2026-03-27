import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import CategoryList from "./_components/category-list";
import { api } from "@/api/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/market";

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
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    category_id: "",
    unit_id: "",
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "admin"],
    queryFn: async () => (await api.get<Product[]>("/products")).data,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "admin", "all"],
    queryFn: async () => (await api.get<{ id: string; name: string }[]>("/categories")).data,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units", "admin", "all"],
    queryFn: async () => (await api.get<{ id: number; name: string }[]>("/units")).data,
  });

  const createProduct = useMutation({
    mutationFn: async () =>
      (
        await api.post("/products", {
          name: form.name,
          slug: form.slug || undefined,
          description: form.description || undefined,
          category_id: form.category_id ? Number(form.category_id) : undefined,
          unit_id: form.unit_id ? Number(form.unit_id) : undefined,
        })
      ).data,
    onSuccess: () => {
      toast.success("Mahsulot yaratildi");
      setForm({ name: "", slug: "", description: "", category_id: "", unit_id: "" });
      queryClient.invalidateQueries({ queryKey: ["products", "admin"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

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
        <h3 className="text-base font-semibold text-foreground">Yangi mahsulot yaratish</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input
            placeholder="Nomi"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            placeholder="Slug"
            value={form.slug}
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
          />
          <Input
            placeholder="Tavsif"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
          <select
            value={form.category_id}
            onChange={(event) =>
              setForm((current) => ({ ...current, category_id: event.target.value }))
            }
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Kategoriya</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={form.unit_id}
            onChange={(event) =>
              setForm((current) => ({ ...current, unit_id: event.target.value }))
            }
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Birlik</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
        <Button className="mt-4" onClick={() => createProduct.mutate()} disabled={!form.name || createProduct.isPending}>
          Mahsulot yaratish
        </Button>
      </section>

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
