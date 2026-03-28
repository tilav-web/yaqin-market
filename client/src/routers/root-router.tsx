import { createBrowserRouter, Navigate } from "react-router-dom";
import RootLayout from "../layouts/root-layout";
import { adminRouter } from "./admin-router";
import { customerRouter } from "./customer-router";
import { sellerRouter } from "./seller-router";
import { courierRouter } from "./courier-router";
import { sellerMobileRouter } from "./seller-mobile-router";
import { courierMobileRouter } from "./courier-mobile-router";
import Auth from "../pages/auth/auth";
import LandingPage from "../pages/landing";
import NotFoundPage from "../pages/not-found";
import PublicRoute from "./public-route";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        ),
      },
      ...customerRouter,
      ...sellerMobileRouter,
      ...courierMobileRouter,
      ...sellerRouter,
      ...courierRouter,
      ...adminRouter,
      {
        path: "/login",
        element: (
          <PublicRoute>
            <Auth />
          </PublicRoute>
        ),
      },
      {
        path: "/auth",
        element: <Navigate to="/login" replace />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
