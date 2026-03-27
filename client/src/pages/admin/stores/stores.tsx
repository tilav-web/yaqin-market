import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractErrorMessage } from "@/lib/market";

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

interface AdminStoreUser {
  id: string;
  first_name: string;
  last_name: string;
  auth?: {
    role?: string;
  } | null;
}

export default function AdminStores() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    phone: "",
    address: "",
    owner_id: "",
    lat: "",
    lng: "",
  });

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["admin", "stores"],
    queryFn: async () => (await api.get<Store[]>("/stores")).data,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users", "for-stores"],
    queryFn: async () => (await api.get<AdminStoreUser[]>("/users")).data,
  });

  const createStore = useMutation({
    mutationFn: async () =>
      (
        await api.post("/stores", {
          ...form,
          lat: form.lat ? Number(form.lat) : undefined,
          lng: form.lng ? Number(form.lng) : undefined,
        })
      ).data,
    onSuccess: () => {
      toast.success("Do'kon yaratildi");
      setForm({
        name: "",
        slug: "",
        phone: "",
        address: "",
        owner_id: "",
        lat: "",
        lng: "",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const setFlag = useMutation({
    mutationFn: async ({
      id,
      path,
      key,
      value,
    }: {
      id: string;
      path: "active" | "prime";
      key: "is_active" | "is_prime";
      value: boolean;
    }) => (await api.put(`/stores/${id}/${path}`, { [key]: value })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Yuklanmoqda...</div>;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Do'konlar</h1>
        <p className="text-sm text-muted-foreground">
          Platformadagi barcha do'konlar holati va reytingi.
        </p>
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Yangi do'kon yaratish</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input placeholder="Do'kon nomi" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} />
          <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value }))} />
          <Input placeholder="Telefon" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} />
          <Input placeholder="Manzil" value={form.address} onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))} />
          <select
            value={form.owner_id}
            onChange={(event) => setForm((current) => ({ ...current, owner_id: event.target.value }))}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Seller tanlang</option>
            {users
              .filter((user) => user.auth?.role === "SELLER")
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
          </select>
          <Input placeholder="Lat" value={form.lat} onChange={(e) => setForm((current) => ({ ...current, lat: e.target.value }))} />
          <Input placeholder="Lng" value={form.lng} onChange={(e) => setForm((current) => ({ ...current, lng: e.target.value }))} />
        </div>
        <Button className="mt-4" onClick={() => createStore.mutate()} disabled={!form.name || !form.owner_id || createStore.isPending}>
          Do'kon yaratish
        </Button>
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
              <th className="px-4 py-3">Actions</th>
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
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setFlag.mutate({
                          id: store.id,
                          path: "active",
                          key: "is_active",
                          value: !store.is_active,
                        })
                      }
                    >
                      {store.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        setFlag.mutate({
                          id: store.id,
                          path: "prime",
                          key: "is_prime",
                          value: !store.is_prime,
                        })
                      }
                    >
                      {store.is_prime ? "Prime off" : "Prime on"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
