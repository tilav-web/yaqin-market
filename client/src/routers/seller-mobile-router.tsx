import type { RouteObject } from "react-router-dom";
import PrivateRoute from "./private-route";
import SellerMobileLayout from "../layouts/seller-mobile-layout";
import SellerStore from "../pages/seller/store/store";
import SellerProducts from "../pages/seller/products/products";
import SellerOrders from "../pages/seller/orders/orders";
import SellerRequestsPage from "../pages/seller/requests/requests";

export const sellerMobileRouter: RouteObject[] = [
  {
    path: "/mobile/seller",
    element: (
      <PrivateRoute roles={["SELLER"]}>
        <SellerMobileLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <SellerStore />,
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
      {
        path: "requests",
        element: <SellerRequestsPage />,
      },
    ],
  },
];
