import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken } from "@/api/api";
import { useAuthStore } from "@/stores/auth.store";

interface AuthRequiredRouteProps {
  children: ReactNode;
  roles?: string[];
}

/**
 * Auth talab qiladigan sahifalar uchun.
 * Login qilmagan bo'lsa /login?returnTo=<current_path> ga yo'naltiradi.
 */
export default function AuthRequiredRoute({ children, roles }: AuthRequiredRouteProps) {
  const token = getAccessToken();
  const me = useAuthStore((state) => state.me);
  const location = useLocation();

  if (!token || !me) {
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  if (roles?.length && !roles.includes(me.role)) {
    return <Navigate to="/mobile" replace />;
  }

  return <>{children}</>;
}
