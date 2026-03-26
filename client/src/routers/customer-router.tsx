import type { RouteObject } from "react-router-dom";
import CustomerLayout from "../layouts/customer-layout";
import CustomerHome from "../pages/customer/home/home";
import StoreDetail from "../pages/customer/stores/store-detail";
import CustomerOrders from "../pages/customer/orders/orders";
import CustomerProfile from "../pages/customer/profile/profile";

export const customerRouter: RouteObject[] = [
  {
    path: "/mobile",
    element: <CustomerLayout />,
    children: [
      {
        index: true,
        element: <CustomerHome />,
      },
      {
        path: "stores/:id",
        element: <StoreDetail />,
      },
      {
        path: "orders",
        element: <CustomerOrders />,
      },
      {
        path: "profile",
        element: <CustomerProfile />,
      },
    ],
  },
];
