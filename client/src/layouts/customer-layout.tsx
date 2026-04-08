import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { HomeIcon, MessageCircleIcon, ShoppingBagIcon, SendIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/lang.context";
import type { TranslationKey } from "@/lib/translations";

type CustomerTab = "home" | "requests" | "orders" | "chat" | "profile";

const tabs: Array<{
  key: CustomerTab;
  labelKey: TranslationKey;
  to: string;
  icon: typeof HomeIcon;
}> = [
  { key: "home", labelKey: "tab_home", to: "/mobile", icon: HomeIcon },
  { key: "requests", labelKey: "tab_requests", to: "/mobile/requests", icon: SendIcon },
  { key: "orders", labelKey: "tab_orders", to: "/mobile/orders", icon: ShoppingBagIcon },
  { key: "chat", labelKey: "tab_chat", to: "/mobile/chat", icon: MessageCircleIcon },
  { key: "profile", labelKey: "tab_profile", to: "/mobile/profile", icon: UserIcon },
];

export default function CustomerLayout() {
  const location = useLocation();
  const { tr } = useLang();

  const activeTab = useMemo<CustomerTab>(() => {
    const path = location.pathname;

    if (path.startsWith("/mobile/requests") || path.startsWith("/mobile/broadcast")) {
      return "requests";
    }

    if (path.startsWith("/mobile/orders")) {
      return "orders";
    }

    if (path.startsWith("/mobile/chat")) {
      return "chat";
    }

    if (
      path.startsWith("/mobile/profile") ||
      path.startsWith("/mobile/locations") ||
      path.startsWith("/mobile/wallet")
    ) {
      return "profile";
    }

    return "home";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.11),transparent_44%),linear-gradient(180deg,#fff8f8,#ffffff_58%,#fff4f5)]">
      <Outlet />

      <nav className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/70 bg-white/88 p-2 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl">
          <div className="grid grid-cols-5 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  viewTransition
                  className={cn(
                    "group relative overflow-hidden rounded-[1.45rem] px-2 py-2.5 text-center transition-all duration-300 active:scale-[0.98]",
                    isActive ? "text-slate-950" : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-0 rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,242,244,0.95))] opacity-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-300",
                      isActive && "opacity-100",
                    )}
                  />
                  <span
                    className={cn(
                      "absolute inset-x-5 top-1 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-0 transition-opacity duration-300",
                      isActive && "opacity-100",
                    )}
                  />

                  <span className="relative flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_14px_24px_-14px_rgba(220,38,38,0.6)]"
                          : "bg-transparent text-current group-hover:bg-slate-100",
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold transition-all duration-300",
                        isActive ? "translate-y-0" : "translate-y-0.5",
                      )}
                    >
                      {tr(tab.labelKey)}
                    </span>
                    <span
                      className={cn(
                        "h-1 w-1 rounded-full bg-primary opacity-0 transition-all duration-300",
                        isActive && "opacity-100",
                      )}
                    />
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
