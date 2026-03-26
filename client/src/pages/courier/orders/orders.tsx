import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../api/api";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  delivery_address: string;
  createdAt: string;
  store: {
    name: string;
    phone: string;
  };
  customer: {
    first_name: string;
    phone: string;
  };
  items: {
    product_name: string;
    quantity: number;
    total_price: number;
  }[];
}

export default function CourierOrders() {
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation(null),
    );
  }, []);

  const { data: meRes } = useQuery({
    queryKey: ["courier", "me"],
    queryFn: () => api.get("/users/me"),
  });

  const courierId = meRes?.data?.id as string | undefined;

  const { data: nearbyRes, isLoading: nearbyLoading } = useQuery({
    queryKey: ["courier", "nearby", location?.lat, location?.lng],
    queryFn: () =>
      api.get(
        `/orders/courier/nearby?lat=${location?.lat ?? 0}&lng=${location?.lng ?? 0}&radius=10`,
      ),
    enabled: !!location,
  });

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ["courier", "orders"],
    queryFn: () => api.get("/orders/courier/my"),
  });

  const nearbyOrders: Order[] = nearbyRes?.data || [];
  const orders: Order[] = ordersRes?.data || [];

  const assignCourier = useMutation({
    mutationFn: (id: string) =>
      api.post(`/orders/${id}/assign-courier`, { courier_id: courierId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["courier", "nearby"] });
      toast.success("Buyurtma qabul qilindi");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Buyurtmani qabul qilishda xatolik",
      );
    },
  });

  const deliverOrder = useMutation({
    mutationFn: (id: string) => api.post(`/orders/${id}/deliver`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier", "orders"] });
      toast.success("Buyurtma yetkazildi");
    },
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

  const deliveringOrders = orders.filter((o) => o.status === "DELIVERING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Courier buyurtmalar</h1>
        <p className="text-sm text-muted-foreground">
          Yaqin buyurtmalarni qabul qiling va yetkazilganlarni yopib boring.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card/90 p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Yaqin buyurtmalar</h2>
          {!location && (
            <span className="text-xs text-amber-600">GPS yoqilmagan</span>
          )}
        </div>
        {nearbyLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : nearbyOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hozircha yaqin buyurtmalar yo'q.
          </p>
        ) : (
          <div className="space-y-3">
            {nearbyOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{order.store?.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                      order.status,
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Manzil: {order.delivery_address}
                </p>
                <p className="mt-1 text-sm text-foreground font-semibold">
                  {order.total_price.toLocaleString()} so'm
                </p>
                <Button
                  className="mt-3 w-full"
                  disabled={!courierId || assignCourier.isPending}
                  onClick={() => assignCourier.mutate(order.id)}
                >
                  {assignCourier.isPending ? "Qabul qilinmoqda..." : "Qabul qilish"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card/90 p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        <h2 className="text-lg font-semibold text-foreground mb-3">Men yetkazayotganlar</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : deliveringOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Yetkazilayotgan buyurtmalar yo'q.
          </p>
        ) : (
          <div className="space-y-3">
            {deliveringOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{order.customer?.first_name}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                      order.status,
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Manzil: {order.delivery_address}
                </p>
                <Button
                  className="mt-3 w-full"
                  onClick={() => deliverOrder.mutate(order.id)}
                >
                  Yetkazildi
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
