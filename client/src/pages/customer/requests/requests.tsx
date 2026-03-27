import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/api/api";
import EmptyState from "@/components/common/empty-state";
import StatusPill from "@/components/common/status-pill";
import type { BroadcastRequest } from "@/interfaces/market.interface";
import { formatDateTime, getBroadcastStatusLabel } from "@/lib/market";

export default function CustomerRequestsPage() {
  const { data: requests = [] } = useQuery({
    queryKey: ["broadcast-requests", "my"],
    queryFn: async () =>
      (await api.get<BroadcastRequest[]>("/orders/broadcast-requests/my")).data,
  });

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Mening so'rovlarim</h1>
        <p className="mt-2 text-sm text-slate-500">
          Broadcast savatlaringiz va sellerlardan kelgan takliflar
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title="Hali so'rov yuborilmadi"
          description="Topa olmagan savatingizni yaqin do'konlar orasiga tashlang."
          actionLabel="Yangi so'rov yaratish"
          actionTo="/mobile/broadcast/new"
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Link
              key={request.id}
              to={`/mobile/requests/${request.id}`}
              className="block rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{request.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {request.delivery_address}
                  </p>
                </div>
                <StatusPill
                  status={request.status}
                  label={getBroadcastStatusLabel(request.status)}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mahsulotlar</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{request.items.length}</p>
                </div>
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Takliflar</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{request.offers.length}</p>
                </div>
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Yuborilgan</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {formatDateTime(request.createdAt)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
