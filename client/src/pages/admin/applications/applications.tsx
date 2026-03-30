import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheckIcon, LandmarkIcon, StoreIcon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import {
  AdminInfoPill,
  AdminPageHeader,
  AdminSurface,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import type { RoleApplication } from "@/interfaces/application.interface";
import { extractErrorMessage, normalizePhone } from "@/lib/market";

function getSellerTypeLabel(type?: string | null) {
  switch (type) {
    case "LEGAL_ENTITY":
      return "Yuridik shaxs";
    case "SOLE_PROPRIETOR":
      return "YTT";
    case "SELF_EMPLOYED":
      return "O'zini o'zi band qilgan";
    default:
      return "-";
  }
}

export default function AdminApplicationsPage() {
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admin", "seller-applications"],
    queryFn: async () => (await api.get<RoleApplication[]>("/applications/seller")).data,
  });

  const reviewApplication = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
      reason?: string;
    }) => (await api.put(`/applications/seller/${id}/review`, { status, reason })).data,
    onSuccess: () => {
      toast.success("Ariza ko'rib chiqildi");
      queryClient.invalidateQueries({ queryKey: ["admin", "seller-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const pendingCount = applications.filter((item) => item.status === "PENDING").length;
  const approvedCount = applications.filter((item) => item.status === "APPROVED").length;
  const rejectedCount = applications.filter((item) => item.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Onboarding flow"
        title="Seller arizalari"
        description="Oddiy user seller bo'lish uchun yuborgan arizalarni ko'rib chiqing va tasdiqlang."
        badge={`${applications.length} ariza`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminInfoPill label="Kutilmoqda" value={pendingCount} />
        <AdminInfoPill label="Tasdiqlangan" value={approvedCount} />
        <AdminInfoPill label="Rad etilgan" value={rejectedCount} />
      </div>

      <AdminSurface className="p-5 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-slate-500">Yuklanmoqda...</p>
        ) : applications.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
            <p className="text-base font-semibold text-slate-900">Hozircha seller arizasi yo'q</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {applications.map((application) => {
              const applicantName = `${application.user?.first_name ?? ""} ${
                application.user?.last_name ?? ""
              }`.trim();

              return (
                <article
                  key={application.id}
                  className="rounded-[1.65rem] border border-slate-200/80 bg-white/88 p-5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {application.store_name || "Do'kon arizasi"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {applicantName || "Foydalanuvchi"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {application.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Applicant</p>
                      <p className="mt-2 flex items-center gap-2 font-medium text-slate-950">
                        <UserRoundIcon className="h-4 w-4 text-primary" />
                        {normalizePhone(application.phone || application.user?.auth?.phone)}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Store phone</p>
                      <p className="mt-2 flex items-center gap-2 font-medium text-slate-950">
                        <StoreIcon className="h-4 w-4 text-primary" />
                        {normalizePhone(application.store_phone)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-950">
                      {application.owner_name || "Mas'ul shaxs"}
                    </p>
                    <p className="mt-1">
                      {application.sellerLegal?.official_name ||
                        application.legal_name ||
                        "Yuridik nom kiritilmagan"}
                    </p>
                    <p className="mt-2">{application.store_address || "Manzil kiritilmagan"}</p>
                    {application.note ? <p className="mt-2 text-slate-500">{application.note}</p> : null}
                    {application.rejection_reason ? (
                      <p className="mt-2 text-rose-600">{application.rejection_reason}</p>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-[1.2rem] border border-primary/10 bg-primary/[0.04] px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2 text-slate-950">
                      <LandmarkIcon className="h-4 w-4 text-primary" />
                      <p className="font-semibold">Yuridik profil</p>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <p>
                        <span className="text-slate-400">Turi:</span>{" "}
                        {getSellerTypeLabel(application.sellerLegal?.type)}
                      </p>
                      <p>
                        <span className="text-slate-400">STIR:</span>{" "}
                        {application.sellerLegal?.tin ?? "-"}
                      </p>
                      <p>
                        <span className="text-slate-400">Guvohnoma:</span>{" "}
                        {application.sellerLegal?.reg_no ?? "-"}
                      </p>
                      <p>
                        <span className="text-slate-400">Bank:</span>{" "}
                        {application.sellerLegal?.bank_name ?? "-"}
                      </p>
                      <p className="sm:col-span-2">
                        <span className="text-slate-400">Hisob:</span>{" "}
                        {application.sellerLegal?.bank_account ?? "-"}
                      </p>
                      <p className="sm:col-span-2">
                        <span className="text-slate-400">Ro'yxat manzili:</span>{" "}
                        {application.sellerLegal?.reg_address ?? "-"}
                      </p>
                    </div>
                  </div>

                  {application.status === "PENDING" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        className="rounded-full"
                        disabled={reviewApplication.isPending}
                        onClick={() =>
                          reviewApplication.mutate({
                            id: application.id,
                            status: "APPROVED",
                          })
                        }
                      >
                        <FileCheckIcon className="h-4 w-4" />
                        Tasdiqlash
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full"
                        disabled={reviewApplication.isPending}
                        onClick={() => {
                          const reason = window.prompt("Rad etish sababi", "");
                          reviewApplication.mutate({
                            id: application.id,
                            status: "REJECTED",
                            reason: reason || undefined,
                          });
                        }}
                      >
                        Rad etish
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </AdminSurface>
    </div>
  );
}
