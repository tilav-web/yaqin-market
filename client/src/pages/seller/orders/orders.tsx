import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../api/api";
import { Button } from "../../../components/ui/button";
import { useSocket } from "@/hooks/use-socket";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  createdAt: string;
  customer_note?: string;
  delivery_address: string;
  customer?: {
    first_name: string;
    phone: string;
  };
  items: {
    product_name: string;
    quantity: number;
    price: number;
    total_price: number;
  }[];
}

export default function SellerOrders() {
  const queryClient = useQueryClient();

  // Socket — yangi buyurtma yoki status o'zgarishi
  useSocket("seller", (event) => {
    if (event === "order:status-changed" || event === "order:new-direct") {
      queryClient.invalidateQueries({ queryKey: ["seller", "orders"] });
    }
  });

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ["seller", "orders"],
    queryFn: () => api.get("/orders/store/my"),
  });

  const orders: Order[] = ordersRes?.data || [];

  const acceptOrder = useMutation({
    mutationFn: (id: string) => api.post(`/orders/${id}/accept`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller", "orders"] }),
  });

  const readyOrder = useMutation({
    mutationFn: (id: string) => api.post(`/orders/${id}/ready`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller", "orders"] }),
  });

  const cancelOrder = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/orders/${id}/cancel`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller", "orders"] }),
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      ACCEPTED: "bg-blue-100 text-blue-800",
      READY: "bg-purple-100 text-purple-800",
      DELIVERING: "bg-orange-100 text-orange-800",
      DELIVERED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100";
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Yuklanmoqda...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Buyurtmalar</h1>
        <p className="text-sm text-muted-foreground">
          Do'kon buyurtmalarini boshqaring va holatni yangilang.
        </p>
      </div>
      
      {!orders || orders.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card/80 p-10 text-center text-sm text-muted-foreground">
          Buyurtmalar yo'q.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: Order) => (
            <div
              key={order.id}
              className="rounded-3xl border border-border bg-card/90 p-5 shadow-[0_18px_50px_-45px_rgba(15,23,42,0.55)]"
            >
              <div className="flex flex-wrap justify-between items-start gap-3 mb-2">
                <div>
                  <p className="font-semibold text-foreground">{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="border-t border-border py-3 my-3 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Mijoz:</span> {order.customer?.first_name}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Manzil:</span> {order.delivery_address}
                </p>
                {order.customer_note && (
                  <p className="text-xs text-muted-foreground italic">Izoh: {order.customer_note}</p>
                )}
              </div>

              <div className="space-y-1 text-sm">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.product_name} x{item.quantity}</span>
                    <span>{item.total_price.toLocaleString()} so'm</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-between items-center mt-4 pt-4 border-t border-border">
                <span className="font-bold text-foreground">
                  {order.total_price.toLocaleString()} so'm
                </span>
                <div className="flex gap-2">
                  {order.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => acceptOrder.mutate(order.id)}
                      >
                        Qabul qilish
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => cancelOrder.mutate({ id: order.id, reason: "Bekor qilindi" })}
                      >
                        Bekor qilish
                      </Button>
                    </>
                  )}
                  {order.status === "ACCEPTED" && (
                    <Button size="sm" onClick={() => readyOrder.mutate(order.id)}>
                      Tayyor
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
