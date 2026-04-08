import { useMemo, useReducer } from "react";
import { useLang } from "@/context/lang.context";
import { t } from "@/lib/i18n";
import type { TName } from "@/lib/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Ruler } from "lucide-react";
import { unitService, type IUnit } from "@/services/unit.service";
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
  AdminPageHeader,
  AdminSurface,
  AdminInfoPill,
} from "@/components/admin/admin-ui";

// ─── Reducer ──────────────────────────────────────────────────────────────────
type UnitFormState = {
  name: TName;
  short_name: TName;
};

type UnitListState = {
  dialogOpen: boolean;
  dialogMode: "create" | "edit" | null;
  editingId: number | null;
  form: UnitFormState;
};

type UnitAction =
  | { type: "OPEN_CREATE" }
  | { type: "OPEN_EDIT"; payload: IUnit }
  | { type: "CLOSE_DIALOG" }
  | { type: "SET_NAME"; payload: { lang: keyof TName; value: string } }
  | { type: "SET_SHORT_NAME"; payload: { lang: keyof TName; value: string } };

const emptyForm: UnitFormState = {
  name: { uz: "", ru: "" },
  short_name: { uz: "", ru: "" },
};

const initialState: UnitListState = {
  dialogOpen: false,
  dialogMode: null,
  editingId: null,
  form: { ...emptyForm },
};

