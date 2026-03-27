import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CrosshairIcon,
  MapPinIcon,
  PencilLineIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import { api } from "@/api/api";
import EmptyState from "@/components/common/empty-state";
import LocationPickerMap from "@/components/maps/location-picker-map";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SavedLocation } from "@/interfaces/market.interface";
import { extractErrorMessage } from "@/lib/market";
import { cn } from "@/lib/utils";

type LocationFormState = {
  label: string;
  address_line: string;
  landmark: string;
  lat: string;
  lng: string;
  is_default: boolean;
};

type LocationPayload = {
  label: string;
  address_line: string;
  landmark?: string;
  lat: number;
  lng: number;
  is_default: boolean;
};

function createEmptyForm(): LocationFormState {
  return {
    label: "Uy",
    address_line: "",
    landmark: "",
    lat: "",
    lng: "",
    is_default: true,
  };
}

function formFromLocation(location: SavedLocation): LocationFormState {
  return {
    label: location.label,
    address_line: location.address_line,
    landmark: location.landmark ?? "",
    lat: String(location.lat),
    lng: String(location.lng),
    is_default: location.is_default,
  };
}

export default function CustomerLocationsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationFormState>(createEmptyForm());

  const { data: locations = [] } = useQuery({
    queryKey: ["locations", "my"],
    queryFn: async () => (await api.get<SavedLocation[]>("/locations/my")).data,
  });

  const defaultLocation = useMemo(
    () => locations.find((location) => location.is_default) ?? locations[0] ?? null,
    [locations],
  );

  const mapCenter = useMemo(() => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);

    if (Number.isFinite(lat) && Number.isFinite(lng) && form.lat && form.lng) {
      return { lat, lng };
    }

    if (editingId) {
      const activeLocation = locations.find((location) => location.id === editingId);
      if (activeLocation) {
        return {
          lat: Number(activeLocation.lat),
          lng: Number(activeLocation.lng),
        };
      }
    }

    if (defaultLocation) {
      return {
        lat: Number(defaultLocation.lat),
        lng: Number(defaultLocation.lng),
      };
    }

    return null;
  }, [defaultLocation, editingId, form.lat, form.lng, locations]);

  const createLocation = useMutation({
    mutationFn: async (payload: LocationPayload) =>
      (await api.post<SavedLocation>("/locations", payload)).data,
    onSuccess: () => {
      toast.success("Manzil qo'shildi");
      setDialogOpen(false);
      setEditingId(null);
      setForm(createEmptyForm());
      queryClient.invalidateQueries({ queryKey: ["locations", "my"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const updateLocation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: LocationPayload;
    }) => (await api.put<SavedLocation>(`/locations/${id}`, payload)).data,
    onSuccess: () => {
      toast.success("Manzil yangilandi");
      setDialogOpen(false);
      setEditingId(null);
      setForm(createEmptyForm());
      queryClient.invalidateQueries({ queryKey: ["locations", "my"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/locations/${id}`)).data,
    onSuccess: () => {
      toast.success("Manzil o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["locations", "my"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const setDefaultLocation = useMutation({
    mutationFn: async (id: string) => (await api.put(`/locations/${id}/default`)).data,
    onSuccess: () => {
      toast.success("Asosiy manzil yangilandi");
      queryClient.invalidateQueries({ queryKey: ["locations", "my"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const isSaving = createLocation.isPending || updateLocation.isPending;

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({
      ...createEmptyForm(),
      is_default: locations.length === 0,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (location: SavedLocation) => {
    setEditingId(location.id);
    setForm(formFromLocation(location));
    setDialogOpen(true);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      toast.error("GPS bu qurilmada ishlamaydi");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
        }));
      },
      () => {
        toast.error("GPS ma'lumotini olib bo'lmadi");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submitLocation = () => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);

    if (!form.address_line.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error("Manzil va xarita koordinatasini to'ldiring");
      return;
    }

    const payload = {
      label: form.label.trim() || "Manzil",
      address_line: form.address_line.trim(),
      landmark: form.landmark.trim() || undefined,
      lat,
      lng,
      is_default: form.is_default,
    };

    if (editingId) {
      updateLocation.mutate({ id: editingId, payload });
      return;
    }

    createLocation.mutate(payload);
  };

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <section className="rounded-[1.75rem] border border-white/70 bg-white/92 p-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Manzillar</h1>
            <p className="mt-1 text-sm text-slate-500">
              Direct order uchun delivery manzillari.
            </p>
          </div>
          <Button
            className="h-11 rounded-full px-4 shadow-[0_16px_30px_-18px_rgba(220,38,38,0.45)]"
            onClick={openCreateDialog}
          >
            <PlusIcon />
            Yangi manzil
          </Button>
        </div>
      </section>

      {locations.length === 0 ? (
        <section className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/85 p-4">
          <EmptyState
            title="Saqlangan manzil yo'q"
            description="Yangi manzil qo'shib, direct order vaqtida tez tanlang."
            actionLabel="Manzil qo'shish"
            actionTo="/mobile/locations"
          />
          <div className="mt-4 flex justify-center">
            <Button className="rounded-full px-5" onClick={openCreateDialog}>
              <PlusIcon />
              Birinchi manzilni qo'shish
            </Button>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {locations.map((location) => (
            <article
              key={location.id}
              className="rounded-[1.5rem] border border-white/70 bg-white/92 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MapPinIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-950">
                          {location.label}
                        </p>
                        {location.is_default ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                            Asosiy
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {location.address_line}
                      </p>
                      {location.landmark ? (
                        <p className="mt-1 text-xs text-slate-400">
                          Mo'ljal: {location.landmark}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!location.is_default ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDefaultLocation.mutate(location.id)}
                  >
                    <StarIcon />
                    Asosiy qilish
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => openEditDialog(location)}>
                  <PencilLineIcon />
                  Tahrirlash
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLocation.mutate(location.id)}
                >
                  <Trash2Icon />
                  O'chirish
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingId(null);
            setForm(createEmptyForm());
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[1.75rem] p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <DialogTitle>
              {editingId ? "Manzilni tahrirlash" : "Yangi manzil qo'shish"}
            </DialogTitle>
            <DialogDescription>
              Xarita ustiga bosib delivery nuqtasini tanlang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleUseGps}>
                <CrosshairIcon />
                GPS olish
              </Button>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    is_default: !current.is_default,
                  }))
                }
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-full border px-4 text-sm font-semibold transition",
                  form.is_default
                    ? "border-primary/15 bg-primary/10 text-primary"
                    : "border-slate-200 bg-white text-slate-600",
                )}
              >
                <StarIcon className="mr-2 h-4 w-4" />
                {form.is_default ? "Asosiy manzil" : "Oddiy manzil"}
              </button>
            </div>

            <LocationPickerMap
              center={mapCenter}
              markers={
                mapCenter
                  ? [
                      {
                        id: editingId ?? "draft-location",
                        lat: mapCenter.lat,
                        lng: mapCenter.lng,
                        label: editingId ? "Tanlangan manzil" : "Yangi manzil",
                        meta: form.address_line || "Xaritadan nuqta tanlang",
                        tone: "accent",
                      },
                    ]
                  : []
              }
              interactive
              onLocationSelect={(location) =>
                setForm((current) => ({
                  ...current,
                  lat: String(location.lat),
                  lng: String(location.lng),
                }))
              }
            />

            <div className="grid gap-3">
              <Input
                placeholder="Label"
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
              />
              <Input
                placeholder="Manzil"
                value={form.address_line}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    address_line: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Mo'ljal"
                value={form.landmark}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    landmark: event.target.value,
                  }))
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="Latitude"
                  value={form.lat}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lat: event.target.value }))
                  }
                />
                <Input
                  placeholder="Longitude"
                  value={form.lng}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lng: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="rounded-b-[1.75rem] border-slate-200 bg-slate-50/80">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Bekor
            </Button>
            <Button onClick={submitLocation} disabled={isSaving}>
              {isSaving
                ? "Saqlanmoqda..."
                : editingId
                  ? "Yangilash"
                  : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
