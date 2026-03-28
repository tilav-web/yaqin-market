import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CrownIcon, SearchIcon, StoreIcon, UserRoundPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import {
  AdminInfoPill,
  AdminPageHeader,
  AdminSurface,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaginatedResponse } from "@/interfaces/market.interface";
import { extractErrorMessage } from "@/lib/market";

interface Store {
  id: string;
  name: string;
  slug: string;
  owner?: { first_name?: string; last_name?: string } | null;
  phone?: string | null;
  address?: string | null;
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

type StoreCatalogResponse = PaginatedResponse<Store> & {
  summary: {
    total: number;
    active: number;
    prime: number;
  };
};

type UserCatalogResponse = PaginatedResponse<AdminStoreUser> & {
  summary: {
    total: number;
    customers: number;
    sellers: number;
    couriers: number;
    admins: number;
  };
};

const PAGE_SIZE = 10;

function StoreCardSkeleton() {
  return (
    <div className="rounded-[1.65rem] border border-slate-200/80 bg-white/88 p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-[1rem]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-4 w-40 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>
  );
}

export default function AdminStores() {
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    phone: "",
    address: "",
    owner_id: "",
    lat: "",
    lng: "",
  });
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim();

  const {
    data: storePages,
    isLoading: storesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["admin", "stores", "catalog", normalizedQuery],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<StoreCatalogResponse>("/stores", {
          params: {
            q: normalizedQuery || undefined,
            page: typeof pageParam === "number" ? pageParam : Number(pageParam ?? 1),
            limit: PAGE_SIZE,
          },
        })
      ).data,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
    staleTime: 60_000,
  });

  const { data: sellersPage } = useQuery({
    queryKey: ["admin", "users", "sellers-options"],
    queryFn: async () =>
      (
        await api.get<UserCatalogResponse>("/users", {
          params: {
            role: "SELLER",
            page: 1,
            limit: 100,
          },
        })
      ).data,
    staleTime: 60_000,
  });

  const sellers = sellersPage?.items ?? [];
  const visibleStores = useMemo(
    () => storePages?.pages.flatMap((page) => page.items) ?? [],
    [storePages],
  );
  const summary = storePages?.pages[0]?.summary ?? {
    total: 0,
    active: 0,
    prime: 0,
  };

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || !hasNextPage || isFetchingNextPage || storesLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage().catch(() => undefined);
        }
      },
      { rootMargin: "420px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, storesLoading, visibleStores.length]);

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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Store management"
        title="Do'konlar"
        description="Search, prime holati va infinite scroll bilan ishlaydigan modern super admin store panel."
        badge={`${summary.total} store`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminInfoPill label="Faol store" value={summary.active} />
        <AdminInfoPill label="Prime store" value={summary.prime} />
        <AdminInfoPill
          label="Sellerlar"
          value={sellersPage?.summary?.sellers ?? sellersPage?.meta.total ?? 0}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <AdminSurface className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary text-primary-foreground">
              <UserRoundPlusIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Yangi do'kon yaratish</h2>
              <p className="text-sm text-slate-500">
                Seller biriktiring va asosiy store ma'lumotlarini kiriting.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Do'kon nomi"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            />
            <Input
              placeholder="Slug"
              value={form.slug}
              onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value }))}
            />
            <Input
              placeholder="Telefon"
              value={form.phone}
              onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
            />
            <Input
              placeholder="Manzil"
              value={form.address}
              onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
            />
            <select
              value={form.owner_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, owner_id: event.target.value }))
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
            >
              <option value="">Seller tanlang</option>
              {sellers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Lat"
                value={form.lat}
                onChange={(e) => setForm((current) => ({ ...current, lat: e.target.value }))}
              />
              <Input
                placeholder="Lng"
                value={form.lng}
                onChange={(e) => setForm((current) => ({ ...current, lng: e.target.value }))}
              />
            </div>
          </div>

          <Button
            className="mt-5 rounded-full px-5"
            onClick={() => createStore.mutate()}
            disabled={!form.name || !form.owner_id || createStore.isPending}
          >
            {createStore.isPending ? "Yaratilmoqda..." : "Do'kon yaratish"}
          </Button>
        </AdminSurface>

        <AdminSurface className="p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Tezkor nazorat</h2>
              <p className="text-sm text-slate-500">
                Store onboarding va prime tarqatishni shu bo'limdan kuzating.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/85 p-4">
              <p className="text-sm font-semibold text-slate-950">Pagination ishlayapti</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Endi admin ro'yxati birdan barcha store’larni olmaydi. Pastga tushgan sari
                keyingi sahifalar yuklanadi.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/85 p-4">
              <p className="text-sm font-semibold text-slate-950">Seller onboarding</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Sellerlar ro'yxati ham filtrlab olingan. Do'kon yaratishda faqat seller
                foydalanuvchilar dropdown’ga tushadi.
              </p>
            </div>
          </div>
        </AdminSurface>
      </div>

      <AdminSurface className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Do'konlar ro'yxati</h2>
            <p className="text-sm text-slate-500">
              Search backendda ishlaydi, scroll bo'lsa keyingi kartalar avtomatik keladi.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-2.5 lg:w-[320px]">
            <SearchIcon className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Do'kon, owner yoki telefon"
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {storesLoading ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <StoreCardSkeleton key={index} />
            ))}
          </div>
        ) : visibleStores.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">Mos do'kon topilmadi.</p>
        ) : (
          <>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {visibleStores.map((store) => (
                <div
                  key={store.id}
                  className="rounded-[1.65rem] border border-slate-200/80 bg-white/88 p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-primary/8 text-primary">
                        <StoreIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-950">
                          {store.name}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {store.address ?? store.slug}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-950">
                        ⭐ {Number(store.rating ?? 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-400">{store.slug}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={
                        store.is_active
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                          : "rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700"
                      }
                    >
                      {store.is_active ? "Faol" : "Faol emas"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {store.owner?.first_name ?? "Owner yo'q"} {store.owner?.last_name ?? ""}
                    </span>
                    {store.is_prime ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Prime
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() =>
                        setFlag.mutate({
                          id: store.id,
                          path: "active",
                          key: "is_active",
                          value: !store.is_active,
                        })
                      }
                    >
                      {store.is_active ? "Faollikni o'chirish" : "Faollashtirish"}
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        setFlag.mutate({
                          id: store.id,
                          path: "prime",
                          key: "is_prime",
                          value: !store.is_prime,
                        })
                      }
                    >
                      <CrownIcon className="h-4 w-4" />
                      {store.is_prime ? "Prime off" : "Prime on"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {hasNextPage ? <div ref={loadMoreRef} className="h-10 w-full" /> : null}

            {isFetchingNextPage ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <StoreCardSkeleton key={index} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </AdminSurface>
    </div>
  );
}
