import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, SendIcon } from "lucide-react";
import { api } from "@/api/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage, Conversation } from "@/interfaces/market.interface";
import type { PaginatedResponse } from "@/interfaces/market.interface";
import { useAuthStore } from "@/stores/auth.store";
import { extractErrorMessage } from "@/lib/market";
import { toast } from "sonner";

export default function ChatMessagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useAuthStore((state) => state.me);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: conversation } = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () =>
      (await api.get<Conversation>(`/conversations/${id}`)).data,
    enabled: !!id,
    staleTime: 60000,
  });

  const {
    data: pages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["conversation", id, "messages"],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<PaginatedResponse<ChatMessage>>(
          `/conversations/${id}/messages`,
          { params: { page: pageParam, limit: 30 } },
        )
      ).data,
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.hasMore ? last.meta.page + 1 : undefined,
    enabled: !!id,
    staleTime: 10000,
  });

  const messages = pages?.pages.flatMap((p) => p.items) ?? [];

  // Scroll to bottom when new messages appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) =>
      (
        await api.post<ChatMessage>(`/conversations/${id}/messages`, {
          content,
        })
      ).data,
    onSuccess: (msg) => {
      // Optimistically update message list
      queryClient.setQueryData(
        ["conversation", id, "messages"],
        (old: typeof pages) => {
          if (!old) return old;
          const updated = { ...old };
          updated.pages = old.pages.map((page, idx) => {
            if (idx !== 0) return page;
            return { ...page, items: [msg, ...page.items] };
          });
          return updated;
        },
      );
      setText("");
    },
    onError: (error) => toast.error(extractErrorMessage(error)),
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate(trimmed);
  };

  const partnerName = conversation
    ? me?.user?.id === conversation.buyer_id
      ? conversation.seller
        ? `${conversation.seller.first_name} ${conversation.seller.last_name}`
        : "Do'kon"
      : conversation.buyer
        ? `${conversation.buyer.first_name} ${conversation.buyer.last_name}`
        : "Mijoz"
    : "Suhbat";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/92 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/mobile/chat")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {partnerName[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-950">
              {partnerName}
            </p>
            {conversation ? (
              <p className="text-xs text-slate-500">
                {conversation.type === "ORDER"
                  ? "Buyurtma bo'yicha"
                  : conversation.type === "BROADCAST"
                    ? "So'rov bo'yicha"
                    : "Do'kon so'rovi"}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-28">
        {hasNextPage ? (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto block rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {isFetchingNextPage ? "Yuklanmoqda..." : "Oldingi xabarlar"}
          </button>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <Skeleton className="h-10 w-48 rounded-[1.2rem]" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">Hali xabar yo'q. Birinchi xabarni yuboring!</p>
          </div>
        ) : (
          [...messages].reverse().map((msg) => {
            const isMine = msg.sender_id === me?.user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-[1.2rem] px-4 py-2.5 text-sm leading-6 ${
                    isMine
                      ? "rounded-br-sm bg-primary text-white"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  {msg.content}
                  <p
                    className={`mt-1 text-[10px] ${isMine ? "text-white/65" : "text-slate-400"}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {msg.read_at && isMine ? " ✓✓" : isMine ? " ✓" : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/80 bg-white/94 px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur">
        <div className="flex items-end gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Xabar yozing..."
            rows={1}
            className="flex-1 resize-none rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.5)] transition hover:bg-primary/90 disabled:opacity-50"
          >
            <SendIcon className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
