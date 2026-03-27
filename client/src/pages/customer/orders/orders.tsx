import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/api";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/common/status-pill";
import type { OrderSummary } from "@/interfaces/market.interface";
import { formatDateTime, formatMoney, getOrderStatusLabel } from "@/lib/market";

export default function CustomerOrders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", "my"],
    queryFn: async () => (await api.get<OrderSummary[]>("/orders/my")).data,
  });

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Mening buyurtmalarim</h1>
        <p className="mt-2 text-sm text-slate-500">
          Yangi va eski buyurtmalar tarixi.
        </p>
      </div>
      
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/85 py-10 text-center text-slate-500">
          <p>Hozircha buyurtmalar yo'q</p>
          <Link to="/mobile">
            <Button className="mt-4">Bosh sahifaga qaytish</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-sm"
            >
              <div className="flex justify-between items-start mb-2 gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{order.store?.name ?? "Do'kon"}</p>
                  <p className="text-xs text-slate-500">{order.order_number}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(order.createdAt)}</p>
                </div>
                <StatusPill
                  status={order.status}
                  label={getOrderStatusLabel(order.status)}
                />
              </div>
              <div className="border-t mt-2 pt-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.product_name} x{item.quantity}</span>
                    <span>{formatMoney(item.price)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <span className="font-bold">{formatMoney(order.total_price)}</span>
                <Link to={`/mobile/orders/${order.id}`}>
                  <Button variant="outline" size="sm">Batafsil</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
