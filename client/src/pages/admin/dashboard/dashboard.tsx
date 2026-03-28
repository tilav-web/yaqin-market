import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BoxesIcon,
  CrownIcon,
  PackageCheckIcon,
  SparklesIcon,
  StoreIcon,
  TruckIcon,
  UserRoundIcon,
  Users2Icon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/api/api";
import {
  AdminInfoPill,
  AdminPageHeader,
  AdminStatCard,
  AdminSurface,
} from "@/components/admin/admin-ui";
import { buttonVariants } from "@/components/ui/button";

type StoreItem = {
  id: string;
  name: string;
  is_active: boolean;
  is_prime: boolean;
  rating: number;
  owner?: {
    first_name?: string;
    last_name?: string;
  } | null;
};

type CategoryItem = {
  id: string;
  is_active: boolean;
};

type ProductItem = {
  id: string | number;
  name: string;
  is_active: boolean;
  category?: { name?: string } | null;
};

type DashboardUser = {
  id: string;
  first_name: string;
  last_name: string;
  auth?: {
    role?: string;
  } | null;
  stores?: { id: string; name: string }[];
};

export default function Dashboard() {
  const { data: stores = [] } = useQuery({
    queryKey: ["admin", "stores", "dashboard"],
    queryFn: async () => (await api.get<StoreItem[]>("/stores")).data,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories", "dashboard"],
    queryFn: async () => (await api.get<CategoryItem[]>("/categories")).data,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products", "dashboard"],
    queryFn: async () => (await api.get<ProductItem[]>("/products")).data,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users", "dashboard"],
    queryFn: async () => (await api.get<DashboardUser[]>("/users")).data,
  });

  const stats = useMemo(() => {
    const sellerCount = users.filter((user) => user.auth?.role === "SELLER").length;
    const customerCount = users.filter((user) => user.auth?.role === "CUSTOMER").length;
    const courierCount = users.filter((user) => user.auth?.role === "COURIER").length;
    const activeStores = stores.filter((store) => store.is_active).length;
    const primeStores = stores.filter((store) => store.is_prime).length;
    const averageRating =
      stores.length > 0
        ? (
            stores.reduce((sum, store) => sum + Number(store.rating ?? 0), 0) / stores.length
          ).toFixed(1)
        : "0.0";

    return {
      sellerCount,
      customerCount,
      courierCount,
      activeStores,
      primeStores,
      averageRating,
    };
  }, [stores, users]);

  const topStores = useMemo(
    () =>
      [...stores]
        .sort((left, right) => Number(right.rating ?? 0) - Number(left.rating ?? 0))
        .slice(0, 5),
    [stores],
  );

  const roleDistribution = useMemo(
    () => [
      { label: "Mijozlar", value: stats.customerCount, tone: "bg-slate-900" },
      { label: "Sellerlar", value: stats.sellerCount, tone: "bg-primary" },
      { label: "Kuryerlar", value: stats.courierCount, tone: "bg-emerald-500" },
    ],
    [stats.courierCount, stats.customerCount, stats.sellerCount],
  );

  const catalogHighlights = useMemo(
    () => [
      {
        label: "Faol do'konlar",
        value: `${stats.activeStores}/${stores.length}`,
      },
      {
        label: "Prime do'konlar",
        value: stats.primeStores,
      },
      {
        label: "Faol kategoriya",
        value: categories.filter((category) => category.is_active).length,
      },
      {
        label: "Faol mahsulot",
        value: products.filter((product) => product.is_active).length,
      },
    ],
    [categories, products, stats.activeStores, stats.primeStores, stores.length],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Boshqaruv markazi"
        title="Platforma nazorati"
        description="Do'konlar, katalog va foydalanuvchilar bo'yicha asosiy ko'rsatkichlarni shu yerdan kuzatib boring."
        badge={`${stores.length} do'kon faoliyatda`}
        actions={
          <>
            <Link to="/admin/stores" className={buttonVariants({ variant: "outline", className: "rounded-full" })}>
              Do'konlarni ko'rish
            </Link>
            <Link to="/admin/products" className={buttonVariants({ className: "rounded-full" })}>
              Katalogni boshqarish
            </Link>
          </>
        }
      />

      <AdminSurface className="p-5 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                Bugungi fokus
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Boshqaruv uchun eng muhim nuqtalar bir joyda
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Prime do'konlar, yangi sellerlar va katalog sog'ligi bo'yicha tezkor qaror qilish uchun optimallashtirilgan ko'rinish.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {catalogHighlights.map((item) => (
                <AdminInfoPill key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-primary/10 bg-[linear-gradient(145deg,rgba(220,38,38,0.95),rgba(244,63,94,0.88))] p-5 text-white shadow-[0_26px_55px_-38px_rgba(220,38,38,0.65)]">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white/14">
                <SparklesIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                  Pulse
                </p>
                <p className="mt-1 text-2xl font-semibold">{stats.averageRating}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/84">
              Platformadagi o'rtacha store reytingi. Prime do'konlar va faol sellerlar soni oshgani sari customer tajribasi ham yaxshilanadi.
            </p>
            <div className="mt-5 grid gap-3">
              {roleDistribution.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[1.2rem] border border-white/14 bg-white/8 px-4 py-3"
                >
                  <span className="text-sm font-medium text-white/84">{item.label}</span>
                  <span className="text-base font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminSurface>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard
          label="Do'konlar"
          value={stores.length}
          hint={`${stats.activeStores} tasi faol`}
          icon={<StoreIcon className="h-5 w-5" />}
        />
        <AdminStatCard
          label="Prime"
          value={stats.primeStores}
          hint="Reklama va ustun ko'rinishga ega"
          icon={<CrownIcon className="h-5 w-5" />}
          tone="dark"
        />
        <AdminStatCard
          label="Mahsulotlar"
          value={products.length}
          hint={`${products.filter((product) => product.is_active).length} tasi faol`}
          icon={<BoxesIcon className="h-5 w-5" />}
          tone="emerald"
        />
        <AdminStatCard
          label="Kategoriyalar"
          value={categories.length}
          hint="Katalog tuzilmasi"
          icon={<PackageCheckIcon className="h-5 w-5" />}
          tone="sky"
        />
        <AdminStatCard
          label="Foydalanuvchilar"
          value={users.length}
          hint={`${stats.sellerCount} seller · ${stats.courierCount} kuryer`}
          icon={<Users2Icon className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
        <AdminSurface className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Eng yaxshi do'konlar</h3>
              <p className="text-sm text-slate-500">
                Reyting bo'yicha yuqorida turgan store'lar.
              </p>
            </div>
            <Link to="/admin/stores" className={buttonVariants({ variant: "outline", className: "rounded-full" })}>
              Barchasi
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {topStores.map((store, index) => (
              <div
                key={store.id}
                className="flex items-center justify-between gap-4 rounded-[1.45rem] border border-slate-200/80 bg-white/88 px-4 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/8 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{store.name}</p>
                    <p className="truncate text-sm text-slate-500">
                      {store.owner?.first_name ?? "Ega yo'q"} {store.owner?.last_name ?? ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-950">
                    ⭐ {Number(store.rating ?? 0).toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {store.is_prime ? "Prime" : "Oddiy"} · {store.is_active ? "Faol" : "Yopiq"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AdminSurface>

        <AdminSurface className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Rol bo'yicha taqsimot</h3>
              <p className="text-sm text-slate-500">
                Foydalanuvchilar soni va onboarding holati.
              </p>
            </div>
            <Link to="/admin/users" className={buttonVariants({ variant: "outline", className: "rounded-full" })}>
              Foydalanuvchilar
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/88 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-900 text-white">
                    <UserRoundIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-950">Mijozlar</p>
                    <p className="text-sm text-slate-500">Asosiy talab oqimi</p>
                  </div>
                </div>
                <span className="text-2xl font-semibold text-slate-950">{stats.customerCount}</span>
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/88 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary text-primary-foreground">
                    <StoreIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-950">Sellerlar</p>
                    <p className="text-sm text-slate-500">Do'kon va taklif egalari</p>
                  </div>
                </div>
                <span className="text-2xl font-semibold text-slate-950">{stats.sellerCount}</span>
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/88 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-emerald-500 text-white">
                    <TruckIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-950">Kuryerlar</p>
                    <p className="text-sm text-slate-500">Yetkazib berish oqimi</p>
                  </div>
                </div>
                <span className="text-2xl font-semibold text-slate-950">{stats.courierCount}</span>
              </div>
            </div>
          </div>
        </AdminSurface>
      </div>
    </div>
  );
}
