import { api } from "@/api/api";

export async function getClickPaymentUrl(orderId: string) {
  return (
    await api.get<{ url: string }>("/payments/click/url", {
      params: { order_id: orderId },
    })
  ).data;
}