function reducer(state: UnitListState, action: UnitAction): UnitListState {
  switch (action.type) {
    case "OPEN_CREATE":
      return { ...state, dialogOpen: true, dialogMode: "create", editingId: null, form: { ...emptyForm } };
    case "OPEN_EDIT":
      return {
        ...state,
        dialogOpen: true,
        dialogMode: "edit",
        editingId: action.payload.id,
        form: {
          name: typeof action.payload.name === "object" ? action.payload.name : { uz: "", ru: "" },
          short_name: action.payload.short_name && typeof action.payload.short_name === "object"
            ? action.payload.short_name : { uz: "", ru: "" },
        },
      };
    case "CLOSE_DIALOG":
      return { ...state, dialogOpen: false, dialogMode: null, editingId: null };
    case "SET_NAME":
      return { ...state, form: { ...state.form, name: { ...state.form.name, [action.payload.lang]: action.payload.value } } };
    case "SET_SHORT_NAME":
      return { ...state, form: { ...state.form, short_name: { ...state.form.short_name, [action.payload.lang]: action.payload.value } } };
    default:
      return state;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminUnitsPage() {
  const queryClient = useQueryClient();
  const { lang } = useLang();
  const [state, dispatch] = useReducer(reducer, initialState);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["units"],
    queryFn: unitService.findAll,
  });

  const units = useMemo(() => data ?? [], [data]);

  const createMutation = useMutation({
    mutationFn: unitService.create,
    onSuccess: (data) => {
      toast.success(`Birlik yaratildi: ${t(data.name, lang)}`);
      dispatch({ type: "CLOSE_DIALOG" });
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Yaratishda xatolik"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name: TName; short_name?: TName } }) =>
      unitService.update(id, payload),
    onSuccess: (data) => {
      toast.success(`Birlik yangilandi: ${t(data.name, lang)}`);
      dispatch({ type: "CLOSE_DIALOG" });
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Yangilashda xatolik"),
  });

  const deleteMutation = useMutation({
    mutationFn: unitService.remove,
    onSuccess: () => {
      toast.success("Birlik o'chirildi");
      dispatch({ type: "CLOSE_DIALOG" });
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "O'chirishda xatolik"),
  });

  const handleSave = () => {
    if (!state.form.name.uz.trim()) {
      toast.error("Birlik nomini kiriting (UZ)");
      return;
    }
    const payload = {
      name: state.form.name,
      short_name: state.form.short_name.uz.trim() || state.form.short_name.ru.trim()
        ? state.form.short_name
        : undefined,
    };
    if (state.dialogMode === "edit" && state.editingId) {
      updateMutation.mutate({ id: state.editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (!state.editingId) return;
    const unit = units.find((u) => u.id === state.editingId);
    if (!unit) return;

    const unitId = state.editingId;
    const unitName = t(unit.name, lang);
    dispatch({ type: "CLOSE_DIALOG" });

    let secondsLeft = 5;
    const toastId = toast.warning(`"${unitName}" o'chirilmoqda`, {
      description: `${secondsLeft} soniyadan so'ng o'chiriladi`,
      duration: Infinity,
      action: {
        label: "Bekor qilish",
        onClick: () => {
          clearInterval(interval);
          toast.dismiss(toastId);
          toast.info(`"${unitName}" o'chirilishi bekor qilindi`);
        },
      },
    });

    const interval = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(interval);
        toast.dismiss(toastId);
        deleteMutation.mutate(unitId);
      } else {
        toast.warning(`"${unitName}" o'chirilmoqda`, {
          id: toastId,
          description: `${secondsLeft} soniyadan so'ng o'chiriladi`,
        });
      }
    }, 1000);
  };

  const isDialogLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 lg:p-10">
      <AdminPageHeader
        title="O'lchov birliklari"
        description="Mahsulotlar uchun o'lchov birliklarini boshqaring"
      >
        <Button size="sm" onClick={() => dispatch({ type: "OPEN_CREATE" })} className="h-9 gap-2 px-4">
          <Plus className="size-4" />
          Yangi birlik
        </Button>
      </AdminPageHeader>

      <AdminSurface>
        <div className="flex items-center gap-3 mb-4">
          <AdminInfoPill icon={Ruler} label="Jami" value={units.length} />
        </div>

        {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Yuklanmoqda...</p>}
        {isError && <p className="text-sm text-destructive py-8 text-center">Yuklashda xatolik</p>}

        {!isLoading && units.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Ruler className="size-7" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Birliklar yo'q</p>
            <Button size="sm" variant="outline" onClick={() => dispatch({ type: "OPEN_CREATE" })} className="gap-2">
              <Plus className="size-3.5" /> Birinchi birlikni yarating
            </Button>
          </div>
        )}

        {units.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {units.map((unit) => (
              <div
                key={unit.id}
                className="group relative rounded-[1.25rem] border border-border bg-background p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                    {t(unit.short_name, lang) || t(unit.name, lang)?.charAt(0)?.toUpperCase()}
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "OPEN_EDIT", payload: unit })}
                    className="rounded-full border border-border bg-background/80 p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-semibold text-foreground">{t(unit.name, lang)}</p>
                  {unit.short_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Qisqa: <span className="font-medium text-foreground">{t(unit.short_name, lang)}</span>
                    </p>
                  )}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    UZ: {unit.name?.uz}
                  </span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    RU: {unit.name?.ru}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSurface>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={state.dialogOpen} onOpenChange={(val) => !val && dispatch({ type: "CLOSE_DIALOG" })}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.1),transparent_60%),linear-gradient(180deg,#fff,rgba(255,245,245,0.98))] p-5 shadow-2xl">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-base font-semibold text-foreground">
              {state.dialogMode === "edit" ? "Birlikni tahrirlash" : "Yangi birlik"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {state.dialogMode === "edit"
                ? "Ma'lumotlarni yangilang yoki o'chiring."
                : "Yangi o'lchov birligi yarating (kg, dona, litr, metr...)"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name fields */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Nomi (UZ)
              </label>
              <input
                value={state.form.name.uz}
                onChange={(e) => dispatch({ type: "SET_NAME", payload: { lang: "uz", value: e.target.value } })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
                placeholder="Kilogramm"
              />
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Nomi (RU)
              </label>
              <input
                value={state.form.name.ru}
                onChange={(e) => dispatch({ type: "SET_NAME", payload: { lang: "ru", value: e.target.value } })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
                placeholder="Килограмм"
              />
            </div>

            {/* Short name fields */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Qisqa nomi (UZ)
              </label>
              <input
                value={state.form.short_name.uz}
                onChange={(e) => dispatch({ type: "SET_SHORT_NAME", payload: { lang: "uz", value: e.target.value } })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
                placeholder="kg"
              />
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Qisqa nomi (RU)
              </label>
              <input
                value={state.form.short_name.ru}
                onChange={(e) => dispatch({ type: "SET_SHORT_NAME", payload: { lang: "ru", value: e.target.value } })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20"
                placeholder="кг"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-row items-center justify-between gap-2 bg-transparent border-none p-0 sm:justify-between">
            {state.dialogMode === "edit" ? (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDialogLoading} className="h-8 text-xs px-3">
                O'chirish
              </Button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
                disabled={isDialogLoading}
                className="h-8 text-xs px-3 border-primary/20 text-primary hover:bg-primary/5"
              >
                Bekor qilish
              </Button>
              <Button onClick={handleSave} size="sm" disabled={isDialogLoading} className="h-8 text-xs px-4">
                Saqlash
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
