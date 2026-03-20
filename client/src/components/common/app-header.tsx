import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { BellIcon, LogOutIcon, SearchIcon } from "lucide-react";

export default function AppHeader() {
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
        <Button variant="outline" size="sm">
          <LogOutIcon />
          Chiqish
        </Button>
      </div>
    </header>
  );
}
