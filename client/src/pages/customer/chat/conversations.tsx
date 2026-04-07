import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftIcon, MessageCircleIcon, PlusIcon } from "lucide-react";
import { api } from "@/api/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { Conversation } from "@/interfaces/market.interface";
import { formatDateTime } from "@/lib/market";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/market";

export default function ConversationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get("store_id");
  const storeName = searchParams.get("store_name");

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", "my"],
    queryFn: async () =>
      (await api.get<Conversation[]>("/conversations")).data,
    staleTime: 30000,
  });

  const startChat = useMutation({
    mutationFn: async (payload: { store_id: string; type: string }) =>
      (
        await api.post<Conversation>("/conversations", {
          type: payload.type,
          store_id: payload.store_id,
        })
      ).data,
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", "my"] });
      navigate(`/mobile/chat/${conv.id}`);
    },
    onError: (error) => toast.error(extractErrorMessage(error)),
  });

  // Auto-start conversation if came from store page
  const handleStartStoreChat = () => {
    if (!storeId) return;
    startChat.mutate({ store_id: storeId, type: "STORE_INQUIRY" });
  };

  return (
    <div className="min-h-screen pb-28 pt-4">
      <div className="space-y-4 px-4">
        <div className="flex items-center gap-3 rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.3)]">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-950">Xabarlar</h1>
            <p className="text-sm text-slate-500">Do'konlar bilan suhbatlar</p>
          </div>
          {storeId ? (
            <button
              onClick={handleStartStoreChat}
              disabled={startChat.isPending}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            >
              <PlusIcon className="h-4 w-4" />
              {storeName ? `${storeName} bilan chat` : "Yangi chat"}
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 rounded-full" />
                  <Skeleton className="h-3 w-48 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-14 text-center">
            <MessageCircleIcon className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-base font-semibold text-slate-900">
              Hali xabarlar yo'q
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Do'kon sahifasidan suhbat boshlang
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const isUnread =
                conv.unread_buyer > 0 || conv.unread_seller > 0;
              const partnerName = conv.seller
                ? `${conv.seller.first_name} ${conv.seller.last_name}`
                : conv.buyer
                  ? `${conv.buyer.first_name} ${conv.buyer.last_name}`
                  : "Noma'lum";
              const unreadCount = conv.unread_buyer + conv.unread_seller;

              return (
                <Link
                  key={conv.id}
                  to={`/mobile/chat/${conv.id}`}
                  className="flex items-center gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.15)] transition active:scale-[0.99]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {partnerName[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {partnerName}
                      </p>
                      {conv.last_message_at ? (
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatDateTime(conv.last_message_at)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-slate-500">
                        {conv.last_message_preview ?? "Hali xabar yo'q"}
                      </p>
                      {isUnread ? (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                          {unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {conv.type === "ORDER"
                          ? "Buyurtma"
                          : conv.type === "BROADCAST"
                            ? "So'rov"
                            : "Do'kon"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
