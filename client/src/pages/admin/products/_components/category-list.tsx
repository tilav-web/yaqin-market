import { useEffect, useMemo, useReducer } from "react";
import { useLang } from "@/context/lang.context";
import { t } from "@/lib/i18n";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Upload, X } from "lucide-react";
import { categoryService } from "@/services/category.service";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  categoryListActions,
  categoryListReducer,
  initialCategoryListState,
  type CategoryFormState,
} from "@/reducers/category-list-reducer";
import type { ICategory } from "@/interfaces/category.interface";

export type CategoryListProps = {
  selectedId?: string | null;
  onSelect?: (category: ICategory | null) => void;
  title?: string;
  description?: string;
};

function parseOrderNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function categoryInitialState(selectedId?: string | null) {
  return {
    ...initialCategoryListState,
    selectedId: selectedId ?? null,
  };
}

export default function CategoryList({
  selectedId,
  onSelect,
  title = "Kategoriyalar",
  description = "Mahsulotlarni filter qilish uchun kategoriya tanlang.",
}: CategoryListProps) {
  const queryClient = useQueryClient();
  const { lang } = useLang();
  const [state, dispatch] = useReducer(
    categoryListReducer,
    selectedId,
    categoryInitialState,
  );

  useEffect(() => {
    if (selectedId !== undefined) {
      dispatch(categoryListActions.select(selectedId ?? null));
    }
  }, [selectedId]);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: categoryService.findAll,
  });

  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: categoryService.create,
    onSuccess: (data) => {
      toast.success(`Kategoriya yaratildi: ${data.name}`);
      dispatch(categoryListActions.closeDialog());
      dispatch(categoryListActions.resetForm());
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kategoriya yaratishda xatolik",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryFormState }) =>
      categoryService.update(id, {
        name: payload.name,
        slug: payload.slug || undefined,
        image: payload.image || undefined,
        order_number: parseOrderNumber(payload.order_number),
        is_active: payload.is_active,
      }),
    onSuccess: (data) => {
      toast.success(`Kategoriya yangilandi: ${data.name}`);
      dispatch(categoryListActions.closeDialog());
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kategoriya yangilashda xatolik",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoryService.remove,
    onSuccess: () => {
      toast.success("Kategoriya o'chirildi");
      dispatch(categoryListActions.closeDialog());
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kategoriya o'chirishda xatolik",
      );
    },
  });

  const handleSelect = (category: ICategory | null) => {
    if (selectedId === undefined) {
      dispatch(categoryListActions.select(category?.id ?? null));
    }
    onSelect?.(category);
  };

  const handleCreate = () => {
    if (!state.form.name.trim()) {
      toast.error("Kategoriya nomini kiriting");
      return;
    }
    createMutation.mutate({
      name: state.form.name.trim(),
      slug: state.form.slug.trim() || undefined,
      image: state.form.image,
      order_number: parseOrderNumber(state.form.order_number),
      is_active: state.form.is_active,
    });
  };

  const handleUpdate = () => {
    if (!state.editingId) return;
    if (!state.form.name.trim()) {
      toast.error("Kategoriya nomini kiriting");
      return;
    }
    updateMutation.mutate({ id: state.editingId, payload: state.form });
  };

  const handleDelete = () => {
    if (!state.editingId) return;
    const current = categories.find((item) => item.id === state.editingId);
    if (!current) return;

    const categoryId = state.editingId;
    const categoryName = current.name;

    // Close the dialog immediately
    dispatch(categoryListActions.closeDialog());

    let secondsLeft = 5;
    
    const toastId = toast.warning(`"${categoryName}" o'chirilmoqda`, {
      description: `${secondsLeft} soniyadan so'ng o'chiriladi`,
      duration: Infinity, // We'll manage it manually
      action: {
        label: "Bekor qilish",
        onClick: () => {
          clearInterval(interval);
          toast.dismiss(toastId);
          toast.info(`"${categoryName}" o'chirilishi bekor qilindi`);
        },
      },
    });

    const interval = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(interval);
        toast.dismiss(toastId);
        deleteMutation.mutate(categoryId);
      } else {
        toast.warning(`"${categoryName}" o'chirilmoqda`, {
          id: toastId,
          description: `${secondsLeft} soniyadan so'ng o'chiriladi`,
        });
      }
    }, 1000);
  };

  const isDialogLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const imagePreview = useMemo(() => {
    if (state.form.image instanceof File) {
      return URL.createObjectURL(state.form.image);
    }
    return state.form.image as string;
  }, [state.form.image]);

  return (
    <section className="rounded-3xl border border-border bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.12),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,248,248,0.9))] p-5 shadow-[0_20px_60px_-45px_rgba(239,68,68,0.65)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => handleSelect(null)}
          className={cn(
            "min-w-[110px] rounded-2xl border border-border bg-background p-3 text-center shadow-sm transition",
            state.selectedId === null
              ? "border-primary/70 bg-primary/5 shadow-[0_12px_30px_-24px_rgba(239,68,68,0.8)]"
              : "hover:border-primary/40",
          )}
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-muted-foreground">
            H
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">Hammasi</p>
        </button>

        {categories.map((category) => {
          const selected = state.selectedId === category.id;
          return (
            <div
              key={category.id}
              className={cn(
                "relative min-w-[120px] rounded-2xl border border-border bg-background p-3 text-center shadow-sm transition",
                selected
                  ? "border-primary/70 bg-primary/5 shadow-[0_12px_30px_-24px_rgba(239,68,68,0.8)]"
                  : "hover:border-primary/40",
              )}
            >
              <button
                type="button"
                onClick={() => handleSelect(category)}
                className="flex w-full flex-col items-center"
              >
                <div className="relative">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={t(category.name, lang)}
                      className="h-10 w-10 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-muted-foreground">
                      {t(category.name, lang)?.charAt(0)?.toUpperCase() ?? "C"}
                    </div>
                  )}
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-semibold text-foreground">
                  {t(category.name, lang)}
                </p>
              </button>

              <button
                type="button"
                onClick={() => dispatch(categoryListActions.openEdit(category))}
                className="absolute right-2 top-2 rounded-full border border-border bg-background/80 p-1.5 text-muted-foreground transition hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => dispatch(categoryListActions.openCreate())}
          className="min-w-[120px] rounded-2xl border border-dashed border-primary/40 bg-background/60 p-3 text-center text-sm font-semibold text-primary transition hover:border-primary"
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
            <Plus className="size-4" />
          </div>
          <p className="mt-2">Qo'shish</p>
        </button>
      </div>

      <Dialog
        open={state.dialogOpen}
        onOpenChange={(val) => !val && dispatch(categoryListActions.closeDialog())}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.1),transparent_60%),linear-gradient(180deg,#fff,rgba(255,245,245,0.98))] p-5 shadow-2xl">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-base font-semibold text-foreground">
              {state.dialogMode === "edit" ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {state.dialogMode === "edit"
                ? "Ma'lumotlarni yangilang yoki o'chiring."
                : "Yangi kategoriya yaratish uchun maydonlarni to'ldiring."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="flex gap-4 items-start">
              <div className="space-y-1.5 flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Nomi (UZ)
                </label>
                <input
                  value={state.form.name.uz}
                  onChange={(e) => dispatch(categoryListActions.setNameField("uz", e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
                  placeholder="Ichimliklar"
                />
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mt-1 block">
                  Nomi (RU)
                </label>
                <input
                  value={state.form.name.ru}
                  onChange={(e) => dispatch(categoryListActions.setNameField("ru", e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
                  placeholder="Напитки"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Slug
                </label>
                <input
                  value={state.form.slug}
                  onChange={(event) =>
                    dispatch(
                      categoryListActions.setField("slug", event.target.value),
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
                  placeholder="ichimliklar"
                />
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Rasm
                </label>
                <div className="relative group size-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20 transition hover:bg-muted/40 hover:border-primary/30">
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => dispatch(categoryListActions.setField("image", ""))}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="size-4" />
                      </button>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer size-full">
                      <Upload className="size-4 text-muted-foreground" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            dispatch(categoryListActions.setField("image", file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex-1 grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Tartib
                  </label>
                  <input
                    value={state.form.order_number}
                    onChange={(event) =>
                      dispatch(
                        categoryListActions.setField(
                          "order_number",
                          event.target.value,
                        ),
                      )
                    }
                    inputMode="numeric"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Holati
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch(
                        categoryListActions.setField(
                          "is_active",
                          !state.form.is_active,
                        ),
                      )
                    }
                    className={cn(
                      "flex items-center justify-center gap-2 h-[34px] w-full rounded-lg px-3 text-[11px] font-bold transition",
                      state.form.is_active
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground border border-border",
                    )}
                  >
                    <div className={cn("size-1.5 rounded-full", state.form.is_active ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
                    {state.form.is_active ? "FAOL" : "YOPIQ"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-row items-center justify-between gap-2 bg-transparent border-none p-0 sm:justify-between">
            {state.dialogMode === "edit" ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDialogLoading}
                className="h-8 text-xs px-3"
              >
                O'chirish
              </Button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(categoryListActions.closeDialog())}
                disabled={isDialogLoading}
                className="h-8 text-xs px-3 border-primary/20 text-primary hover:bg-primary/5"
              >
                Bekor qilish
              </Button>
              <Button
                onClick={state.dialogMode === "edit" ? handleUpdate : handleCreate}
                size="sm"
                disabled={isDialogLoading}
                className="h-8 text-xs px-4"
              >
                Saqlash
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {categoriesQuery.isError && (
        <p className="mt-4 text-xs text-destructive">
          Kategoriyalarni yuklashda xatolik yuz berdi.
        </p>
      )}

      {categoriesQuery.isLoading && categories.length === 0 && (
        <p className="mt-4 text-xs text-muted-foreground">Yuklanmoqda...</p>
      )}
    </section>
  );
}
