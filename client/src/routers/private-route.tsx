import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { clearTokens, getAccessToken } from "@/api/api";
import FullPageLoader from "@/components/common/full-page-loader";
import { getRoleHomePath } from "@/lib/market";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import type { AuthRole } from "@/types/auth-role.type";

interface PrivateRouteProps {
  children: ReactNode;
  roles?: AuthRole[];
}

export default function PrivateRoute({ children, roles }: PrivateRouteProps) {
  const token = getAccessToken();
  const me = useAuthStore((state) => state.me);
  const setMe = useAuthStore((state) => state.setMe);
  const clearMe = useAuthStore((state) => state.clearMe);
  const [isChecking, setIsChecking] = useState(Boolean(token) && !me);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      clearMe();
      setIsChecking(false);
      return;
    }

    if (me) {
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    authService
      .findMe()
      .then((nextMe) => {
        if (cancelled) return;
        setMe(nextMe);
      })
      .catch(() => {
        if (cancelled) return;
        clearTokens();
        clearMe();
      })
      .finally(() => {
        if (!cancelled) {
          setIsChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearMe, me, setMe, token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isChecking) {
    return (
      <FullPageLoader
        title="Sessiya tekshirilmoqda"
        description="Ruxsatlar va foydalanuvchi ma'lumotlari yuklanmoqda..."
      />
    );
  }

  if (!me) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(me.role)) {
    return <Navigate to={getRoleHomePath(me.role)} replace />;
  }

  return <>{children}</>;
}
