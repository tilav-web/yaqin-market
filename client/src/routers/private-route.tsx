import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken } from "../api/api";

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const token = getAccessToken();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
