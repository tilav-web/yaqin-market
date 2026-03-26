import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/common/app-sidebar";
import AppHeader from "@/components/common/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { sellerSections } from "@/components/common/sidebar-sections";

export default function SellerLayout() {
  return (
    <SidebarProvider>
      <AppSidebar sections={sellerSections} />
      <SidebarInset className="min-h-svh">
        <AppHeader />
        <main className="px-6 py-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
