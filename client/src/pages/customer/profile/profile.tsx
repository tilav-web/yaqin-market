import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRightIcon, MapPin, Wallet2, User2 } from "lucide-react";

type MeResponse = {
  id: string;
  first_name: string;
  last_name: string;
  auth?: { phone?: string } | null;
};

export default function CustomerProfile() {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({ first_name: "", last_name: "" });
  const [editing, setEditing] = useState(false);

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
            <Button variant="outline" size="sm" onClick={() => setEditing((prev) => !prev)}>
              {editing ? "Bekor" : "Tahrirlash"}
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
              <p className="text-xs text-muted-foreground">Telefon</p>
              <p className="font-medium text-foreground">{phone}</p>
            </div>

            {editing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Ism"
                  value={profile.first_name}
                  onChange={(event) =>
                    setProfile((prev) => ({ ...prev, first_name: event.target.value }))
                  }
                />
                <Input
                  placeholder="Familiya"
                  value={profile.last_name}
                  onChange={(event) =>
                    setProfile((prev) => ({ ...prev, last_name: event.target.value }))
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
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <Link
            to="/mobile/wallet"
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-4 transition hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Wallet2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallet</p>
                <p className="text-lg font-semibold text-foreground">
                  Balans va tranzaksiyalar
                </p>
              </div>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
          </Link>
        </section>

        <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <Link
            to="/mobile/locations"
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-4 transition hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manzillar</p>
                <p className="text-lg font-semibold text-foreground">
                  Locations boshqaruvi
                </p>
              </div>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
          </Link>
        </section>
      </div>
    </div>
  );
}
