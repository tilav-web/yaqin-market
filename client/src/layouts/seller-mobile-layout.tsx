import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  ChevronLeftIcon,
  Package2Icon,
  ReceiptTextIcon,
  SendIcon,
  StoreIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SellerTab = "store" | "products" | "orders" | "requests";

const tabs: Array<{
  key: SellerTab;
  label: string;
  to: string;
  icon: typeof StoreIcon;
}> = [
  { key: "store", label: "Do'kon", to: "/mobile/seller/store", icon: StoreIcon },
  { key: "products", label: "Mahsulot", to: "/mobile/seller/products", icon: Package2Icon },
  { key: "orders", label: "Orders", to: "/mobile/seller/orders", icon: ReceiptTextIcon },
  { key: "requests", label: "So'rov", to: "/mobile/seller/requests", icon: SendIcon },
];

export default function SellerMobileLayout() {
  const location = useLocation();

  const activeTab = useMemo<SellerTab>(() => {
    const path = location.pathname;

    if (path.startsWith("/mobile/seller/store")) return "store";
    if (path.startsWith("/mobile/seller/products")) return "products";
    if (path.startsWith("/mobile/seller/orders")) return "orders";
    if (path.startsWith("/mobile/seller/requests")) return "requests";
    return "store";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.12),transparent_42%),linear-gradient(180deg,#fff8f8,#ffffff_58%,#fff1f3)]">
      <div className="px-4 pt-4 pb-3">
        <Link
          to="/mobile"
          className="mx-auto flex max-w-xl items-center gap-3 rounded-[1.8rem] border border-white/70 bg-white/88 px-4 py-3 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.3)] transition hover:border-primary/25 hover:bg-white"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ChevronLeftIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
              Seller mini app
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              Marketga qaytish
            </p>
          </div>
        </Link>
      </div>

      <Outlet />

      <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.9rem)]">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/70 bg-white/92 p-2 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  viewTransition
                  className={cn(
                    "group relative overflow-hidden rounded-[1.35rem] px-1.5 py-2 text-center transition-all duration-300 active:scale-[0.98]",
                    isActive ? "text-slate-950" : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-0 rounded-[1.25rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,242,244,0.95))] opacity-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-300",
                      isActive && "opacity-100",
                    )}
                  />
                  <span className="relative flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        "flex h-8.5 w-8.5 items-center justify-center rounded-full transition-all duration-300",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_14px_24px_-14px_rgba(220,38,38,0.6)]"
                          : "bg-transparent text-current group-hover:bg-slate-100",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
