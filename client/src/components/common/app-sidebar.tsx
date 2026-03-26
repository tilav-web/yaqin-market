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
  BoxesIcon,
  LayoutGridIcon,
  StoreIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type SidebarLink = {
  label: string;
  to: string;
  icon: LucideIcon;
};

export type SidebarSection = {
  label: string;
  items: SidebarLink[];
};

const defaultSections: SidebarSection[] = [
  {
    label: "Boshqaruv",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutGridIcon },
      { label: "Mahsulotlar", to: "/admin/products", icon: BoxesIcon },
      { label: "Kategoriyalar", to: "/admin/categories", icon: BoxesIcon },
      { label: "Do'konlar", to: "/admin/stores", icon: StoreIcon },
    ],
  },
];

export default function AppSidebar({
  sections = defaultSections,
  footer,
}: {
  sections?: SidebarSection[];
  footer?: ReactNode;
}) {
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
        {sections.map((section, index) => (
          <div key={section.label}>
            <SidebarGroup>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarMenu>
                {section.items.map((item) => (
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
            {index < sections.length - 1 ? <SidebarSeparator /> : null}
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {footer ? (
          <div className="rounded-lg bg-sidebar-accent p-3 text-xs text-sidebar-foreground">
            {footer}
          </div>
        ) : (
          <div className="rounded-lg bg-sidebar-accent p-3 text-xs text-sidebar-foreground">
            Yaqin Market • 2026
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
