import { useQuery } from "@tanstack/react-query";
import { api } from "../../../api/api";

interface Store {
  id: string;
  name: string;
  slug: string;
  owner?: { first_name: string };
  phone: string;
  is_active: boolean;
  is_prime: boolean;
  rating: number;
}

export default function AdminStores() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["admin", "stores"],
    queryFn: () => api.get("/stores"),
  });

  const stores: Store[] = res?.data || [];

  if (isLoading) return <div className="text-sm text-muted-foreground">Yuklanmoqda...</div>;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Do'konlar</h1>
        <p className="text-sm text-muted-foreground">
          Platformadagi barcha do'konlar holati va reytingi.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card/90 shadow-[0_18px_55px_-45px_rgba(15,23,42,0.55)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nomi</th>
              <th className="px-4 py-3">Ega</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Holat</th>
              <th className="px-4 py-3">Prime</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((store: Store) => (
              <tr key={store.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{store.name}</div>
                  <div className="text-xs text-muted-foreground">
                    ⭐ {Number(store.rating ?? 0).toFixed(1)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {store.owner?.first_name ?? "-"}
                </td>
                <td className="px-4 py-3">{store.phone}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      store.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {store.is_active ? "Faol" : "Faol emas"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {store.is_prime ? "⭐ Prime" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
