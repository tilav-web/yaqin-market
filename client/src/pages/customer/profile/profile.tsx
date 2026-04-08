import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ChevronRightIcon,
  GlobeIcon,
  HelpCircleIcon,
  InfoIcon,
  LogOutIcon,
  MapPinIcon,
  MessageCircleIcon,
  PackageIcon,
  SendIcon,
  ShoppingBagIcon,
  Wallet2Icon,
} from "lucide-react";
import { authService } from "@/services/auth.service";
import { telegramAuthService } from "@/services/telegram-auth.service";
import type { AuthMeResponse } from "@/interfaces/auth.interface";
import type { RoleApplication } from "@/interfaces/application.interface";
import { getRoleLabel } from "@/lib/market";
import { useAuthStore } from "@/stores/auth.store";
import { useLang } from "@/context/lang.context";

type MeResponse = {
  id: string;
  first_name: string;
  last_name: string;
  auth?: { phone?: string } | null;
};

/* ------------------------------------------------------------------ */
/*  Menu item component                                                */
/* ------------------------------------------------------------------ */
function MenuItem({
  icon,
  iconBg,
  iconColor,
  label,
  sub,
  to,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  sub: string;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-3 transition active:bg-slate-50 hover:bg-slate-50">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{label}</p>
        <p className="text-xs text-slate-400 truncate">{sub}</p>
      </div>
      <ChevronRightIcon className="h-4 w-4 text-slate-300" />
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className="w-full text-left" onClick={onClick}>
        {inner}
      </button>
    );
  }

  return <Link to={to ?? "#"}>{inner}</Link>;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function CustomerProfile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { lang, setLang, tr } = useLang();

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
    queryFn: async () =>
      (await api.get<RoleApplication[]>("/applications/me")).data,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "my"],
    queryFn: async () => (await api.get<any[]>("/orders/my")).data,
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
    if (shouldSync) setMe(authSnapshot as AuthMeResponse);
  }, [authMe, authSnapshot, setMe]);

  const saveProfile = useMutation({
    mutationFn: (data: { first_name?: string; last_name?: string }) =>
      api.put("/users/me", data),
    onSuccess: () => {
      toast.success(tr("save"));
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : tr("error"));
    },
  });

  const logout = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearMe();
      toast.success(tr("logout"));
      navigate("/login", { replace: true });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : tr("error"));
      clearMe();
      navigate("/login", { replace: true });
    },
  });

  const phone = useMemo(() => {
    if (me?.auth?.phone) return `+998 ${me.auth.phone}`;
    return authSnapshot?.phone ? `+998 ${authSnapshot.phone}` : "-";
  }, [authSnapshot?.phone, me?.auth?.phone]);

  const initials = useMemo(() => {
    const f = me?.first_name?.[0] ?? "";
    const l = me?.last_name?.[0] ?? "";
    return (f + l).toUpperCase() || "?";
  }, [me?.first_name, me?.last_name]);

  const fullName =
    [me?.first_name, me?.last_name].filter(Boolean).join(" ") || "-";

  const shouldHideLogout =
    sessionSource === "telegram" && telegramAuthService.hasTelegramInitData();

  const isCustomerOnly = authMe?.role === "CUSTOMER" || !authMe?.role;

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

  /* ---- Not logged in ---- */
  if (!authMe) {
    return (
      <div className="min-h-screen pb-36 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 text-2xl font-bold">
          ?
        </div>
        <p className="text-lg font-semibold text-slate-900">
          {tr("profile_not_logged")}
        </p>
        <p className="text-sm text-slate-500">{tr("profile_login_required")}</p>
        <Link to="/login">
          <Button className="rounded-full px-8">{tr("login")}</Button>
        </Link>
      </div>
    );
  }

  /* ---- Logged in ---- */
  return (
    <div className="min-h-screen pb-36">
      {/* ---------- Red header ---------- */}
      <div className="relative bg-red-600 pb-16 pt-10 rounded-b-[1.75rem]">
        <div className="flex items-center gap-4 px-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white ring-2 ring-white/30">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">
              {fullName}
            </h1>
            <p className="text-sm text-white/70">{phone}</p>
            <span className="mt-1 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium text-white">
              {getRoleLabel(authMe.role)}
            </span>
          </div>
          <button
            type="button"
            className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25 transition"
            onClick={() => setEditing((p) => !p)}
          >
            {editing ? tr("cancel") : tr("profile_edit")}
          </button>
        </div>
      </div>

      {/* ---------- Stats row floating over header ---------- */}
      <div className="-mt-10 px-4">
        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">
              {orders.length}
            </p>
            <p className="text-xs text-slate-400">{tr("my_orders")}</p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-lg font-bold text-slate-900">
              {orders
                .reduce((s, o) => s + (o.total_price ?? 0), 0)
                .toLocaleString()}{" "}
            </p>
            <p className="text-xs text-slate-400">{tr("order_total")}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">-</p>
            <p className="text-xs text-slate-400">{tr("my_locations")}</p>
          </div>
        </div>
      </div>

      {/* ---------- Edit form (conditionally shown) ---------- */}
      {editing && (
        <div className="px-4 mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <Input
              placeholder={tr("profile_edit")}
              value={profile.first_name}
              onChange={(e) =>
                setProfile((p) => ({ ...p, first_name: e.target.value }))
              }
            />
            <Input
              placeholder={tr("profile_edit")}
              value={profile.last_name}
              onChange={(e) =>
                setProfile((p) => ({ ...p, last_name: e.target.value }))
              }
            />
            <Button
              className="w-full rounded-xl"
              onClick={() => saveProfile.mutate(profile)}
              disabled={saveProfile.isPending}
            >
              {saveProfile.isPending ? tr("loading") : tr("save")}
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Activity section ---------- */}
      <div className="px-4 mt-5">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {tr("activity")}
        </p>
        <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50">
          <MenuItem
            icon={<ShoppingBagIcon className="h-4.5 w-4.5" />}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            label={tr("my_orders")}
            sub={tr("my_orders_sub")}
            to="/mobile/orders"
          />
          <MenuItem
            icon={<SendIcon className="h-4.5 w-4.5" />}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            label={tr("my_broadcast")}
            sub={tr("my_broadcast_sub")}
            to="/mobile/requests"
          />
          <MenuItem
            icon={<MessageCircleIcon className="h-4.5 w-4.5" />}
            iconBg="bg-sky-100"
            iconColor="text-sky-600"
            label={tr("messages")}
            sub={tr("messages_sub")}
            to="/mobile/chat"
          />
          <MenuItem
            icon={<Wallet2Icon className="h-4.5 w-4.5" />}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            label={tr("wallet")}
            sub={tr("wallet_sub")}
            to="/mobile/wallet"
          />
        </div>
      </div>

      {/* ---------- Settings section ---------- */}
      <div className="px-4 mt-5">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {tr("settings")}
        </p>
        <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50">
          <MenuItem
            icon={<GlobeIcon className="h-4.5 w-4.5" />}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            label={tr("language")}
            sub={lang === "uz" ? "O'zbek" : "Русский"}
            onClick={() => setLang(lang === "uz" ? "ru" : "uz")}
          />
          <MenuItem
            icon={<MapPinIcon className="h-4.5 w-4.5" />}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            label={tr("my_locations")}
            sub={tr("my_locations_sub")}
            to="/mobile/locations"
          />
          <MenuItem
            icon={<HelpCircleIcon className="h-4.5 w-4.5" />}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            label={tr("help")}
            sub={tr("help_sub")}
            to="/mobile/help"
          />
          <MenuItem
            icon={<InfoIcon className="h-4.5 w-4.5" />}
            iconBg="bg-slate-100"
            iconColor="text-slate-600"
            label={tr("about")}
            sub={tr("about_sub")}
            to="/mobile/about"
          />
        </div>
      </div>

      {/* ---------- Seller / Courier access or applications ---------- */}
      {hasSellerAccess && (
        <div className="px-4 mt-5">
          <MenuItem
            icon={<PackageIcon className="h-4.5 w-4.5" />}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            label={tr("become_seller")}
            sub={tr("become_seller_sub")}
            to="/mobile/seller/store"
          />
        </div>
      )}
      {hasCourierAccess && (
        <div className="px-4 mt-5">
          <MenuItem
            icon={<PackageIcon className="h-4.5 w-4.5" />}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            label={tr("become_courier")}
            sub={tr("become_courier_sub")}
            to="/mobile/courier/orders"
          />
        </div>
      )}

      {isCustomerOnly && (
        <div className="px-4 mt-5">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {tr("start_business")}
          </p>
          <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50">
            <MenuItem
              icon={<PackageIcon className="h-4.5 w-4.5" />}
              iconBg="bg-rose-100"
              iconColor="text-rose-600"
              label={tr("become_seller")}
              sub={
                sellerApplication?.status
                  ? sellerApplication.status
                  : tr("become_seller_sub")
              }
              to="/mobile/profile/apply-seller"
            />
            <MenuItem
              icon={<PackageIcon className="h-4.5 w-4.5" />}
              iconBg="bg-cyan-100"
              iconColor="text-cyan-600"
              label={tr("become_courier")}
              sub={
                courierApplication?.status
                  ? courierApplication.status
                  : tr("become_courier_sub")
              }
              to="/mobile/profile/apply-courier"
            />
          </div>
        </div>
      )}

      {/* ---------- Logout ---------- */}
      {!shouldHideLogout && (
        <div className="px-4 mt-6 mb-4">
          <Button
            variant="outline"
            className="h-12 w-full justify-center rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOutIcon className="mr-2 h-4.5 w-4.5" />
            {logout.isPending ? tr("loading") : tr("logout")}
          </Button>
        </div>
      )}
    </div>
  );
}
