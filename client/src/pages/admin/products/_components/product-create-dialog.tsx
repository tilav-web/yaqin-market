import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheckIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/market";
import { t, type TName } from "@/lib/i18n";
import { useLang } from "@/context/lang.context";

type Category = { id: string; name: TName };
type Unit = { id: number; name: TName; short_name?: TName | null };

const emptyForm = {
  nameUz: "",
  nameRu: "",
  slug: "",
  descriptionUz: "",
  descriptionRu: "",
  category_id: "",
  unit_id: "",
  mxik_code: "",
  barcode: "",
  package_code: "",
  tiftn_code: "",
  vat_percent: "12",
  mark_required: "",
  origin_country: "O'zbekiston",
  maker_name: "",
  cert_no: "",
  made_on: "",
  expires_on: "",
};

export default function ProductCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { lang } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [images, setImages] = useState<File[]>([]);
  const [showTax, setShowTax] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "admin", "all"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units", "admin", "all"],
    queryFn: async () => (await api.get<Unit[]>("/units")).data,
  });

  const previews = useMemo(
    () => images.map((file) => URL.createObjectURL(file)),
    [images],
  );

  const hasTax = [
    form.mxik_code, form.barcode, form.package_code,
    form.tiftn_code, form.vat_percent, form.mark_required,
    form.maker_name, form.cert_no,
  ].some((v) => v.trim() !== "");

  const createMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Create product (JSON)
      const product = (
        await api.post("/products", {
          name: { uz: form.nameUz.trim(), ru: form.nameRu.trim() },
          slug: form.slug.trim() || undefined,
          description:
            form.descriptionUz.trim() || form.descriptionRu.trim()
              ? { uz: form.descriptionUz.trim(), ru: form.descriptionRu.trim() }
              : undefined,
          category_id: form.category_id || undefined,
          unit_id: form.unit_id ? Number(form.unit_id) : undefined,
          tax: hasTax
            ? {
                mxik_code: form.mxik_code.trim() || undefined,
                barcode: form.barcode.trim() || undefined,
                package_code: form.package_code.trim() || undefined,
                tiftn_code: form.tiftn_code.trim() || undefined,
                vat_percent: form.vat_percent ? Number(form.vat_percent) : undefined,
                mark_required: form.mark_required === "" ? undefined : form.mark_required === "true",
                origin_country: form.origin_country.trim() || undefined,
                maker_name: form.maker_name.trim() || undefined,
                cert_no: form.cert_no.trim() || undefined,
                made_on: form.made_on || undefined,
                expires_on: form.expires_on || undefined,
              }
            : undefined,
        })
      ).data;

      // Step 2: Upload images if any
      if (images.length > 0) {
        const formData = new FormData();
        for (const file of images) {
          formData.append("images", file);
        }
        await api.post(`/products/${product.id}/images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      return product;
    },
    onSuccess: () => {
      toast.success("Mahsulot yaratildi");
      resetAndClose();
      queryClient.invalidateQueries({ queryKey: ["admin", "products", "catalog"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const resetAndClose = () => {
    setForm({ ...emptyForm });
    setImages([]);
    setShowTax(false);
    onOpenChange(false);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - images.length);
    setImages((prev) => [...prev, ...newFiles]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(val) => !val && resetAndClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.08),transparent_60%),linear-gradient(180deg,#fff,rgba(255,248,248,0.98))] p-6 shadow-2xl">
        <DialogHeader className="gap-1.5 pb-1">
          <DialogTitle className="text-lg font-semibold text-foreground">
            Yangi mahsulot yaratish
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Mahsulot ma'lumotini to'ldiring va rasmlarni yuklang
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── Images ── */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
              Rasmlar
            </p>
            <div className="flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div
                  key={i}
                  className="group relative size-20 overflow-hidden rounded-xl border-2 border-border"
                >
                  <img src={src} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">
                      Asosiy
                    </span>
                  )}
                </div>
              ))}

              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary transition hover:border-primary hover:bg-primary/10"
                >
                  <Upload className="size-4" />
                  <span className="text-[10px] font-semibold">Yuklash</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Birinchi rasm asosiy rasm sifatida saqlanadi. Maks 5 ta.
            </p>
          </div>

          {/* ── Basic Info ── */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
              Asosiy ma'lumot
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Mahsulot nomi (UZ)"
                value={form.nameUz}
                onChange={(e) => set("nameUz", e.target.value)}
              />
              <Input
                placeholder="Название товара (RU)"
                value={form.nameRu}
                onChange={(e) => set("nameRu", e.target.value)}
              />
              <Input
                placeholder="Slug (avtomatik)"
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
              />
              <select
                value={form.category_id}
                onChange={(e) => set("category_id", e.target.value)}
                className="h-11 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
              >
                <option value="">Kategoriya tanlang</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{t(c.name, lang)}</option>
                ))}
              </select>
              <select
                value={form.unit_id}
                onChange={(e) => set("unit_id", e.target.value)}
                className="h-11 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
              >
                <option value="">Birlik tanlang</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {t(u.name, lang)} {u.short_name ? `(${t(u.short_name, lang)})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={form.descriptionUz}
              onChange={(e) => set("descriptionUz", e.target.value)}
              placeholder="Qisqa tavsif (UZ)"
              className="mt-3 min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
            />
            <textarea
              value={form.descriptionRu}
              onChange={(e) => set("descriptionRu", e.target.value)}
              placeholder="Краткое описание (RU)"
              className="mt-2 min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {/* ── Tax toggle ── */}
          <button
            type="button"
            onClick={() => setShowTax(!showTax)}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ShieldCheckIcon className="size-4" />
            {showTax ? "Soliq ma'lumotini yashirish" : "Soliq va compliance ma'lumoti qo'shish"}
          </button>

          {/* ── Tax fields ── */}
          {showTax && (
            <div className="rounded-xl border border-primary/10 bg-primary/[0.03] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="MXIK kodi" value={form.mxik_code} onChange={(e) => set("mxik_code", e.target.value)} />
                <Input placeholder="Barcode" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
                <Input placeholder="Qadoq kodi" value={form.package_code} onChange={(e) => set("package_code", e.target.value)} />
                <Input placeholder="TIF TN kodi" value={form.tiftn_code} onChange={(e) => set("tiftn_code", e.target.value)} />
                <Input placeholder="QQS foizi" value={form.vat_percent} onChange={(e) => set("vat_percent", e.target.value)} />
                <select
                  value={form.mark_required}
                  onChange={(e) => set("mark_required", e.target.value)}
                  className="h-11 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm outline-none"
                >
                  <option value="">Markirovka holati</option>
                  <option value="true">Majburiy</option>
                  <option value="false">Majburiy emas</option>
                </select>
                <Input placeholder="Davlat" value={form.origin_country} onChange={(e) => set("origin_country", e.target.value)} />
                <Input placeholder="Ishlab chiqaruvchi" value={form.maker_name} onChange={(e) => set("maker_name", e.target.value)} />
                <Input placeholder="Sertifikat raqami" value={form.cert_no} onChange={(e) => set("cert_no", e.target.value)} />
                <Input type="date" value={form.made_on} onChange={(e) => set("made_on", e.target.value)} />
                <Input type="date" value={form.expires_on} onChange={(e) => set("expires_on", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex flex-row items-center justify-between gap-3 bg-transparent border-none p-0 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {images.length > 0 ? `${images.length} ta rasm tanlandi` : "Rasm tanlanmadi"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetAndClose}
              disabled={createMutation.isPending}
              className="h-9 px-4 border-primary/20 text-primary hover:bg-primary/5"
            >
              Bekor qilish
            </Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={!form.nameUz.trim() || createMutation.isPending}
              className="h-9 gap-2 px-5"
            >
              {createMutation.isPending ? "Saqlanmoqda..." : "Mahsulot yaratish"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
