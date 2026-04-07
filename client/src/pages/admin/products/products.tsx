import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { BoxesIcon, PackageCheckIcon, SearchIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
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
import type { PaginatedResponse, ProductTaxInfo } from "@/interfaces/market.interface";
import { extractErrorMessage } from "@/lib/market";
import { t, type TName } from "@/lib/i18n";
import { useLang } from "@/context/lang.context";
import CategoryList from "./_components/category-list";

type Product = {
  id: number;
  name: TName;
  slug: string;
  description?: TName | null;
  category?: { id: string; name: TName } | null;
  unit?: { id: number; name: TName; short_name?: TName | null } | null;
  parent?: { id: number; name: TName } | null;
  children?: { id: number }[];
  tax?: ProductTaxInfo | null;
  is_active: boolean;
  createdAt: string;
};

type Category = {
  id: string;
  name: TName;
};

type Unit = {
  id: number;
  name: TName;
  short_name?: TName | null;
};

type ProductCatalogSummary = {
  total: number;
  active: number;
  inactive: number;
  categorized: number;
  withUnit: number;
  withTax: number;
};

type ProductCatalogResponse = PaginatedResponse<Product> & {
  summary: ProductCatalogSummary;
};

const PAGE_SIZE = 12;

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function ProductCardSkeleton() {
  return (
    <div className="rounded-[1.7rem] border border-slate-200/80 bg-white/92 p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)]">
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
        <Skeleton className="h-4 w-4/5 rounded-full" />
      </div>
    </div>
  );
}

export default function Products() {
  const queryClient = useQueryClient();
  const { lang } = useLang();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [form, setForm] = useState({
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
  });
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "admin", "all"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units", "admin", "all"],
    queryFn: async () => (await api.get<Unit[]>("/units")).data,
  });

  const {
    data: productPages,
    isLoading: productsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["admin", "products", "catalog", normalizedQuery, selectedCategoryId],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<ProductCatalogResponse>("/products", {
          params: {
            q: normalizedQuery || undefined,
            category_id: selectedCategoryId || undefined,
            page: typeof pageParam === "number" ? pageParam : Number(pageParam ?? 1),
            limit: PAGE_SIZE,
          },
        })
      ).data,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
    staleTime: 60_000,
  });

  const visibleProducts = useMemo(
    () => productPages?.pages.flatMap((page) => page.items) ?? [],
    [productPages],
  );

  const summary = productPages?.pages[0]?.summary ?? {
    total: 0,
    active: 0,
    inactive: 0,
    categorized: 0,
    withUnit: 0,
    withTax: 0,
  };

  const hasTaxFormValues = useMemo(
    () =>
      [
        form.mxik_code,
        form.barcode,
        form.package_code,
        form.tiftn_code,
        form.vat_percent,
        form.mark_required,
        form.origin_country,
        form.maker_name,
        form.cert_no,
        form.made_on,
        form.expires_on,
      ].some((value) => value.trim() !== ""),
    [form],
  );

  const topCategories = useMemo(() => {
    const counts = new Map<string, { name: TName; total: number }>();

    for (const product of visibleProducts) {
      if (!product.category?.id || !product.category?.name) continue;
      const current = counts.get(product.category.id);
      counts.set(product.category.id, {
        name: product.category.name,
        total: (current?.total ?? 0) + 1,
      });
    }

    return [...counts.values()].sort((left, right) => right.total - left.total).slice(0, 4);
  }, [visibleProducts]);

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || !hasNextPage || isFetchingNextPage || productsLoading) {
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, productsLoading, visibleProducts.length]);

  const createProduct = useMutation({
    mutationFn: async () =>
      (
        await api.post("/products", {
          name: { uz: form.nameUz.trim(), ru: form.nameRu.trim() },
          slug: form.slug.trim() || undefined,
          description: (form.descriptionUz.trim() || form.descriptionRu.trim())
            ? { uz: form.descriptionUz.trim(), ru: form.descriptionRu.trim() }
            : undefined,
          category_id: form.category_id || undefined,
          unit_id: form.unit_id ? Number(form.unit_id) : undefined,
          tax: hasTaxFormValues
            ? {
                mxik_code: form.mxik_code.trim() || undefined,
                barcode: form.barcode.trim() || undefined,
                package_code: form.package_code.trim() || undefined,
                tiftn_code: form.tiftn_code.trim() || undefined,
                vat_percent: form.vat_percent ? Number(form.vat_percent) : undefined,
                mark_required:
                  form.mark_required === ""
                    ? undefined
                    : form.mark_required === "true",
                origin_country: form.origin_country.trim() || undefined,
                maker_name: form.maker_name.trim() || undefined,
                cert_no: form.cert_no.trim() || undefined,
                made_on: form.made_on || undefined,
                expires_on: form.expires_on || undefined,
              }
            : undefined,
        })
      ).data,
    onSuccess: () => {
      toast.success("Mahsulot yaratildi");
      setForm({
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
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "products", "catalog"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const selectedCategoryRaw =
    categories.find((category) => category.id === selectedCategoryId)?.name ?? null;
  const selectedCategoryName = selectedCategoryRaw ? t(selectedCategoryRaw, lang) : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Catalog workspace"
        title="Mahsulotlar"
        description="Search, kategoriya filteri va infinite scroll bilan ishlaydigan yagona admin katalog workspace."
        badge={`${summary.total} mahsulot`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminInfoPill label="Jami mahsulot" value={summary.total} />
        <AdminInfoPill label="Faol" value={summary.active} />
        <AdminInfoPill label="Kategoriyali" value={summary.categorized} />
        <AdminInfoPill label="Birlik biriktirilgan" value={summary.withUnit} />
        <AdminInfoPill label="Soliq profili bor" value={summary.withTax} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <AdminSurface className="p-5 sm:p-6" id="create-product">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-primary text-primary-foreground">
              <BoxesIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Yangi mahsulot yaratish</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Katalog ma'lumoti va soliq/compliance ma'lumotini bitta oqimda saqlang.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/88 p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-950">Katalog ma'lumoti</p>
                <p className="text-sm text-slate-500">
                  Foydalanuvchiga ko'rinadigan asosiy mahsulot ma'lumoti.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Mahsulot nomi (UZ)"
                  value={form.nameUz}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nameUz: event.target.value }))
                  }
                />
                <Input
                  placeholder="Название товара (RU)"
                  value={form.nameRu}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nameRu: event.target.value }))
                  }
                />
                <Input
                  placeholder="Slug"
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, slug: event.target.value }))
                  }
                />
                <select
                  value={form.category_id}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category_id: event.target.value }))
                  }
                  className="h-11 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
                >
                  <option value="">Kategoriya tanlang</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {t(category.name, lang)}
                    </option>
                  ))}
                </select>
                <select
                  value={form.unit_id}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, unit_id: event.target.value }))
                  }
                  className="h-11 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
                >
                  <option value="">Birlik tanlang</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {t(unit.name, lang)}
                      {unit.short_name ? ` (${t(unit.short_name, lang)})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={form.descriptionUz}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descriptionUz: event.target.value }))
                }
                placeholder="Qisqa tavsif (UZ)"
                className="mt-3 min-h-[80px] w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
              />
              <textarea
                value={form.descriptionRu}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descriptionRu: event.target.value }))
                }
                placeholder="Краткое описание (RU)"
                className="mt-2 min-h-[80px] w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="rounded-[1.6rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(254,242,242,0.8),rgba(255,255,255,0.94))] p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <ShieldCheckIcon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Soliq va compliance</p>
                  <p className="text-sm text-slate-500">
                    MXIK, barcode, QQS va markirovka kabi maydonlar.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="MXIK kodi"
                  value={form.mxik_code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, mxik_code: event.target.value }))
                  }
                />
                <Input
                  placeholder="Barcode"
                  value={form.barcode}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, barcode: event.target.value }))
                  }
                />
                <Input
                  placeholder="Qadoq kodi"
                  value={form.package_code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, package_code: event.target.value }))
                  }
                />
                <Input
                  placeholder="TIF TN kodi"
                  value={form.tiftn_code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tiftn_code: event.target.value }))
                  }
                />
                <Input
                  placeholder="QQS foizi"
                  value={form.vat_percent}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, vat_percent: event.target.value }))
                  }
                />
                <select
                  value={form.mark_required}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, mark_required: event.target.value }))
                  }
                  className="h-11 rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
                >
                  <option value="">Markirovka holati</option>
                  <option value="true">Majburiy</option>
                  <option value="false">Majburiy emas</option>
                </select>
                <Input
                  placeholder="Ishlab chiqarilgan davlat"
                  value={form.origin_country}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, origin_country: event.target.value }))
                  }
                />
                <Input
                  placeholder="Ishlab chiqaruvchi"
                  value={form.maker_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, maker_name: event.target.value }))
                  }
                />
                <Input
                  placeholder="Sertifikat raqami"
                  value={form.cert_no}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cert_no: event.target.value }))
                  }
                />
                <div className="grid gap-3 md:grid-cols-2 md:col-span-2">
                  <Input
                    type="date"
                    value={form.made_on}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, made_on: event.target.value }))
                    }
                  />
                  <Input
                    type="date"
                    value={form.expires_on}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, expires_on: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              className="rounded-full px-5"
              onClick={() => createProduct.mutate()}
              disabled={!form.nameUz.trim() || createProduct.isPending}
            >
              {createProduct.isPending ? "Saqlanmoqda..." : "Mahsulot yaratish"}
            </Button>
            <p className="text-sm text-slate-500">
              Mahsulot va unga tegishli soliq profili bitta request bilan saqlanadi.
            </p>
          </div>
        </AdminSurface>

        <AdminSurface className="p-5 sm:p-6">
          <div className="rounded-[1.8rem] border border-primary/10 bg-[linear-gradient(145deg,rgba(220,38,38,0.95),rgba(244,63,94,0.88))] p-5 text-white shadow-[0_26px_55px_-38px_rgba(220,38,38,0.65)]">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white/14">
                <SparklesIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                  Catalog pulse
                </p>
                <p className="mt-1 text-2xl font-semibold">{summary.total}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/84">
              Bu ro'yxat endi pagination bilan ishlaydi. Search yoki kategoriya o'zgarsa,
              admin faqat kerakli bo'lakni yuklaydi.
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[1.2rem] border border-white/14 bg-white/8 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Faol emas
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{summary.inactive}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/14 bg-white/8 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Soliq profili bor
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{summary.withTax}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-primary/8 text-primary">
                <PackageCheckIcon className="h-4.5 w-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Yuklangan oqimdagi top kategoriyalar
                </h3>
                <p className="text-xs text-slate-500">Hozir ko'rinayotgan kartalardan tuzilgan.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {topCategories.length ? (
                topCategories.map((category, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-700">{t(category.name, lang)}</span>
                    <span className="text-sm font-semibold text-slate-950">
                      {category.total} ta
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Hali yuklangan oqimda kategoriya taqsimoti ko'rinmadi.
                </p>
              )}
            </div>
          </div>
        </AdminSurface>
      </div>

      <CategoryList
        selectedId={selectedCategoryId || null}
        onSelect={(category) => setSelectedCategoryId(category?.id ?? "")}
        title="Kategoriya boshqaruvi"
        description="Kategoriya qo'shing, tahrirlang va pastdagi mahsulot oqimini shu bo'limdan filter qiling."
      />

      <AdminSurface className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Mahsulotlar ro'yxati</h2>
            <p className="text-sm text-slate-500">
              Backend pagination va infinite scroll bilan ishlaydigan admin katalog.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-2.5 sm:w-[320px]">
              <SearchIcon className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nomi, slug, kategoriya yoki birlik"
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            {selectedCategoryName ? (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setSelectedCategoryId("")}
              >
                {selectedCategoryName}
              </Button>
            ) : null}
          </div>
        </div>

        {productsLoading ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="mt-5 rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
            <p className="text-base font-semibold text-slate-900">Mos mahsulot topilmadi</p>
            <p className="mt-2 text-sm text-slate-500">
              Search yoki kategoriya filterini tozalab, katalogni qayta ko'ring.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Button variant="outline" className="rounded-full" onClick={() => setQuery("")}>
                Searchni tozalash
              </Button>
              <Button
                className="rounded-full"
                onClick={() => {
                  setQuery("");
                  setSelectedCategoryId("");
                }}
              >
                Barchasini ko'rsatish
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visibleProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-[1.7rem] border border-slate-200/80 bg-white/92 p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-primary/8 text-sm font-semibold text-primary">
                        {(t(product.name, lang)?.[0] ?? "P").toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-950">
                          {t(product.name, lang)}
                        </p>
                        <p className="truncate text-sm text-slate-500">{product.slug}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        product.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {product.is_active ? "Faol" : "Faol emas"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {product.category ? t(product.category.name, lang) : "Kategoriya yo'q"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {product.unit
                        ? (t(product.unit.short_name, lang) || t(product.unit.name, lang))
                        : "Birlik yo'q"}
                    </span>
                    {product.parent ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        Variant
                      </span>
                    ) : null}
                    {product.children?.length ? (
                      <span className="rounded-full border border-primary/10 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                        {product.children.length} child
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Tavsif
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {t(product.description, lang)?.trim() || "Qisqa tavsif hali kiritilmagan."}
                    </p>
                  </div>

                  <div className="mt-4 rounded-[1.2rem] border border-primary/10 bg-primary/[0.04] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                      Soliq profili
                    </p>
                    {product.tax ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full border border-primary/10 bg-white px-3 py-1 text-slate-700">
                          MXIK: {product.tax.mxik_code || "-"}
                        </span>
                        <span className="rounded-full border border-primary/10 bg-white px-3 py-1 text-slate-700">
                          QQS: {product.tax.vat_percent ?? "-"}%
                        </span>
                        <span className="rounded-full border border-primary/10 bg-white px-3 py-1 text-slate-700">
                          {product.tax.mark_required ? "Markirovka kerak" : "Markirovka shart emas"}
                        </span>
                        {product.tax.barcode ? (
                          <span className="rounded-full border border-primary/10 bg-white px-3 py-1 text-slate-700">
                            Barcode: {product.tax.barcode}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Hali soliq profili biriktirilmagan.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <span>ID: {product.id}</span>
                    <span>{dateFormatter.format(new Date(product.createdAt))}</span>
                  </div>
                </div>
              ))}
            </div>

            {hasNextPage ? <div ref={loadMoreRef} className="h-10 w-full" /> : null}

            {isFetchingNextPage ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </AdminSurface>
    </div>
  );
}
