import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, LandmarkIcon, LocateFixedIcon, StoreIcon } from "lucide-react";
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
    phone: "",
    store_phone: "",
    store_address: "",
    store_lat: "",
    store_lng: "",
    note: "",
    legal: {
      type: "SOLE_PROPRIETOR",
      official_name: "",
      tin: "",
      reg_no: "",
      reg_address: "",
      bank_name: "",
      bank_account: "",
      license_no: "",
      license_until: "",
    },
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
      phone: sellerApplication.phone ?? "",
      store_phone: sellerApplication.store_phone ?? "",
      store_address: sellerApplication.store_address ?? "",
      store_lat: sellerApplication.store_lat ? String(sellerApplication.store_lat) : "",
      store_lng: sellerApplication.store_lng ? String(sellerApplication.store_lng) : "",
      note: sellerApplication.note ?? "",
      legal: {
        type: sellerApplication.sellerLegal?.type ?? "SOLE_PROPRIETOR",
        official_name:
          sellerApplication.sellerLegal?.official_name ?? sellerApplication.legal_name ?? "",
        tin: sellerApplication.sellerLegal?.tin ?? "",
        reg_no: sellerApplication.sellerLegal?.reg_no ?? "",
        reg_address:
          sellerApplication.sellerLegal?.reg_address ?? sellerApplication.store_address ?? "",
        bank_name: sellerApplication.sellerLegal?.bank_name ?? "",
        bank_account: sellerApplication.sellerLegal?.bank_account ?? "",
        license_no: sellerApplication.sellerLegal?.license_no ?? "",
        license_until: sellerApplication.sellerLegal?.license_until ?? "",
      },
    });
  }, [sellerApplication]);

  const submitApplication = useMutation({
    mutationFn: async () =>
      (
        await api.post("/applications/seller", {
          store_name: form.store_name,
          owner_name: form.owner_name,
          phone: form.phone,
          store_phone: form.store_phone,
          store_address: form.store_address,
          note: form.note,
          store_lat: form.store_lat ? Number(form.store_lat) : undefined,
          store_lng: form.store_lng ? Number(form.store_lng) : undefined,
          legal_name: form.legal.official_name || undefined,
          legal: {
            type: form.legal.type,
            official_name: form.legal.official_name,
            tin: form.legal.tin || undefined,
            reg_no: form.legal.reg_no || undefined,
            reg_address: form.legal.reg_address || undefined,
            bank_name: form.legal.bank_name || undefined,
            bank_account: form.legal.bank_account || undefined,
            license_no: form.legal.license_no || undefined,
            license_until: form.legal.license_until || undefined,
          },
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
        <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/88 p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <StoreIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Do'kon ma'lumoti</p>
              <p className="text-sm text-slate-500">
                Buyer ko'radigan storefront ma'lumotlari.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <Input
              placeholder="Do'kon nomi"
              value={form.store_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, store_name: event.target.value }))
              }
            />
            <Input
              placeholder="Mas'ul shaxs"
              value={form.owner_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, owner_name: event.target.value }))
              }
            />
            <Input
              placeholder="Sizning telefoningiz"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <Input
              placeholder="Do'kon telefoni"
              value={form.store_phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, store_phone: event.target.value }))
              }
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
              onChange={(event) =>
                setForm((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="Qo'shimcha izoh"
              className="min-h-24 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="mt-4 rounded-[1.6rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(254,242,242,0.85),rgba(255,255,255,0.96))] p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <LandmarkIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Yuridik ma'lumot</p>
              <p className="text-sm text-slate-500">
                Super admin tasdiqlashi uchun zarur compliance ma'lumotlari.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <select
              value={form.legal.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  legal: { ...current.legal, type: event.target.value },
                }))
              }
              className="h-11 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
            >
              <option value="LEGAL_ENTITY">Yuridik shaxs</option>
              <option value="SOLE_PROPRIETOR">YTT</option>
              <option value="SELF_EMPLOYED">O'zini o'zi band qilgan</option>
            </select>
            <Input
              placeholder="Rasmiy nomi"
              value={form.legal.official_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  legal: { ...current.legal, official_name: event.target.value },
                }))
              }
            />
            <Input
              placeholder="STIR"
              value={form.legal.tin}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  legal: { ...current.legal, tin: event.target.value },
                }))
              }
            />
            <Input
              placeholder="Ro'yxatdan o'tganlik raqami"
              value={form.legal.reg_no}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  legal: { ...current.legal, reg_no: event.target.value },
                }))
              }
            />
            <Input
              placeholder="Ro'yxatdan o'tgan manzil"
              value={form.legal.reg_address}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  legal: { ...current.legal, reg_address: event.target.value },
                }))
              }
            />
            <Input
              placeholder="Bank nomi"
              value={form.legal.bank_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  legal: { ...current.legal, bank_name: event.target.value },
                }))
              }
            />
            <Input
              placeholder="Hisob raqami"
              value={form.legal.bank_account}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  legal: { ...current.legal, bank_account: event.target.value },
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Litsenziya raqami"
                value={form.legal.license_no}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    legal: { ...current.legal, license_no: event.target.value },
                  }))
                }
              />
              <Input
                type="date"
                value={form.legal.license_until}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    legal: { ...current.legal, license_until: event.target.value },
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[1.6rem] border border-slate-200/80 bg-white/88 p-4">
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
            !form.store_phone.trim() ||
            !form.legal.official_name.trim() ||
            !form.legal.tin.trim() ||
            !form.legal.reg_no.trim() ||
            !form.legal.bank_account.trim()
          }
        >
          {submitApplication.isPending ? "Yuborilmoqda..." : "Seller arizasini yuborish"}
        </Button>
      </section>
    </div>
  );
}
