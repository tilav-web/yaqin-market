import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, CheckCircle2Icon, CircleDollarSignIcon, ScaleIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import {
  AdminInfoPill,
  AdminPageHeader,
  AdminSurface,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/market";

type DisputedOrder = {
  id: string;
  order_number: string;
  items_price: number;
  total_price: number;
  paid_amount: number | null;
  change_amount: number;
  user_claimed_amount: number | null;
  change_submitted_at: string | null;
  store: { id: string; name: string } | null;
  customer: { id: string; first_name?: string; last_name?: string; phone?: string } | null;
  courier: { id: string; first_name?: string; last_name?: string; phone?: string } | null;
};

export default function AdminDisputesPage() {
  const queryClient = useQueryClient();
  const [resolving, setResolving] = useState<DisputedOrder | null>(null);
  const [resolution, setResolution] = useState<"USER_WON" | "SELLER_WON" | "ADJUSTED">("USER_WON");
  const [adjustedAmount, setAdjustedAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const { data: disputes = [], isLoading } = useQuery<DisputedOrder[]>({
    queryKey: ["admin-change-disputes"],
    queryFn: async () => {
      const r = await api.get("/orders/admin/change-disputes");
      return r.data ?? [];
    },
    refetchInterval: 30000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (params: {
      orderId: string;
      resolution: "USER_WON" | "SELLER_WON" | "ADJUSTED";
      adjusted_amount?: number;
      admin_note?: string;
    }) => {
      const { orderId, ...body } = params;
      const r = await api.post(`/orders/${orderId}/resolve-change`, body);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Nizo hal qilindi");
      queryClient.invalidateQueries({ queryKey: ["admin-change-disputes"] });
      setResolving(null);
      setAdjustedAmount("");
      setAdminNote("");
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err));
    },
  });

  const openResolve = (dispute: DisputedOrder) => {
    setResolving(dispute);
    setResolution("USER_WON");
    setAdjustedAmount(String(dispute.change_amount ?? ""));
    setAdminNote("");
  };

  const submitResolution = () => {
    if (!resolving) return;
    if (resolution === "ADJUSTED") {
      const amt = Number(adjustedAmount);
      if (!Number.isFinite(amt) || amt < 0) {
        toast.error("Adjusted amount to'g'ri kiriting");
        return;
      }
    }
    resolveMutation.mutate({
      orderId: resolving.id,
      resolution,
      adjusted_amount:
        resolution === "ADJUSTED" ? Number(adjustedAmount) : undefined,
      admin_note: adminNote.trim() || undefined,
    });
  };

  return (
    <>
      <AdminPageHeader
        title="Qaytim nizolari"
        subtitle="Kuryer va mijoz o'rtasidagi naqd pul farqi bo'yicha nizolarni hal qiling"
        icon={<ScaleIcon className="size-5" />}
      />

      <AdminSurface>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Yuklanmoqda...
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2Icon className="mx-auto size-10 text-emerald-500 mb-3" />
            <div className="text-sm text-muted-foreground">
              Faol nizolar yo'q
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {disputes.map((d) => {
              const courierAmt = Number(d.paid_amount ?? 0);
              const userAmt = Number(d.user_claimed_amount ?? 0);
              const difference = userAmt - courierAmt;
              return (
                <div
                  key={d.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircleIcon className="size-4 text-amber-600" />
                        <div className="font-semibold text-amber-900">
                          Buyurtma #{d.order_number}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                        <AdminInfoPill
                          label="Buyurtma narxi"
                          value={`${Number(d.total_price).toLocaleString()} so'm`}
                        />
                        <AdminInfoPill
                          label="Kuryer aytdi"
                          value={`${courierAmt.toLocaleString()} so'm`}
                        />
                        <AdminInfoPill
                          label="Mijoz aytdi"
                          value={`${userAmt.toLocaleString()} so'm`}
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-muted-foreground md:grid-cols-2">
                        <div className="flex items-center gap-1.5">
                          <CircleDollarSignIcon className="size-3" />
                          Do'kon: <span className="font-medium">{d.store?.name ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="size-3" />
                          Mijoz:{" "}
                          <span className="font-medium">
                            {d.customer?.first_name ?? ""} {d.customer?.last_name ?? ""}{" "}
                            {d.customer?.phone ? `(${d.customer.phone})` : ""}
                          </span>
                        </div>
                        {d.courier && (
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="size-3" />
                            Kuryer:{" "}
                            <span className="font-medium">
                              {d.courier?.first_name ?? ""} {d.courier?.last_name ?? ""}
                            </span>
                          </div>
                        )}
                        {d.change_submitted_at && (
                          <div>
                            Yuborilgan: {new Date(d.change_submitted_at).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {difference !== 0 && (
                        <div className="mt-2 text-xs">
                          Farq:{" "}
                          <span
                            className={
                              difference > 0
                                ? "font-semibold text-red-600"
                                : "font-semibold text-emerald-600"
                            }
                          >
                            {difference > 0 ? "+" : ""}
                            {difference.toLocaleString()} so'm
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => openResolve(d)}
                      className="shrink-0"
                    >
                      Hal qilish
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminSurface>

      {/* Resolution dialog */}
      <Dialog open={resolving !== null} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nizoni hal qilish</DialogTitle>
          </DialogHeader>

          {resolving && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div>Buyurtma: <span className="font-semibold">#{resolving.order_number}</span></div>
                <div>Narxi: {Number(resolving.total_price).toLocaleString()} so'm</div>
                <div>Kuryer: {Number(resolving.paid_amount ?? 0).toLocaleString()} so'm</div>
                <div>Mijoz: {Number(resolving.user_claimed_amount ?? 0).toLocaleString()} so'm</div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Qaror</Label>
                <div className="grid grid-cols-1 gap-2">
                  <ResolutionOption
                    value="USER_WON"
                    active={resolution === "USER_WON"}
                    onClick={() => setResolution("USER_WON")}
                    title="Mijoz haq"
                    sub="Mijoz claim qilgan summa hisobi bo'yicha qaytariladi"
                  />
                  <ResolutionOption
                    value="SELLER_WON"
                    active={resolution === "SELLER_WON"}
                    onClick={() => setResolution("SELLER_WON")}
                    title="Sotuvchi/kuryer haq"
                    sub="Kuryer aytgan summa asosida qaytarish amalga oshadi"
                  />
                  <ResolutionOption
                    value="ADJUSTED"
                    active={resolution === "ADJUSTED"}
                    onClick={() => setResolution("ADJUSTED")}
                    title="Qisman qaror"
                    sub="Admin o'zi belgilagan miqdor user'ga beriladi"
                  />
                </div>
              </div>

              {resolution === "ADJUSTED" && (
                <div className="flex flex-col gap-2">
                  <Label>User'ga beriladigan miqdor (so'm)</Label>
                  <Input
                    type="number"
                    value={adjustedAmount}
                    onChange={(e) => setAdjustedAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label>Admin sharhi (ixtiyoriy)</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Qarorning sababi..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)}>
              Bekor
            </Button>
            <Button
              onClick={submitResolution}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? "Saqlanmoqda..." : "Qarorni saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResolutionOption({
  active, onClick, title, sub,
}: {
  value: string;
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-3 transition-colors ${
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`size-4 rounded-full border-2 ${
            active
              ? "border-primary bg-primary"
              : "border-muted-foreground/40"
          }`}
        />
        <div className="font-semibold text-sm">{title}</div>
      </div>
      <div className="mt-1 pl-6 text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}
