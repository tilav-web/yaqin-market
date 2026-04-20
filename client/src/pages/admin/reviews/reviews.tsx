import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquareTextIcon,
  StarIcon,
  Trash2Icon,
  UserIcon,
  StoreIcon,
  TruckIcon,
  BoxIcon,
  FilterIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import {
  AdminPageHeader,
  AdminStatCard,
  AdminSurface,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/market";

type ReviewTarget = "PRODUCT" | "COURIER" | "STORE";

type AdminReview = {
  id: string;
  target: ReviewTarget;
  rating: number;
  comment: string | null;
  createdAt: string;
  owner?: {
    id: string;
    first_name: string;
    last_name: string;
    auth?: { phone?: string | null } | null;
  } | null;
  product?: {
    id: number;
    name: Record<string, string> | string;
  } | null;
  store?: { id: string; name: string } | null;
  courier?: {
    id: string;
    first_name: string;
    last_name: string;
    auth?: { phone?: string | null } | null;
  } | null;
};

type ReviewListResponse = {
  items: AdminReview[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

type ReviewStats = {
  total: number;
  low_rating: number;
  by_target: Array<{
    target: ReviewTarget;
    count: number;
    avg: number;
  }>;
};

const TARGET_LABEL: Record<ReviewTarget | "", string> = {
  "": "Barchasi",
  PRODUCT: "Mahsulotlar",
  COURIER: "Kuryerlar",
  STORE: "Do'konlar",
};

function getProductName(
  name: NonNullable<AdminReview["product"]>["name"] | undefined,
) {
  if (!name) return "—";
  if (typeof name === "string") return name;
  return name.uz ?? name.ru ?? name.en ?? "—";
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<ReviewTarget | "">("");
  const [minRating, setMinRating] = useState<string>("");
  const [maxRating, setMaxRating] = useState<string>("");
  const [toDelete, setToDelete] = useState<AdminReview | null>(null);

  const { data: stats } = useQuery<ReviewStats>({
    queryKey: ["admin-review-stats"],
    queryFn: async () => (await api.get("/reviews/admin/stats")).data,
  });

  const { data, isLoading } = useQuery<ReviewListResponse>({
    queryKey: ["admin-reviews", target, minRating, maxRating],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "50" };
      if (target) params.target = target;
      if (minRating) params.min_rating = minRating;
      if (maxRating) params.max_rating = maxRating;
      const r = await api.get("/reviews/admin/list", { params });
      return r.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/reviews/admin/${id}`)).data,
    onSuccess: () => {
      toast.success("Sharh o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-review-stats"] });
      setToDelete(null);
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const items = data?.items ?? [];

  const targetCount = (t: ReviewTarget) =>
    stats?.by_target.find((b) => b.target === t)?.count ?? 0;
  const targetAvg = (t: ReviewTarget) =>
    stats?.by_target.find((b) => b.target === t)?.avg ?? 0;

  return (
    <>
      <AdminPageHeader
        title="Sharhlar"
        description="Mahsulot, do'kon va kuryer baholarini ko'rib chiqing. Zararli yoki noto'g'ri sharhlarni o'chirib tashlashingiz mumkin."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Jami sharhlar"
          value={stats?.total ?? "—"}
          icon={<MessageSquareTextIcon className="size-5" />}
        />
        <AdminStatCard
          label="Past baho (1-2 ★)"
          value={stats?.low_rating ?? "—"}
          icon={<StarIcon className="size-5" />}
          tone="dark"
        />
        <AdminStatCard
          label={`Kuryerlar (${targetCount("COURIER")})`}
          value={`${targetAvg("COURIER")} ★`}
          icon={<TruckIcon className="size-5" />}
          tone="sky"
        />
        <AdminStatCard
          label={`Mahsulotlar (${targetCount("PRODUCT")})`}
          value={`${targetAvg("PRODUCT")} ★`}
          icon={<BoxIcon className="size-5" />}
          tone="emerald"
        />
      </div>

      <AdminSurface className="mt-6 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FilterIcon className="size-4" />
            Filtrlar:
          </div>
          {(["", "PRODUCT", "COURIER", "STORE"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                target === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
              }`}
            >
              {TARGET_LABEL[t]}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <Input
              placeholder="Min ★"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="h-9 w-20"
              type="number"
              min={1}
              max={5}
            />
            <span className="text-xs text-slate-400">—</span>
            <Input
              placeholder="Max ★"
              value={maxRating}
              onChange={(e) => setMaxRating(e.target.value)}
              className="h-9 w-20"
              type="number"
              min={1}
              max={5}
            />
            {(minRating || maxRating) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMinRating("");
                  setMaxRating("");
                }}
              >
                Tozalash
              </Button>
            )}
          </div>
        </div>
      </AdminSurface>

      <AdminSurface className="mt-4 p-5">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Yuklanmoqda...
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquareTextIcon className="mx-auto mb-3 size-10 text-slate-400" />
            <div className="text-sm text-muted-foreground">
              Bu filtrlar bo'yicha sharh topilmadi
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((r) => (
              <ReviewCard key={r.id} review={r} onDelete={() => setToDelete(r)} />
            ))}
          </div>
        )}
      </AdminSurface>

      <Dialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sharhni o'chirish</DialogTitle>
          </DialogHeader>
          {toDelete && (
            <p className="text-sm text-slate-600">
              Bu sharh o'chirilgach, tegishli do'kon/kuryer/mahsulot reytingi
              qayta hisoblanadi. Amalni orqaga qaytarib bo'lmaydi.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Bekor
            </Button>
            <Button
              variant="destructive"
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReviewCard({
  review,
  onDelete,
}: {
  review: AdminReview;
  onDelete: () => void;
}) {
  const targetIcon =
    review.target === "PRODUCT" ? (
      <BoxIcon className="size-3.5" />
    ) : review.target === "COURIER" ? (
      <TruckIcon className="size-3.5" />
    ) : (
      <StoreIcon className="size-3.5" />
    );

  const subjectLine =
    review.target === "PRODUCT"
      ? getProductName(review.product?.name)
      : review.target === "COURIER"
        ? `${review.courier?.first_name ?? ""} ${review.courier?.last_name ?? ""}`.trim() ||
          "Kuryer"
        : review.store?.name ?? "Do'kon";

  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {targetIcon}
              {review.target}
            </span>
            <span className="text-sm font-semibold text-slate-900 truncate">
              {subjectLine}
            </span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  className={`size-4 ${
                    i < review.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300"
                  }`}
                />
              ))}
              <span className="ml-1 text-xs font-semibold text-slate-700">
                {review.rating}/5
              </span>
            </div>
          </div>

          {review.comment && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {review.comment}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <UserIcon className="size-3" />
              {review.owner?.first_name ?? ""} {review.owner?.last_name ?? ""}
              {review.owner?.auth?.phone ? ` (+998${review.owner.auth.phone})` : ""}
            </span>
            {review.target === "PRODUCT" && review.store && (
              <span className="inline-flex items-center gap-1">
                <StoreIcon className="size-3" />
                {review.store.name}
              </span>
            )}
            <span>{new Date(review.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="shrink-0 text-red-600 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
