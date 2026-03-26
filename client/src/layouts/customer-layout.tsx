import { Link, Outlet, useLocation } from "react-router-dom";
import { HomeIcon, ShoppingBagIcon, UserIcon } from "lucide-react";

export default function CustomerLayout() {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.08),transparent_45%),linear-gradient(180deg,#fff,#fff5f5)]">
      <Outlet />
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/90 backdrop-blur flex justify-around py-2 safe-area-pb">
        <Link
          to="/mobile"
          className={`flex flex-col items-center text-[11px] ${
            isActive("/mobile") &&
            !location.pathname.includes("/stores") &&
            !location.pathname.includes("/orders")
              ? "text-primary font-semibold"
              : "text-muted-foreground"
          }`}
        >
          <HomeIcon className="h-5 w-5" />
          <span>Asosiy</span>
        </Link>
        <Link
          to="/mobile/orders"
          className={`flex flex-col items-center text-[11px] ${
            isActive("/mobile/orders")
              ? "text-primary font-semibold"
              : "text-muted-foreground"
          }`}
        >
          <ShoppingBagIcon className="h-5 w-5" />
          <span>Buyurtmalar</span>
        </Link>
        <Link
          to="/mobile/profile"
          className={`flex flex-col items-center text-[11px] ${
            isActive("/mobile/profile")
              ? "text-primary font-semibold"
              : "text-muted-foreground"
          }`}
        >
          <UserIcon className="h-5 w-5" />
          <span>Profil</span>
        </Link>
      </nav>
    </div>
  );
}
