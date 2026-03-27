import { useQuery } from "@tanstack/react-query";
import { Wallet2Icon } from "lucide-react";
import { api } from "@/api/api";
import EmptyState from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

type WalletBalance = {
  balance: number;
  frozen_balance: number;
  available_balance: number;
};

type WalletTransaction = {
  id: string;
  amount: number;
  type: string;
  description?: string | null;
  createdAt: string;
};

export default function CustomerWalletPage() {
  const { data: wallet } = useQuery({
    queryKey: ["wallet", "balance"],
    queryFn: async () => (await api.get<WalletBalance>("/wallet/balance")).data,
  });

  const { data: walletTxRes } = useQuery({
    queryKey: ["wallet", "transactions"],
    queryFn: async () =>
      (
        await api.get<{ data: WalletTransaction[] }>("/wallet/transactions?page=1&limit=20")
      ).data,
  });

  const transactions: WalletTransaction[] = walletTxRes?.data ?? [];

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <section className="rounded-[1.75rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.3)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Wallet2Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Wallet</p>
            <h1 className="text-xl font-semibold text-slate-950">Balans va tarix</h1>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Available</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {Number(wallet?.available_balance ?? 0).toLocaleString()} so'm
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Frozen</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {Number(wallet?.frozen_balance ?? 0).toLocaleString()} so'm
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Tranzaksiyalar</h2>
          <span className="text-sm text-slate-400">{transactions.length} ta</span>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            title="Tranzaksiya yo'q"
            description="Wallet harakati paydo bo'lganda shu yerda ko'rinadi."
          />
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <article
                key={transaction.id}
                className="rounded-[1.5rem] border border-white/70 bg-white/92 px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-950">
                      {transaction.description || transaction.type}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      Number(transaction.amount) >= 0
                        ? "text-emerald-600"
                        : "text-rose-600",
                    )}
                  >
                    {Number(transaction.amount) >= 0 ? "+" : ""}
                    {Number(transaction.amount).toLocaleString()} so'm
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
