import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, LocateFixedIcon, StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import LocationPickerMap from "@/components/maps/location-picker-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RoleApplication } from "@/interfaces/application.interface";
import { extractErrorMessage } from "@/lib/market";

function getCurrentPosition() {
  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolokatsiya ishlamaydi"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => reject(new Error("Joylashuvni olib bo'lmadi")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export default function ApplySellerPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    store_name: "",
    owner_name: "",
    legal_name: "",
    phone: "",
    store_phone: "",
    store_address: "",
    store_lat: "",
    store_lng: "",
    note: "",
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications", "me"],
    queryFn: async () => (await api.get<RoleApplication[]>("/applications/me")).data,
  });

  const sellerApplication = useMemo(
    () => applications.find((item) => item.type === "SELLER") ?? null,
    [applications],
  );

  useEffect(() => {
    if (!sellerApplication) return;

    setForm({
      store_name: sellerApplication.store_name ?? "",
      owner_name: sellerApplication.owner_name ?? "",
      legal_name: sellerApplication.legal_name ?? "",
      phone: sellerApplication.phone ?? "",
      store_phone: sellerApplication.store_phone ?? "",
      store_address: sellerApplication.store_address ?? "",
      store_lat: sellerApplication.store_lat ? String(sellerApplication.store_lat) : "",
      store_lng: sellerApplication.store_lng ? String(sellerApplication.store_lng) : "",
      note: sellerApplication.note ?? "",
    });
  }, [sellerApplication]);

  const submitApplication = useMutation({
    mutationFn: async () =>
      (
        await api.post("/applications/seller", {
          ...form,
          store_lat: form.store_lat ? Number(form.store_lat) : undefined,
          store_lng: form.store_lng ? Number(form.store_lng) : undefined,
        })
      ).data,
    onSuccess: () => {
      toast.success("Seller arizasi yuborildi");
      navigate("/mobile/profile", { replace: true });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const requestGps = async () => {
    try {
      const location = await getCurrentPosition();
      setForm((current) => ({
        ...current,
        store_lat: String(location.lat),
        store_lng: String(location.lng),
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GPS xatoligi");
    }
  };

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
              <StoreIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                Seller onboarding
              </p>
              <h1 className="text-lg font-semibold text-slate-950">Seller bo'lish</h1>
            </div>
          </div>
        </div>

        {sellerApplication ? (
          <div className="mt-4 rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Holat: <span className="font-semibold text-slate-950">{sellerApplication.status}</span>
            {sellerApplication.rejection_reason ? (
              <p className="mt-2 text-rose-600">{sellerApplication.rejection_reason}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.9rem] border border-white/70 bg-white/92 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.24)]">
        <div className="grid gap-3">
          <Input
            placeholder="Do'kon nomi"
            value={form.store_name}
            onChange={(event) => setForm((current) => ({ ...current, store_name: event.target.value }))}
          />
          <Input
            placeholder="Mas'ul shaxs"
            value={form.owner_name}
            onChange={(event) => setForm((current) => ({ ...current, owner_name: event.target.value }))}
          />
          <Input
            placeholder="Yuridik nomi"
            value={form.legal_name}
            onChange={(event) => setForm((current) => ({ ...current, legal_name: event.target.value }))}
          />
          <Input
            placeholder="Sizning telefoningiz"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
          <Input
            placeholder="Do'kon telefoni"
            value={form.store_phone}
            onChange={(event) => setForm((current) => ({ ...current, store_phone: event.target.value }))}
          />
          <Input
            placeholder="Do'kon manzili"
            value={form.store_address}
            onChange={(event) =>
              setForm((current) => ({ ...current, store_address: event.target.value }))
            }
          />
          <textarea
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Qo'shimcha izoh"
            className="min-h-24 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-950">Do'kon joylashuvi</p>
            <Button variant="outline" size="sm" className="rounded-full" onClick={requestGps}>
              <LocateFixedIcon className="h-4 w-4" />
              GPS
            </Button>
          </div>
          <LocationPickerMap
            center={
              form.store_lat && form.store_lng
                ? { lat: Number(form.store_lat), lng: Number(form.store_lng) }
                : null
            }
            markers={
              form.store_lat && form.store_lng
                ? [
                    {
                      id: "seller-store",
                      lat: Number(form.store_lat),
                      lng: Number(form.store_lng),
                      label: form.store_name || "Do'kon joyi",
                      meta: form.store_address || "Nuqta tanlangan",
                      tone: "accent",
                    },
                  ]
                : []
            }
            interactive
            onLocationSelect={(location) =>
              setForm((current) => ({
                ...current,
                store_lat: String(location.lat),
                store_lng: String(location.lng),
              }))
            }
            className="rounded-[1.5rem]"
          />
        </div>

        <Button
          className="mt-5 h-12 w-full rounded-[1.2rem]"
          onClick={() => submitApplication.mutate()}
          disabled={
            submitApplication.isPending ||
            !form.store_name.trim() ||
            !form.phone.trim() ||
            !form.store_phone.trim()
          }
        >
          {submitApplication.isPending ? "Yuborilmoqda..." : "Admin tasdig'iga yuborish"}
        </Button>
      </section>
    </div>
  );
}
