import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LocateFixedIcon, MinusIcon, PlusIcon, ShoppingBagIcon } from "lucide-react";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDiscoveryPreferences } from "@/hooks/use-discovery-preferences";
import { extractErrorMessage } from "@/lib/market";
import { useBroadcastCartStore } from "@/stores/broadcast-cart.store";

const AUTO_BROADCAST_RADIUS_KM = 12;

type BroadcastCartSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function BroadcastCartSheet({
  open,
  onOpenChange,
}: BroadcastCartSheetProps) {
  const navigate = useNavigate();
  const items = useBroadcastCartStore((state) => state.items);
  const updateQuantity = useBroadcastCartStore((state) => state.updateQuantity);
  const clearCart = useBroadcastCartStore((state) => state.clearCart);
  const { location, address, setAddress, requestCurrentLocation } = useDiscoveryPreferences();
  const [note, setNote] = useState("");

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const createRequest = useMutation({
    mutationFn: async () => {
      const currentLocation = location ?? (await requestCurrentLocation());
      const deliveryAddress =
        address.trim() || `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;

      return (
        await api.post<{ id: string }>("/orders/broadcast-requests", {
          title:
            totalItems === 1
              ? `${items[0]?.name} buyurtmasi`
              : `${totalItems} ta mahsulotli savat`,
          note: note.trim() || undefined,
          radius_km: AUTO_BROADCAST_RADIUS_KM,
          delivery_lat: currentLocation.lat,
          delivery_lng: currentLocation.lng,
          delivery_address: deliveryAddress,
          delivery_details: note.trim() || undefined,
          items: items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
        })
      ).data;
    },
    onSuccess: (data) => {
      clearCart();
      setNote("");
      onOpenChange(false);
      toast.success("Buyurtma sellerlarga yuborildi");
      navigate(`/mobile/requests/${data.id}`);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-[2rem] border-0 px-0 pb-0"
      >
        <SheetHeader className="border-b border-slate-200 px-4 pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            <ShoppingBagIcon className="h-5 w-5 text-primary" />
            Umumiy savat
          </SheetTitle>
          <SheetDescription className="text-sm text-slate-500">
            Shu savat yaqin do'konlarga yuboriladi
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 py-4">
          {!items.length ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Savat bo'sh
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.productId}
                className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fff5f6)] p-3"
              >
                <div className="flex gap-3">
                  <div className="h-18 w-18 shrink-0 overflow-hidden rounded-[1.1rem] bg-slate-100">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        📦
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.parentName ? `${item.parentName} varianti` : item.categoryName ?? ""}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, Math.max(0, item.quantity - 1))
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="min-w-7 text-center text-sm font-semibold text-slate-950">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Yetkazib berish joyi</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => requestCurrentLocation().catch(() => undefined)}
              >
                <LocateFixedIcon />
                GPS
              </Button>
            </div>

            <p className="mt-3 rounded-[1.1rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {location
                ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                : "Joylashuv olinmagan"}
            </p>

            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Manzil"
              className="mt-3 h-24 w-full rounded-[1.15rem] border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Izoh"
              className="mt-3 h-24 w-full rounded-[1.15rem] border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 px-4 py-4">
          <Button
            className="h-12 w-full rounded-[1.25rem]"
            disabled={!items.length || createRequest.isPending}
            onClick={() => createRequest.mutate()}
          >
            {createRequest.isPending
              ? "Yuborilmoqda..."
              : `${totalItems} ta mahsulotni yuborish`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
