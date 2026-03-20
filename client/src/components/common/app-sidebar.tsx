import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  BarChart3Icon,
  BoxesIcon,
  LayoutGridIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const primaryLinks = [
  { label: "Dashboard", to: "/", icon: LayoutGridIcon },
  { label: "Buyurtmalar", to: "/orders", icon: ShoppingBagIcon },
  { label: "Mahsulotlar", to: "/products", icon: BoxesIcon },
  { label: "Mijozlar", to: "/customers", icon: UsersIcon },
];

export default function AppSidebar() {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex w-full items-center justify-center">
          <img
            src="/logo-web.png"
            alt="Yaqin Market"
            className="w-full object-contain group-data-[state=collapsed]:hidden"
          />
          <img
            src="/logo-mobile.png"
            alt="Yaqin Market"
            className="hidden w-full object-contain group-data-[state=collapsed]:block"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin bo'limlar</SidebarGroupLabel>
          <SidebarMenu>
            {primaryLinks.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  render={
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "flex w-full items-center gap-2",
                          isActive && "text-primary",
                        )
                      }
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  }
                />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Analitika</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <div className="flex items-center gap-2">
                    <BarChart3Icon className="size-4" />
                    <span>Hisobotlar</span>
                  </div>
                }
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="size-4" />
                    <span>Moderatsiya</span>
                  </div>
                }
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="size-4" />
                    <span>Sozlamalar</span>
                  </div>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-lg bg-sidebar-accent p-3 text-xs text-sidebar-foreground">
          footer
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
