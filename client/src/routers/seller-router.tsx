import type { RouteObject } from "react-router-dom";
import PrivateRoute from "./private-route";
import SellerLayout from "../layouts/seller-layout";
import SellerDashboard from "../pages/seller/dashboard/dashboard";
import SellerStore from "../pages/seller/store/store";
import SellerProducts from "../pages/seller/products/products";
import SellerOrders from "../pages/seller/orders/orders";
import SellerRequestsPage from "../pages/seller/requests/requests";
import SellerSettings from "../pages/seller/settings/settings";

export const sellerRouter: RouteObject[] = [
  {
    path: "/seller",
    element: (
      <PrivateRoute roles={["SELLER"]}>
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
      {
        path: "requests",
        element: <SellerRequestsPage />,
      },
      {
        path: "settings",
        element: <SellerSettings />,
      },
    ],
  },
];
