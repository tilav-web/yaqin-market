import { Link, Outlet, useLocation } from "react-router-dom";
import { HomeIcon, ShoppingBagIcon, SendIcon, UserIcon } from "lucide-react";

export default function CustomerLayout() {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.08),transparent_45%),linear-gradient(180deg,#fff,#fff5f5)]">
      <Outlet />
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/92 px-2 py-2 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
          <Link
            to="/mobile"
            className={`flex flex-col items-center rounded-2xl px-2 py-2 text-[11px] ${
              isActive("/mobile") &&
              !location.pathname.includes("/stores") &&
              !location.pathname.includes("/products") &&
              !location.pathname.includes("/requests") &&
              !location.pathname.includes("/orders")
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground"
            }`}
          >
            <HomeIcon className="h-5 w-5" />
            <span>Asosiy</span>
          </Link>
          <Link
            to="/mobile/requests"
            className={`flex flex-col items-center rounded-2xl px-2 py-2 text-[11px] ${
              isActive("/mobile/requests") || isActive("/mobile/broadcast")
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground"
            }`}
          >
            <SendIcon className="h-5 w-5" />
            <span>So'rovlar</span>
          </Link>
          <Link
            to="/mobile/orders"
            className={`flex flex-col items-center rounded-2xl px-2 py-2 text-[11px] ${
              isActive("/mobile/orders")
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground"
            }`}
          >
            <ShoppingBagIcon className="h-5 w-5" />
            <span>Buyurtmalar</span>
          </Link>
          <Link
            to="/mobile/profile"
            className={`flex flex-col items-center rounded-2xl px-2 py-2 text-[11px] ${
              isActive("/mobile/profile")
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground"
            }`}
          >
            <UserIcon className="h-5 w-5" />
            <span>Profil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
