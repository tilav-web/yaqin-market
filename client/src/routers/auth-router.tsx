import type { RouteObject } from "react-router-dom";
import AuthLayout from "../layouts/auth-layout";
import Auth from "../pages/auth/auth";

export const authRouter: RouteObject[] = [
  {
    path: "/login",
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <Auth />,
      },
    ],
  },
];
