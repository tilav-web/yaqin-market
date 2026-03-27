import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function RootLayout() {
  const location = useLocation();
  const isLoginRoute = location.pathname.startsWith("/login");
  const isDashboardRoute = /^\/(admin|seller|courier)(\/|$)/.test(location.pathname);

  return (
    <div
      className={cn(
        "min-h-screen",
        isLoginRoute
          ? "bg-white"
          : isDashboardRoute
            ? "bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.08),transparent_45%),linear-gradient(180deg,#fff,#fff5f5)]",
      )}
    >
      <Outlet />
    </div>
  );
}
