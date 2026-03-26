import { Navigate } from "react-router-dom";
import Auth from "../pages/auth/auth";

export const authRouter = [
  {
    path: "/login",
    element: <Auth />,
  },
  {
    path: "/auth",
    element: <Navigate to="/login" replace />,
  },
];
