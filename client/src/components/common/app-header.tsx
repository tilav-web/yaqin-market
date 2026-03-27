import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { HomeIcon, LogOutIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearTokens } from "@/api/api";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { getRoleHomePath, getRoleLabel, normalizePhone } from "@/lib/market";

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const me = useAuthStore((state) => state.me);
  const clearMe = useAuthStore((state) => state.clearMe);
  const homePath = getRoleHomePath(me?.role);
  const sectionLabel = location.pathname
    .split("/")
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");

  const handleLogout = () => {
    clearTokens();
    clearMe();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Link
          to={homePath}
          className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm sm:inline-flex"
        >
          <HomeIcon className="h-4 w-4" />
          Yaqin Market
        </Link>
        <div className="hidden md:block">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {getRoleLabel(me?.role)}
          </p>
          <p className="text-sm font-medium text-foreground">
            {sectionLabel || "Dashboard"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={cn(
            "hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground sm:flex",
          )}
        >
          <span>{me?.user?.first_name ?? "Foydalanuvchi"}</span>
          <span className="h-3 w-px bg-border" />
          <span className="text-foreground">{normalizePhone(me?.phone)}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOutIcon />
          Chiqish
        </Button>
      </div>
    </header>
  );
}
