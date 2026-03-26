import { Outlet } from "react-router-dom";
import AppHeader from "@/components/common/app-header";
import AppSidebar from "@/components/common/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { courierSections } from "@/components/common/sidebar-sections";

export default function CourierLayout() {
  return (
    <SidebarProvider>
      <AppSidebar sections={courierSections} />
      <SidebarInset className="min-h-svh">
        <AppHeader />
        <main className="px-6 py-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
