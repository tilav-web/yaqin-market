import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { clearTokens, getAccessToken } from "@/api/api";
import FullPageLoader from "@/components/common/full-page-loader";
import { getRoleHomePath } from "@/lib/market";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export default function PublicRoute({ children }: { children: ReactNode }) {
  const token = getAccessToken();
  const me = useAuthStore((state) => state.me);
  const setMe = useAuthStore((state) => state.setMe);
  const clearMe = useAuthStore((state) => state.clearMe);
  const [isChecking, setIsChecking] = useState(Boolean(token) && !me);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
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

  if (token && isChecking) {
    return (
      <FullPageLoader
        title="Sessiya tiklanmoqda"
        description="Sizni mos panelga yo'naltiramiz..."
      />
    );
  }

  if (token && me) {
    return <Navigate to={getRoleHomePath(me.role)} replace />;
  }

  return <>{children}</>;
}
