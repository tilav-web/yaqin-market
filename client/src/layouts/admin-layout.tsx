import { useState } from "react";
import {
  CalendarDaysIcon,
  LogOutIcon,
  MenuIcon,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { adminSections } from "@/components/common/sidebar-sections";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function LayoutNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {adminSections.map((section) => (
        <div key={section.label} className="space-y-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {section.label}
          </p>
          <div className="space-y-1.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to));

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-[1.3rem] px-3.5 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-[linear-gradient(135deg,rgba(220,38,38,0.12),rgba(255,255,255,0.92))] text-slate-950 shadow-[0_20px_40px_-28px_rgba(220,38,38,0.45)]"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-900",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-[1rem] border transition",
                      isActive
                        ? "border-primary/15 bg-primary text-primary-foreground"
                        : "border-slate-200 bg-white text-slate-500 group-hover:border-primary/12 group-hover:text-primary",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate">{item.label}</p>
                    <p className="truncate text-xs text-slate-400">
                      {item.to === "/admin" ? "Asosiy ko'rinish" : "Boshqaruv bo'limi"}
                    </p>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export default function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const clearMe = useAuthStore((state) => state.clearMe);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      clearMe();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.1),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_24%),linear-gradient(180deg,#fff8f8,#ffffff_55%,#fff5f6)]">
      <div className="mx-auto flex min-h-screen max-w-[1680px] gap-5 px-4 py-4 sm:px-5 lg:px-6">
        <aside className="hidden w-[290px] shrink-0 lg:block">
          <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-[2.2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,246,247,0.96))] p-5 shadow-[0_30px_90px_-54px_rgba(15,23,42,0.3)]">
            <Link
              to="/admin"
              className="flex items-center gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/90 px-4 py-3"
            >
              <img src="/logo-mobile.png" alt="Yaqin Market" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-sm font-semibold text-slate-950">Yaqin Market</p>
                <p className="text-xs text-slate-500">Super admin workspace</p>
              </div>
            </Link>

            <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
              <LayoutNav pathname={location.pathname} />
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white/90 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <CalendarDaysIcon className="h-3.5 w-3.5" />
                Bugun
              </div>
              <p className="mt-2 text-sm font-medium text-slate-950">
                {dateFormatter.format(new Date())}
              </p>
            </div>

            <Button
              variant="outline"
              className="mt-4 h-11 rounded-[1.2rem] justify-start"
              onClick={handleLogout}
            >
              <LogOutIcon />
              Tizimdan chiqish
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <main className="px-1 py-4 sm:px-0 sm:py-6">
            <div className="mb-4 flex lg:hidden">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-[1rem] bg-white/92"
                onClick={() => setMobileNavOpen(true)}
              >
                <MenuIcon className="h-4.5 w-4.5" />
              </Button>
            </div>
            <Outlet />
          </main>
        </div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-sm border-r border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(255,246,247,0.98))] p-0">
          <SheetHeader className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-center gap-3">
              <img src="/logo-mobile.png" alt="Yaqin Market" className="h-11 w-11 object-contain" />
              <div>
                <SheetTitle>Super admin</SheetTitle>
                <SheetDescription>Asosiy bo'limlar bo'yicha tezkor navigatsiya</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 px-5 py-5">
            <LayoutNav pathname={location.pathname} onNavigate={() => setMobileNavOpen(false)} />
            <Button
              variant="outline"
              className="h-11 w-full rounded-[1.1rem] justify-start"
              onClick={handleLogout}
            >
              <LogOutIcon />
              Tizimdan chiqish
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
