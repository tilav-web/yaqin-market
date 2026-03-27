import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/api";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/common/status-pill";
import { useBroadcastSocket } from "@/hooks/use-broadcast-socket";
import type { BroadcastRequest, StoreProduct } from "@/interfaces/market.interface";
import { extractErrorMessage, formatMoney, getBroadcastStatusLabel } from "@/lib/market";

type DraftState = Record<
  string,
  {
    message: string;
    estimated_minutes: string;
    delivery_price: string;
    prices: Record<string, string>;
  }
>;

export default function SellerRequestsPage() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<DraftState>({});

  useBroadcastSocket({
    role: "seller",
    onRequestCreated: () => {
      queryClient.invalidateQueries({ queryKey: ["seller", "broadcast-feed"] });
    },
    onRequestUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ["seller", "broadcast-feed"] });
    },
  });

  const { data: myStoreProducts = [] } = useQuery({
    queryKey: ["seller", "store-products", "all"],
    queryFn: async () => {
      const stores = (await api.get<{ id: string }[]>("/stores/my")).data;
      const storeId = stores[0]?.id;
      if (!storeId) return [] as StoreProduct[];
      return (
        await api.get<StoreProduct[]>(`/store-products?store_id=${storeId}&include_inactive=true`)
      ).data;
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["seller", "broadcast-feed"],
    queryFn: async () =>
      (await api.get<BroadcastRequest[]>("/orders/broadcast-requests/store/feed?radius=12")).data,
  });

  useEffect(() => {
    if (!requests.length || !myStoreProducts.length) return;

    setDrafts((current) => {
      const next = { ...current };

      requests.forEach((request) => {
        if (next[request.id]) return;

        const prices = Object.fromEntries(
          request.items.map((item) => {
            const match = myStoreProducts.find(
              (product) => product.product_id === item.product_id,
            );
            return [item.id, match ? String(match.price) : ""];
          }),
        );

        next[request.id] = {
          message: request.my_offer?.message ?? "",
          estimated_minutes: String(request.my_offer?.estimated_minutes ?? 30),
          delivery_price: String(request.my_offer?.delivery_price ?? 0),
          prices,
        };
      });

      return next;
    });
  }, [myStoreProducts, requests]);

  const createOffer = useMutation({
    mutationFn: async (request: BroadcastRequest) => {
      const draft = drafts[request.id];
      if (!draft) throw new Error("Draft topilmadi");

      return (
        await api.post(`/orders/broadcast-requests/${request.id}/offers`, {
          message: draft.message,
          estimated_minutes: Number(draft.estimated_minutes || 30),
          delivery_price: Number(draft.delivery_price || 0),
          items: request.items.map((item) => {
            const matchedStoreProduct = myStoreProducts.find(
              (product) => product.product_id === item.product_id,
            );

            return {
              request_item_id: item.id,
              unit_price: Number(draft.prices[item.id] || 0),
              store_product_id: matchedStoreProduct?.id,
            };
          }),
        })
      ).data;
    },
    onSuccess: () => {
      toast.success("Taklif yuborildi");
      queryClient.invalidateQueries({ queryKey: ["seller", "broadcast-feed"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const validRequests = useMemo(
    () => requests.filter((request) => request.status === "OPEN"),
    [requests],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Broadcast feed</h1>
        <p className="mt-2 text-sm text-slate-500">
          Yaqin mijoz so'rovlarini ko'ring va taklif yuboring
        </p>
      </div>

      {validRequests.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
          Hozircha yaqin so'rovlar yo'q.
        </div>
      ) : (
        <div className="space-y-4">
          {validRequests.map((request) => {
            const draft = drafts[request.id];

            return (
              <article
                key={request.id}
                className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.25)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">{request.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{request.delivery_address}</p>
                  </div>
                  <StatusPill
                    status={request.status}
                    label={getBroadcastStatusLabel(request.status)}
                  />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {request.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="font-medium text-slate-900">{item.product_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.quantity} ta</p>
                      <input
                        value={draft?.prices[item.id] ?? ""}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [request.id]: {
                              ...current[request.id],
                              prices: {
                                ...current[request.id]?.prices,
                                [item.id]: event.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="1 dona narxi"
                        className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  <input
                    value={draft?.delivery_price ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [request.id]: {
                          ...current[request.id],
                          delivery_price: event.target.value,
                        },
                      }))
                    }
                    placeholder="Delivery narxi"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
                  />
                  <input
                    value={draft?.estimated_minutes ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [request.id]: {
                          ...current[request.id],
                          estimated_minutes: event.target.value,
                        },
                      }))
                    }
                    placeholder="ETA minut"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
                  />
                  <input
                    value={draft?.message ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [request.id]: {
                          ...current[request.id],
                          message: event.target.value,
                        },
                      }))
                    }
                    placeholder="Taklif izohi"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none"
                  />
                </div>

                {request.my_offer ? (
                  <p className="mt-4 text-sm text-emerald-700">
                    Mening oxirgi taklifim: {formatMoney(request.my_offer.total_price)}
                  </p>
                ) : null}

                <Button
                  className="mt-4"
                  onClick={() => createOffer.mutate(request)}
                  disabled={createOffer.isPending}
                >
                  Taklif yuborish
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
