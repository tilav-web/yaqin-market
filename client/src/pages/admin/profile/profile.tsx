import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheckIcon, PhoneIcon, SaveIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import { authService } from "@/services/auth.service";
import {
  AdminInfoPill,
  AdminPageHeader,
  AdminSurface,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRoleLabel, normalizePhone } from "@/lib/market";
import { useAuthStore } from "@/stores/auth.store";

type MeResponse = {
  id: string;
  first_name: string;
  last_name: string;
  createdAt: string;
  updatedAt: string;
  auth?: { phone?: string | null } | null;
};

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default function AdminProfilePage() {
  const queryClient = useQueryClient();
  const authMe = useAuthStore((state) => state.me);
  const setMe = useAuthStore((state) => state.setMe);
  const [form, setForm] = useState({ first_name: "", last_name: "" });

  const { data: me, isLoading } = useQuery({
    queryKey: ["admin", "profile", "me"],
    queryFn: async () => (await api.get<MeResponse>("/users/me")).data,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!me) return;
    setForm({
      first_name: me.first_name ?? "",
      last_name: me.last_name ?? "",
    });
  }, [me]);

  const isDirty =
    form.first_name.trim() !== (me?.first_name ?? "").trim() ||
    form.last_name.trim() !== (me?.last_name ?? "").trim();

  const saveProfile = useMutation({
    mutationFn: async () =>
      (
        await api.put<MeResponse>("/users/me", {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
        })
      ).data,
    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(["admin", "profile", "me"], updatedUser);
      const nextMe = await authService.findMe();
      setMe(nextMe);
      toast.success("Profil yangilandi");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Profilni yangilashda xatolik");
    },
  });

  const phone = useMemo(
    () => normalizePhone(me?.auth?.phone ?? authMe?.phone),
    [authMe?.phone, me?.auth?.phone],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Account"
        title="Profil"
        description="Super admin o'z ism-familiyasi va akkaunt ma'lumotlarini shu yerda boshqaradi."
        badge={getRoleLabel(authMe?.role)}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminInfoPill label="Telefon" value={phone || "-"} />
        <AdminInfoPill label="Rol" value={getRoleLabel(authMe?.role)} />
        <AdminInfoPill
          label="Yaratilgan"
          value={authMe?.createdAt ? dateFormatter.format(new Date(authMe.createdAt)) : "-"}
        />
        <AdminInfoPill
          label="Yangilangan"
          value={me?.updatedAt ? dateFormatter.format(new Date(me.updatedAt)) : "-"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <AdminSurface className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-primary text-primary-foreground">
              <UserRoundIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Shaxsiy ma'lumotlar</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Ism va familiya admin panel bo'ylab ko'rinadi. O'zgartirilganda sidebar ham
                darrov yangilanadi.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Ism
              </label>
              <Input
                value={form.first_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, first_name: event.target.value }))
                }
                placeholder="Ism"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Familiya
              </label>
              <Input
                value={form.last_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, last_name: event.target.value }))
                }
                placeholder="Familiya"
              />
            </div>
          </div>

          <div className="mt-4 rounded-[1.4rem] border border-slate-200/80 bg-white/88 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Telefon
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">{phone || "-"}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Telefon hozir login identifikatori sifatida ishlatiladi. Uni keyin OTP oqimi
              bilan alohida boshqaramiz.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              className="rounded-full px-5"
              onClick={() => saveProfile.mutate()}
              disabled={!isDirty || saveProfile.isPending || isLoading}
            >
              <SaveIcon className="h-4 w-4" />
              {saveProfile.isPending ? "Saqlanmoqda..." : "O'zgarishlarni saqlash"}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                setForm({
                  first_name: me?.first_name ?? "",
                  last_name: me?.last_name ?? "",
                })
              }
              disabled={!isDirty || saveProfile.isPending}
            >
              Bekor qilish
            </Button>
          </div>
        </AdminSurface>

        <AdminSurface className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="rounded-[1.7rem] border border-primary/10 bg-[linear-gradient(145deg,rgba(220,38,38,0.95),rgba(244,63,94,0.88))] p-5 text-white shadow-[0_26px_55px_-38px_rgba(220,38,38,0.65)]">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white/14">
                  <ShieldCheckIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                    Admin access
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {me?.first_name || authMe?.user?.first_name || "Super admin"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/84">
                Bu akkaunt platforma katalogi, do'konlar va foydalanuvchilar ustidan to'liq
                nazoratga ega.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/88 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/8 text-primary">
                  <PhoneIcon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Aloqa ma'lumoti</p>
                  <p className="text-sm text-slate-500">{phone || "-"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/88 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/8 text-primary">
                  <BadgeCheckIcon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Akkaunt holati</p>
                  <p className="text-sm text-slate-500">
                    {getRoleLabel(authMe?.role)} sifatida faol
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AdminSurface>
      </div>
    </div>
  );
}
