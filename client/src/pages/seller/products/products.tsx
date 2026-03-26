import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../api/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  slug: string;
  images: { url: string; is_main: boolean }[];
}

interface StoreProduct {
  id: string;
  product_id: number;
  product: Product;
  price: number;
  status: string;
}

export default function SellerProducts() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [price, setPrice] = useState("");

  const { data: storesRes } = useQuery({
    queryKey: ["seller", "stores"],
    queryFn: () => api.get("/stores/my"),
  });

  const stores: any[] = storesRes?.data || [];
  const store = stores[0];

  const { data: myProductsRes, isLoading: myProductsLoading } = useQuery({
    queryKey: ["store-products", store?.id],
    queryFn: () => api.get(`/store-products?store_id=${store?.id}&include_inactive=true`),
    enabled: !!store?.id,
  });

  const myProducts: StoreProduct[] = myProductsRes?.data || [];

  const { data: allProductsRes, isLoading: allProductsLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => api.get("/products"),
  });

  const allProducts: Product[] = allProductsRes?.data || [];

  const addProduct = useMutation({
    mutationFn: (data: { product_id: number; price: number }) =>
      api.post(`/store-products?store_id=${store?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-products", store?.id] });
      setSelectedProduct(null);
      setPrice("");
      toast.success("Mahsulot do'konga qo'shildi");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Mahsulot qo'shishda xatolik",
      );
    },
  });

  const myProductIds = myProducts.map((p) => p.product_id) || [];
  const availableProducts =
    allProducts.filter((p) => !myProductIds.includes(p.id)) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Mahsulotlar</h1>
        <p className="text-sm text-muted-foreground">
          Do'koningizga mahsulot qo'shing va narxlarni boshqaring.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card/90 p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        <h2 className="text-lg font-semibold mb-3 text-foreground">
          Yangi mahsulot qo'shish
        </h2>
        {allProductsLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : availableProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Barcha mahsulotlar allaqachon qo'shilgan.
          </p>
        ) : (
          <div className="space-y-3">
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={selectedProduct || ""}
              onChange={(e) => setSelectedProduct(Number(e.target.value))}
            >
              <option value="">Mahsulotni tanlang</option>
              {availableProducts.map((product: Product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                placeholder="Narx (so'm)"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <Button
                disabled={!selectedProduct || !price || addProduct.isPending}
                onClick={() =>
                  addProduct.mutate({
                    product_id: selectedProduct!,
                    price: Number(price),
                  })
                }
              >
                {addProduct.isPending ? "Saqlanmoqda..." : "Qo'shish"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card/90 p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
        <h2 className="text-lg font-semibold mb-3 text-foreground">
          Mening mahsulotlarim
        </h2>
        {myProductsLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : myProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hozircha mahsulotlar yo'q.
          </p>
        ) : (
          <div className="space-y-2">
            {myProducts.map((item: StoreProduct) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-background p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                    {item.product.images?.[0]?.url ? (
                      <img
                        src={item.product.images[0].url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      "📦"
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Number(item.price).toLocaleString()} so'm
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    item.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
