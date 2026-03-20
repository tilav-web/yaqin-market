import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { clearTokens, getAccessToken } from "@/api/api";
import AppHeader from "@/components/common/app-header";
import AppSidebar from "@/components/common/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const setMe = useAuthStore((state) => state.setMe);
  const clearMe = useAuthStore((state) => state.clearMe);

  useEffect(() => {
    const isLoginRoute = location.pathname.startsWith("/login");
    if (isLoginRoute) return;

    const token = getAccessToken();
    if (!token) {
      clearMe();
      navigate("/login");
      return;
    }

    const logPrefix = "[auth/findMe]";
    console.info(`${logPrefix} start`);

    authService
      .findMe()
      .then((data) => {
        if (data.role !== "SUPER_ADMIN") {
          console.warn(`${logPrefix} role mismatch`, data.role);
          clearMe();
          clearTokens();
          navigate("/login");
          return;
        }
        setMe(data);
        console.info(`${logPrefix} success`);
      })
      .catch((error) => {
        console.error(`${logPrefix} error`, error);
        clearMe();
        navigate("/login");
      });
  }, [location.pathname, navigate, setMe, clearMe]);

  const isLoginRoute = location.pathname.startsWith("/login");

  if (isLoginRoute) {
    return (
      <div className="min-h-screen">
        <Outlet />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh">
        <AppHeader />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
