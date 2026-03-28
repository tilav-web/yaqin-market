import type { RouteObject } from "react-router-dom";
import PrivateRoute from "./private-route";
import CourierMobileLayout from "../layouts/courier-mobile-layout";
import CourierOrders from "../pages/courier/orders/orders";

export const courierMobileRouter: RouteObject[] = [
  {
    path: "/mobile/courier",
    element: (
      <PrivateRoute roles={["COURIER"]}>
        <CourierMobileLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <CourierOrders />,
      },
      {
        path: "orders",
        element: <CourierOrders />,
      },
    ],
  },
];
