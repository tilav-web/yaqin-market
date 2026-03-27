import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapPin, Wallet2, User2 } from "lucide-react";
import { cn } from "@/lib/utils";

type MeResponse = {
  id: string;
  first_name: string;
  last_name: string;
  auth?: { phone?: string } | null;
};

type Location = {
  id: string;
  label: string;
  address_line: string;
  landmark?: string;
  lat: number;
  lng: number;
  is_default: boolean;
};

type WalletBalance = {
  balance: number;
  frozen_balance: number;
  available_balance: number;
};

type WalletTransaction = {
  id: string;
  amount: number;
  type: string;
  description?: string | null;
  createdAt: string;
};

export default function CustomerProfile() {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({ first_name: "", last_name: "" });
  const [editing, setEditing] = useState(false);
  const [locationForm, setLocationForm] = useState({
    label: "Uy",
    address_line: "",
    landmark: "",
    lat: "",
    lng: "",
    is_default: true,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<MeResponse>("/users/me")).data,
  });

  useEffect(() => {
    if (!me) return;
    setProfile({
      first_name: me.first_name ?? "",
      last_name: me.last_name ?? "",
    });
  }, [me]);

  const { data: locations = [] } = useQuery({
    queryKey: ["locations", "my"],
    queryFn: async () => (await api.get<Location[]>("/locations/my")).data,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", "balance"],
    queryFn: async () => (await api.get<WalletBalance>("/wallet/balance")).data,
  });

  const { data: walletTxRes } = useQuery({
    queryKey: ["wallet", "transactions"],
    queryFn: async () =>
      (
        await api.get<{ data: WalletTransaction[] }>("/wallet/transactions?page=1&limit=5")
      ).data,
  });
  const transactions: WalletTransaction[] = walletTxRes?.data ?? [];

  const saveProfile = useMutation({
    mutationFn: (data: { first_name?: string; last_name?: string }) =>
      api.put("/users/me", data),
    onSuccess: () => {
      toast.success("Profil yangilandi");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Profilni yangilashda xatolik",
      );
    },
  });


  const createLocation = useMutation({
    mutationFn: (payload: {
      label?: string;
      address_line: string;
      landmark?: string;
      lat: number;
      lng: number;
      is_default?: boolean;
    }) => api.post("/locations", payload),
    onSuccess: () => {
      toast.success("Manzil qo'shildi");
      setLocationForm({
        label: "Uy",
        address_line: "",
        landmark: "",
        lat: "",
        lng: "",
        is_default: true,
      });
      queryClient.invalidateQueries({ queryKey: ["locations", "my"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Manzil qo'shishda xatolik",
      );
    },
  });

  const setDefaultLocation = useMutation({
    mutationFn: (id: string) => api.put(`/locations/${id}/default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations", "my"] });
    },
  });

  const deleteLocation = useMutation({
    mutationFn: (id: string) => api.delete(`/locations/${id}`),
    onSuccess: () => {
      toast.success("Manzil o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["locations", "my"] });
    },
  });

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      toast.error("GPS qo'llab-quvvatlanmaydi");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationForm((prev) => ({
          ...prev,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        }));
      },
      () => toast.error("GPS ma'lumotini olishda xatolik"),
    );
  };

  const phone = useMemo(() => {
    if (me?.auth?.phone) return `+998 ${me.auth.phone}`;
    return "-";
  }, [me]);

  return (
    <div className="min-h-screen pb-24">
      <div className="space-y-5 p-4">
        <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <User2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profil</p>
                <h1 className="text-lg font-semibold text-foreground">
                  {me?.first_name || "Foydalanuvchi"} {me?.last_name || ""}
                </h1>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing((p) => !p)}>
              {editing ? "Bekor" : "Tahrirlash"}
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              <p className="text-xs text-muted-foreground">Telefon</p>
              <p className="font-medium text-foreground">{phone}</p>
            </div>

            {editing && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Ism"
                  value={profile.first_name}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, first_name: e.target.value }))
                  }
                />
                <Input
                  placeholder="Familiya"
                  value={profile.last_name}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, last_name: e.target.value }))
                  }
                />
                <div className="sm:col-span-2 flex justify-end">
                  <Button
                    onClick={() => saveProfile.mutate(profile)}
                    disabled={saveProfile.isPending}
                  >
                    {saveProfile.isPending ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Wallet2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wallet</p>
              <p className="text-lg font-semibold text-foreground">
                {Number(wallet?.available_balance ?? 0).toLocaleString()} so'm
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Oxirgi tranzaksiyalar
            </p>
            <div className="mt-2 space-y-2">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tranzaksiya yo'q</p>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-semibold",
                        Number(tx.amount) >= 0 ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {Number(tx.amount) >= 0 ? "+" : ""}
                      {Number(tx.amount).toLocaleString()} so'm
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Manzillar</p>
              <p className="text-lg font-semibold text-foreground">Yetkazib berish</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Hozircha manzil yo'q</p>
            ) : (
              locations.map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-2xl border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{loc.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {loc.address_line}
                      </p>
                      {loc.landmark && (
                        <p className="text-xs text-muted-foreground">Mo'ljal: {loc.landmark}</p>
                      )}
                    </div>
                    {loc.is_default && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultLocation.mutate(loc.id)}
                    >
                      Default qilish
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteLocation.mutate(loc.id)}
                    >
                      O'chirish
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Yangi manzil qo'shish
            </p>
            <div className="mt-3 grid gap-2">
              <Input
                placeholder="Label (Uy, Ish)"
                value={locationForm.label}
                onChange={(e) =>
                  setLocationForm((prev) => ({ ...prev, label: e.target.value }))
                }
              />
              <Input
                placeholder="Manzil"
                value={locationForm.address_line}
                onChange={(e) =>
                  setLocationForm((prev) => ({ ...prev, address_line: e.target.value }))
                }
              />
              <Input
                placeholder="Mo'ljal (ixtiyoriy)"
                value={locationForm.landmark}
                onChange={(e) =>
                  setLocationForm((prev) => ({ ...prev, landmark: e.target.value }))
                }
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Latitude"
                  value={locationForm.lat}
                  onChange={(e) =>
                    setLocationForm((prev) => ({ ...prev, lat: e.target.value }))
                  }
                />
                <Input
                  placeholder="Longitude"
                  value={locationForm.lng}
                  onChange={(e) =>
                    setLocationForm((prev) => ({ ...prev, lng: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setLocationForm((prev) => ({
                      ...prev,
                      is_default: !prev.is_default,
                    }))
                  }
                  className={cn(
                    "rounded-full px-3 py-2 text-xs font-semibold",
                    locationForm.is_default
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {locationForm.is_default ? "Default" : "Oddiy"}
                </button>
                <Button variant="outline" size="sm" onClick={handleUseGps}>
                  GPS olish
                </Button>
              </div>
              <Button
                onClick={() =>
                  createLocation.mutate({
                    label: locationForm.label,
                    address_line: locationForm.address_line,
                    landmark: locationForm.landmark || undefined,
                    lat: Number(locationForm.lat),
                    lng: Number(locationForm.lng),
                    is_default: locationForm.is_default,
                  })
                }
                disabled={!locationForm.address_line || !locationForm.lat || !locationForm.lng}
              >
                Manzil qo'shish
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
