import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, TruckIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RoleApplication } from "@/interfaces/application.interface";
import type { StoreSummary } from "@/interfaces/market.interface";
import { extractErrorMessage } from "@/lib/market";

export default function ApplyCourierPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    requested_store_id: "",
    phone: "",
    transport_type: "",
    vehicle_number: "",
    note: "",
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications", "me"],
    queryFn: async () => (await api.get<RoleApplication[]>("/applications/me")).data,
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["stores", "all-for-applications"],
    queryFn: async () => (await api.get<StoreSummary[]>("/stores")).data,
    staleTime: 60_000,
  });

  const courierApplication = useMemo(
    () => applications.find((item) => item.type === "COURIER") ?? null,
    [applications],
  );

  useEffect(() => {
    if (!courierApplication) return;

    setForm({
      requested_store_id:
        courierApplication.requested_store_id ??
        courierApplication.requestedStore?.id ??
        "",
      phone: courierApplication.phone ?? "",
      transport_type: courierApplication.transport_type ?? "",
      vehicle_number: courierApplication.vehicle_number ?? "",
      note: courierApplication.note ?? "",
    });
  }, [courierApplication]);

  const filteredStores = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stores;

    return stores.filter((store) =>
      [store.name, store.address, store.owner?.first_name, store.owner?.last_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [search, stores]);

  const submitApplication = useMutation({
    mutationFn: async () => (await api.post("/applications/courier", form)).data,
    onSuccess: () => {
      toast.success("Delivery arizasi yuborildi");
      navigate("/mobile/profile", { replace: true });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <section className="rounded-[1.9rem] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.28)]">
        <div className="flex items-center gap-3">
          <Link
            to="/mobile/profile"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <TruckIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                Courier onboarding
              </p>
              <h1 className="text-lg font-semibold text-slate-950">Delivery bo'lish</h1>
            </div>
          </div>
        </div>

        {courierApplication ? (
          <div className="mt-4 rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Holat: <span className="font-semibold text-slate-950">{courierApplication.status}</span>
            {courierApplication.rejection_reason ? (
              <p className="mt-2 text-rose-600">{courierApplication.rejection_reason}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.9rem] border border-white/70 bg-white/92 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.24)]">
        <div className="grid gap-3">
          <Input
            placeholder="Telefon raqamingiz"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
          <Input
            placeholder="Transport turi"
            value={form.transport_type}
            onChange={(event) =>
              setForm((current) => ({ ...current, transport_type: event.target.value }))
            }
          />
          <Input
            placeholder="Transport yoki davlat raqami"
            value={form.vehicle_number}
            onChange={(event) =>
              setForm((current) => ({ ...current, vehicle_number: event.target.value }))
            }
          />
          <textarea
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Qisqa tajriba yoki izoh"
            className="min-h-24 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">Qaysi do'kon uchun delivery?</p>
            <Input
              className="mt-3"
              placeholder="Do'kon qidiring"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            {filteredStores.map((store) => {
              const isSelected = form.requested_store_id === store.id;

              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({ ...current, requested_store_id: store.id }))
                  }
                  className={`w-full rounded-[1.35rem] border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 bg-white hover:border-primary/20"
                  }`}
                >
                  <p className="font-semibold text-slate-950">{store.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{store.address || "Manzil yo'q"}</p>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          className="mt-5 h-12 w-full rounded-[1.2rem]"
          onClick={() => submitApplication.mutate()}
          disabled={submitApplication.isPending || !form.phone.trim() || !form.requested_store_id}
        >
          {submitApplication.isPending ? "Yuborilmoqda..." : "Store tasdig'iga yuborish"}
        </Button>
      </section>
    </div>
  );
}
