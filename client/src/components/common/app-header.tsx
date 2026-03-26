import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { BellIcon, LogOutIcon, SearchIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "@/api/api";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

export default function AppHeader() {
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.me);
  const clearMe = useAuthStore((state) => state.clearMe);

  const roleLabel = (role?: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Admin";
      case "SELLER":
        return "Seller";
      case "COURIER":
        return "Courier";
      default:
        return "Mijoz";
    }
  };

  const handleLogout = () => {
    clearTokens();
    clearMe();
    navigate("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Search">
          <SearchIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Notifications">
          <BellIcon />
        </Button>
        <div
          className={cn(
            "hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground sm:flex",
          )}
        >
          <span>{me?.user?.first_name ?? me?.phone ?? "Foydalanuvchi"}</span>
          <span className="h-3 w-px bg-border" />
          <span className="text-foreground">{roleLabel(me?.role)}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOutIcon />
          Chiqish
        </Button>
      </div>
    </header>
  );
}
