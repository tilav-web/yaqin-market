import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { SearchIcon, ShieldCheckIcon, StoreIcon, Users2Icon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import {
  AdminInfoPill,
  AdminPageHeader,
  AdminSurface,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaginatedResponse } from "@/interfaces/market.interface";
import type { AuthRole } from "@/types/auth-role.type";
import { extractErrorMessage, getRoleLabel, normalizePhone } from "@/lib/market";

type AdminUser = {
  id: string;
  first_name: string;
  last_name: string;
  auth?: {
    id: string;
    phone?: string | null;
    role: AuthRole;
  } | null;
  stores?: { id: string; name: string }[];
};

type UserCatalogResponse = PaginatedResponse<AdminUser> & {
  summary: {
    total: number;
    customers: number;
    sellers: number;
    couriers: number;
    admins: number;
  };
};

const PAGE_SIZE = 10;
const roles: AuthRole[] = ["CUSTOMER", "SELLER", "COURIER", "SUPER_ADMIN"];

function UserCardSkeleton() {
  return (
    <div className="rounded-[1.65rem] border border-slate-200/80 bg-white/88 p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-[1rem]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-4 space-y-2 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-4 w-full rounded-full" />
      </div>
      <Skeleton className="mt-4 h-11 w-full rounded-[1rem]" />
    </div>
  );
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<AuthRole | "">("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim();

  const {
    data: userPages,
    isLoading: usersLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["admin", "users", "catalog", normalizedQuery, selectedRole],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<UserCatalogResponse>("/users", {
          params: {
            q: normalizedQuery || undefined,
            role: selectedRole || undefined,
            page: typeof pageParam === "number" ? pageParam : Number(pageParam ?? 1),
            limit: PAGE_SIZE,
          },
        })
      ).data,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
    staleTime: 60_000,
  });

  const visibleUsers = useMemo(
    () => userPages?.pages.flatMap((page) => page.items) ?? [],
    [userPages],
  );

  const summary = userPages?.pages[0]?.summary ?? {
    total: 0,
    customers: 0,
    sellers: 0,
    couriers: 0,
    admins: 0,
  };

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || !hasNextPage || isFetchingNextPage || usersLoading) {
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, usersLoading, visibleUsers.length]);

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AuthRole }) =>
      (await api.put(`/users/${id}/role`, { role })).data,
    onSuccess: () => {
      toast.success("Rol yangilandi");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Identity control"
        title="Foydalanuvchilar"
        description="Role mapping endi backend pagination va infinite scroll bilan ishlaydi."
        badge={`${summary.total} foydalanuvchi`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminInfoPill label="Mijozlar" value={summary.customers} />
        <AdminInfoPill label="Sellerlar" value={summary.sellers} />
        <AdminInfoPill label="Kuryerlar" value={summary.couriers} />
        <AdminInfoPill label="Adminlar" value={summary.admins} />
      </div>

      <AdminSurface className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Role mapping</h2>
            <p className="text-sm text-slate-500">
              Har bir foydalanuvchini tegishli oqimga biriktirish uchun roli shu yerda boshqariladi.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="flex items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-2.5 sm:w-[320px]">
              <SearchIcon className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ism, telefon yoki store"
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as AuthRole | "")}
              className="h-[46px] rounded-[1.1rem] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none sm:min-w-[180px]"
            >
              <option value="">Barcha rollar</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {usersLoading ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <UserCardSkeleton key={index} />
            ))}
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="mt-5 rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
            <p className="text-base font-semibold text-slate-900">Mos foydalanuvchi topilmadi</p>
            <p className="mt-2 text-sm text-slate-500">
              Search yoki role filterini o'zgartirib ko'ring.
            </p>
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setQuery("");
                  setSelectedRole("");
                }}
              >
                Filterlarni tozalash
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {visibleUsers.map((user) => {
                const fullName = `${user.first_name} ${user.last_name}`.trim();

                return (
                  <div
                    key={user.id}
                    className="rounded-[1.65rem] border border-slate-200/80 bg-white/88 p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-primary/8 text-sm font-semibold text-primary">
                          {(user.first_name?.[0] ?? "U").toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-950">
                            {fullName || "Ismsiz foydalanuvchi"}
                          </p>
                          <p className="truncate text-sm text-slate-500">
                            {normalizePhone(user.auth?.phone)}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {getRoleLabel(user.auth?.role)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        <Users2Icon className="h-3.5 w-3.5" />
                        ID: {user.id.slice(0, 8)}
                      </span>
                      {user.stores?.length ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          <StoreIcon className="h-3.5 w-3.5" />
                          {user.stores.length} do'kon
                        </span>
                      ) : null}
                      {user.auth?.role === "SUPER_ADMIN" ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                          <ShieldCheckIcon className="h-3.5 w-3.5" />
                          Super admin
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Biriktirilgan store
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {user.stores?.map((store) => store.name).join(", ") || "Biriktirilmagan"}
                      </p>
                    </div>

                    <div className="mt-4">
                      <select
                        value={user.auth?.role ?? "CUSTOMER"}
                        onChange={(event) =>
                          updateRole.mutate({
                            id: user.id,
                            role: event.target.value as AuthRole,
                          })
                        }
                        className="h-11 w-full rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {getRoleLabel(role)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasNextPage ? <div ref={loadMoreRef} className="h-10 w-full" /> : null}

            {isFetchingNextPage ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <UserCardSkeleton key={index} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </AdminSurface>
    </div>
  );
}
