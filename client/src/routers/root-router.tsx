import { createBrowserRouter, Navigate } from "react-router-dom";
import RootLayout from "../layouts/root-layout";
import { adminRouter } from "./admin-router";
import { customerRouter } from "./customer-router";
import { sellerRouter } from "./seller-router";
import { courierRouter } from "./courier-router";
import Auth from "../pages/auth/auth";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      ...customerRouter,
      ...sellerRouter,
      ...courierRouter,
      ...adminRouter,
      {
        path: "/login",
        element: <Auth />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
