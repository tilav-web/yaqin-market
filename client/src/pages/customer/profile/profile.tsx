import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  LogOutIcon,
  MapPin,
  StoreIcon,
  TruckIcon,
  Wallet2,
  User2,
} from "lucide-react";
import { authService } from "@/services/auth.service";
import { telegramAuthService } from "@/services/telegram-auth.service";
import type { AuthMeResponse } from "@/interfaces/auth.interface";
import type { RoleApplication, RoleApplicationStatus } from "@/interfaces/application.interface";
import { getRoleLabel } from "@/lib/market";
import { useAuthStore } from "@/stores/auth.store";

type MeResponse = {
  id: string;
  first_name: string;
  last_name: string;
  auth?: { phone?: string } | null;
};

function getStatusCopy(status?: RoleApplicationStatus | null) {
  switch (status) {
    case "APPROVED":
      return {
        title: "Tasdiqlangan",
        description: "Rolingiz tez orada yangilanadi yoki qayta kirib ko'ring.",
      };
    case "REJECTED":
      return {
        title: "Qayta topshirish mumkin",
        description: "Ma'lumotlarni yangilab yana yuboring.",
      };
    case "PENDING":
      return {
        title: "Ko'rib chiqilmoqda",
        description: "Tasdiq kutilmoqda.",
      };
    default:
      return {
        title: "Ariza yuborish",
        description: "Qo'shimcha imkoniyatlarni oching.",
      };
  }
}

function RoleApplicationCard({
  title,
  description,
  to,
  status,
  icon,
}: {
  title: string;
  description: string;
  to: string;
  status?: RoleApplicationStatus | null;
  icon: ReactNode;
}) {
  const statusCopy = getStatusCopy(status);

  return (
    <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
      <Link
        to={to}
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-4 transition hover:border-primary/30 hover:bg-primary/5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-lg font-semibold text-foreground">{statusCopy.title}</p>
            <p className="text-sm text-muted-foreground">
              {status ? statusCopy.description : description}
            </p>
          </div>
        </div>
        <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
      </Link>
    </section>
  );
}

export default function CustomerProfile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authMe = useAuthStore((state) => state.me);
  const sessionSource = useAuthStore((state) => state.sessionSource);
  const setMe = useAuthStore((state) => state.setMe);
  const clearMe = useAuthStore((state) => state.clearMe);
  const [profile, setProfile] = useState({ first_name: "", last_name: "" });
  const [editing, setEditing] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<MeResponse>("/users/me")).data,
  });

  const { data: authSnapshot } = useQuery({
    queryKey: ["auth", "me", "profile"],
    queryFn: () => authService.findMe(),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications", "me"],
    queryFn: async () => (await api.get<RoleApplication[]>("/applications/me")).data,
  });

  useEffect(() => {
    if (!me) return;
    setProfile({
      first_name: me.first_name ?? "",
      last_name: me.last_name ?? "",
    });
  }, [me]);

  useEffect(() => {
    if (!authSnapshot) return;
    const shouldSync =
      !authMe ||
      authMe.role !== authSnapshot.role ||
      authMe.phone !== authSnapshot.phone;

    if (shouldSync) {
      setMe(authSnapshot as AuthMeResponse);
    }
  }, [authMe, authSnapshot, setMe]);

  const saveProfile = useMutation({
    mutationFn: (data: { first_name?: string; last_name?: string }) => api.put("/users/me", data),
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

  const logout = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearMe();
      toast.success("Tizimdan chiqildi");
      navigate("/login", { replace: true });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Logoutda xatolik");
      clearMe();
      navigate("/login", { replace: true });
    },
  });

  const phone = useMemo(() => {
    if (me?.auth?.phone) return `+998 ${me.auth.phone}`;
    return authSnapshot?.phone ? `+998 ${authSnapshot.phone}` : "-";
  }, [authSnapshot?.phone, me?.auth?.phone]);

  const sellerApplication = useMemo(
    () => applications.find((item) => item.type === "SELLER") ?? null,
    [applications],
  );
  const courierApplication = useMemo(
    () => applications.find((item) => item.type === "COURIER") ?? null,
    [applications],
  );

  const hasSellerAccess = authMe?.role === "SELLER";
  const hasCourierAccess = authMe?.role === "COURIER";
  const isCustomerOnly = authMe?.role === "CUSTOMER" || !authMe?.role;
  const shouldHideLogout =
    sessionSource === "telegram" && telegramAuthService.hasTelegramInitData();

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
                <p className="text-xs text-muted-foreground">
                  {getRoleLabel(authMe?.role)}
                </p>
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
                <div className="flex justify-end sm:col-span-2">
                  <Button onClick={() => saveProfile.mutate(profile)} disabled={saveProfile.isPending}>
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

        {hasSellerAccess ? (
          <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
            <Link
              to="/mobile/seller/store"
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-4 transition hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <StoreIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seller mini app</p>
                  <p className="text-lg font-semibold text-foreground">Do'kon workspace</p>
                </div>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
            </Link>
          </section>
        ) : null}

        {hasCourierAccess ? (
          <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
            <Link
              to="/mobile/courier/orders"
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-4 transition hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <TruckIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Courier mini app</p>
                  <p className="text-lg font-semibold text-foreground">Yetkazmalar workspace</p>
                </div>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
            </Link>
          </section>
        ) : null}

        {isCustomerOnly ? (
          <>
            <RoleApplicationCard
              title="Seller bo'lish"
              description="Do'koningizni ochish uchun ariza topshiring."
              to="/mobile/profile/apply-seller"
              status={sellerApplication?.status}
              icon={<StoreIcon className="h-5 w-5" />}
            />
            <RoleApplicationCard
              title="Delivery bo'lish"
              description="Tanlangan do'konga kuryer bo'lib biriking."
              to="/mobile/profile/apply-courier"
              status={courierApplication?.status}
              icon={<TruckIcon className="h-5 w-5" />}
            />
          </>
        ) : null}

        {!shouldHideLogout ? (
          <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
            <Button
              variant="outline"
              className="h-12 w-full justify-center rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOutIcon className="h-4.5 w-4.5" />
              {logout.isPending ? "Chiqilmoqda..." : "Tizimdan chiqish"}
            </Button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
