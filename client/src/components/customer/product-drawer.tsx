import { Link } from "react-router-dom";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ProductCatalogItem } from "@/interfaces/market.interface";
import { useBroadcastCartStore } from "@/stores/broadcast-cart.store";

type ProductDrawerProps = {
  open: boolean;
  product: ProductCatalogItem | null;
  onOpenChange: (open: boolean) => void;
};

function normalizeProductId(productId: number | string | null | undefined) {
  return Number(productId ?? 0);
}

export default function ProductDrawer({
  open,
  product,
  onOpenChange,
}: ProductDrawerProps) {
  const cartItems = useBroadcastCartStore((state) => state.items);
  const addProduct = useBroadcastCartStore((state) => state.addProduct);
  const updateQuantity = useBroadcastCartStore((state) => state.updateQuantity);

  const variants =
    product?.children?.filter((child) => child.is_active !== false)?.length
      ? product.children.filter((child) => child.is_active !== false)
      : product
        ? [product]
        : [];

  const getQuantity = (productId: number | string) =>
    cartItems.find((item) => item.productId === normalizeProductId(productId))?.quantity ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-[2rem] border-0 px-0 pb-0"
      >
        <SheetHeader className="border-b border-slate-200 px-4 pb-4">
          <SheetTitle className="text-lg font-semibold text-slate-950">
            {product?.name ?? "Mahsulot"}
          </SheetTitle>
          <SheetDescription className="text-sm text-slate-500">
            Variant tanlang va savatga qo'shing
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 py-4">
          {variants.map((variant) => {
            const quantity = getQuantity(variant.id);
            const compareProductId = normalizeProductId(variant.id);

            return (
              <article
                key={variant.id}
                className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fff8f3)] p-3"
              >
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1.15rem] bg-slate-100">
                    {variant.images?.[0]?.url || product?.images?.[0]?.url ? (
                      <img
                        src={variant.images?.[0]?.url ?? product?.images?.[0]?.url}
                        alt={variant.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        📦
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-950">{variant.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {variant.description ?? product?.description ?? "Variant tafsiloti"}
                    </p>

                    {variant.attributes ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(variant.attributes).map(([key, value]) => (
                          <span
                            key={key}
                            className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                          >
                            {String(value)}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(compareProductId, Math.max(0, quantity - 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="min-w-7 text-center text-sm font-semibold text-slate-950">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => addProduct(variant, product)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <Link
                        to={`/mobile/products/${compareProductId}`}
                        className="text-xs font-semibold text-orange-700"
                        onClick={() => onOpenChange(false)}
                      >
                        Narxlarni ko'rish
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="border-t border-slate-200 px-4 py-4">
          <Button className="h-12 w-full rounded-[1.25rem]" onClick={() => onOpenChange(false)}>
            Davom etish
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
