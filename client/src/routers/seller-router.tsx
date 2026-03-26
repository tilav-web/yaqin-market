import type { RouteObject } from "react-router-dom";
import PrivateRoute from "./private-route";
import SellerLayout from "../layouts/seller-layout";
import SellerDashboard from "../pages/seller/dashboard/dashboard";
import SellerStore from "../pages/seller/store/store";
import SellerProducts from "../pages/seller/products/products";
import SellerOrders from "../pages/seller/orders/orders";

export const sellerRouter: RouteObject[] = [
  {
    path: "/seller",
    element: (
      <PrivateRoute>
        <SellerLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <SellerDashboard />,
      },
      {
        path: "store",
        element: <SellerStore />,
      },
      {
        path: "products",
        element: <SellerProducts />,
      },
      {
        path: "orders",
        element: <SellerOrders />,
      },
    ],
  },
];
