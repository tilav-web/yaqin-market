import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTelegramMiniApp } from "@/hooks/use-telegram-mini-app";

export default function RootLayout() {
  const location = useLocation();
  const isLoginRoute = location.pathname.startsWith("/login");
  const isDashboardRoute = /^\/admin(\/|$)/.test(location.pathname);
  useTelegramMiniApp();

  return (
    <div
      className={cn(
        "min-h-[100dvh]",
        isLoginRoute
          ? "bg-white"
          : isDashboardRoute
            ? "bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.08),transparent_45%),linear-gradient(180deg,#fff,#fff5f5)]",
      )}
      style={{
        paddingTop: "var(--tg-content-safe-top, env(safe-area-inset-top, 0px))",
        paddingRight:
          "var(--tg-content-safe-right, env(safe-area-inset-right, 0px))",
        paddingBottom:
          "var(--tg-content-safe-bottom, env(safe-area-inset-bottom, 0px))",
        paddingLeft:
          "var(--tg-content-safe-left, env(safe-area-inset-left, 0px))",
      }}
    >
      <Outlet />
    </div>
  );
}
