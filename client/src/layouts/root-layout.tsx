import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { getAccessToken } from "@/api/api";
import { cn } from "@/lib/utils";

export default function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const setMe = useAuthStore((state) => state.setMe);
  const clearMe = useAuthStore((state) => state.clearMe);

  const getRoleRoute = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "/admin";
      case "SELLER":
        return "/seller";
      case "COURIER":
        return "/courier";
      default:
        return "/mobile";
    }
  };

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
        setMe(data);
        console.info(`${logPrefix} success`, data.role);
        
        const roleRoute = getRoleRoute(data.role);
        if (location.pathname === "/" || location.pathname === "/login") {
          navigate(roleRoute, { replace: true });
        }
      })
      .catch((error) => {
        console.error(`${logPrefix} error`, error);
        clearMe();
        navigate("/login");
      });
  }, [location.pathname, navigate, setMe, clearMe]);

  const isLoginRoute = location.pathname.startsWith("/login");

  return (
    <div
      className={cn(
        "min-h-screen",
        isLoginRoute
          ? "bg-white"
          : "bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.08),transparent_45%),linear-gradient(180deg,#fff,#fff5f5)]",
      )}
    >
      <Outlet />
    </div>
  );
}
