import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  SendIcon,
  UsersIcon,
  ShoppingBagIcon,
  StoreIcon,
  TruckIcon,
  EyeIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import {
  AdminPageHeader,
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

type BroadcastTarget = "ALL" | "CUSTOMERS" | "SELLERS" | "COURIERS" | "SPECIFIC";

const TARGETS: Array<{
  value: BroadcastTarget;
  label: string;
  sub: string;
  Icon: typeof UsersIcon;
}> = [
  {
    value: "ALL",
    label: "Hamma",
    sub: "Customer + Seller + Courier",
    Icon: UsersIcon,
  },
  {
    value: "CUSTOMERS",
    label: "Xaridorlar",
    sub: "Faqat customer'lar",
    Icon: ShoppingBagIcon,
  },
  {
    value: "SELLERS",
    label: "Sotuvchilar",
    sub: "Faqat seller'lar",
    Icon: StoreIcon,
  },
  {
    value: "COURIERS",
    label: "Kuryerlar",
    sub: "Faqat courier'lar",
    Icon: TruckIcon,
  },
  {
    value: "SPECIFIC",
    label: "Aniq user'lar",
    sub: "ID ro'yxati bo'yicha",
    Icon: UsersIcon,
  },
];

export default function AdminBroadcastPage() {
  const [target, setTarget] = useState<BroadcastTarget>("CUSTOMERS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [onlyWithToken, setOnlyWithToken] = useState(true);
  const [minDeliveredOrders, setMinDeliveredOrders] = useState("");
  const [activeLastDays, setActiveLastDays] = useState("");
  const [userIds, setUserIds] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const buildDto = (dry_run = false) => ({
    target,
    title: title.trim(),
    body: body.trim(),
    only_with_token: onlyWithToken,
    min_delivered_orders:
      target === "CUSTOMERS" && minDeliveredOrders
        ? Number(minDeliveredOrders)
        : undefined,
    active_last_days: activeLastDays ? Number(activeLastDays) : undefined,
    user_ids:
      target === "SPECIFIC"
        ? userIds
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    dry_run,
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const r = await api.post("/notifications/admin/broadcast/preview", buildDto(true));
      return r.data as { count: number };
    },
    onSuccess: (data) => {
      setPreviewCount(data.count);
      toast.success(`${data.count} ta foydalanuvchi topildi`);
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const r = await api.post("/notifications/admin/broadcast", buildDto(false));
      return r.data as { matched: number; sent: number };
    },
    onSuccess: (data) => {
      toast.success(`${data.sent} ta user'ga yuborildi (${data.matched} ta topilgan)`);
      setConfirmOpen(false);
      setTitle("");
      setBody("");
      setPreviewCount(null);
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const canSubmit =
    title.trim().length > 2 &&
    body.trim().length > 2 &&
    (target !== "SPECIFIC" || userIds.trim().length > 0);

  return (
    <>
      <AdminPageHeader
        title="Bildirishnoma yuborish"
        description="Tanlangan guruh yoki ma'lum userlarga mobil push notification yuboring. Yuborilgan barcha xabarlar tarixini foydalanuvchi ilovasida ko'ra oladi."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Form */}
        <AdminSurface className="p-6">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Kimga yuboriladi?
              </label>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TARGETS.map((t) => {
                  const active = target === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTarget(t.value)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 hover:border-primary/40"
                      }`}
                    >
                      <div
                        className={`flex size-10 items-center justify-center rounded-lg ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <t.Icon className="size-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {t.label}
                        </div>
                        <div className="text-xs text-slate-500">{t.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {target === "SPECIFIC" && (
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  User ID lar (bo'sh joy / vergul bilan ajrating)
                </label>
                <textarea
                  value={userIds}
                  onChange={(e) => setUserIds(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="uuid1, uuid2, uuid3..."
                />
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Sarlavha
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Yangi aksiya!"
                maxLength={150}
                className="mt-2"
              />
              <div className="mt-1 text-xs text-slate-400">
                {title.length}/150
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Xabar matni
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={500}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Bugun barcha elektron tovarlarga 15% chegirma!"
              />
              <div className="mt-1 text-xs text-slate-400">
                {body.length}/500
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-slate-200 bg-white/60 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Qo'shimcha filtrlar
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={onlyWithToken}
                    onChange={(e) => setOnlyWithToken(e.target.checked)}
                    className="size-4 rounded"
                  />
                  Faqat push tokeni bor user'larga
                </label>

                {target === "CUSTOMERS" && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-600">
                      Min. yetkazilgan buyurtma:
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={minDeliveredOrders}
                      onChange={(e) => setMinDeliveredOrders(e.target.value)}
                      placeholder="0"
                      className="h-9 w-24"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-600">
                    Oxirgi faollik (kun):
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={activeLastDays}
                    onChange={(e) => setActiveLastDays(e.target.value)}
                    placeholder="—"
                    className="h-9 w-24"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending || !canSubmit}
              >
                <EyeIcon className="size-4" />
                {previewMutation.isPending ? "Hisoblanmoqda..." : "Sinov (count)"}
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSubmit}
                className="ml-auto"
              >
                <SendIcon className="size-4" />
                Yuborish
              </Button>
            </div>
          </div>
        </AdminSurface>

        {/* Preview */}
        <AdminSurface className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <EyeIcon className="size-4" />
            Push ko'rinishi
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(145deg,#f8fafc,#ffffff)] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                Y
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400">Yaqin Market</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  {title || "Sarlavha..."}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                  {body || "Xabar matni..."}
                </div>
              </div>
            </div>
          </div>

          {previewCount !== null && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
              <div className="font-semibold text-emerald-900">
                {previewCount.toLocaleString()} ta foydalanuvchi
              </div>
              <div className="mt-1 text-xs text-emerald-700">
                Filterlarga mos kelgan va topilgan userlar soni
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <div>
                Broadcast minglab user'larga yuboriladi. Yuborilgan xabarni
                qaytarib bo'lmaydi. Matnni diqqat bilan tekshiring.
              </div>
            </div>
          </div>
        </AdminSurface>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Yuborishni tasdiqlang</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500">
                Target
              </div>
              <div className="font-semibold">
                {TARGETS.find((t) => t.value === target)?.label}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500">
                Sarlavha
              </div>
              <div>{title}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500">
                Matn
              </div>
              <div className="whitespace-pre-wrap">{body}</div>
            </div>
            {previewCount !== null && (
              <div className="rounded-lg bg-slate-100 p-3">
                <div className="text-xs text-slate-500">Taxminiy qamrov</div>
                <div className="text-lg font-semibold">
                  {previewCount.toLocaleString()} user
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Bekor
            </Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
            >
              <SendIcon className="size-4" />
              {sendMutation.isPending ? "Yuborilmoqda..." : "Yuborish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
