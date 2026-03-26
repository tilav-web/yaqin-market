import { useQuery } from "@tanstack/react-query";
import { api } from "../../../api/api";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  createdAt: string;
  store: {
    name: string;
  };
  items: {
    product_name: string;
    quantity: number;
    price: number;
  }[];
}

export default function CustomerOrders() {
  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ["orders", "my"],
    queryFn: () => api.get("/orders/my"),
  });

  const orders: Order[] = ordersRes?.data || [];

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

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Mening buyurtmalarim</h1>
        <p className="text-sm text-muted-foreground">
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
        <div className="text-center py-10 text-muted-foreground">
          <p>Hozircha buyurtmalar yo'q</p>
          <Link to="/mobile">
            <Button className="mt-4">Bosh sahifaga qaytish</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: Order) => (
            <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-foreground">{order.store?.name}</p>
                  <p className="text-xs text-gray-500">{order.order_number}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <div className="border-t mt-2 pt-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.product_name} x{item.quantity}</span>
                    <span>{item.price.toLocaleString()} so'm</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <span className="font-bold">{order.total_price.toLocaleString()} so'm</span>
                <Link to={`/orders/${order.id}`}>
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
