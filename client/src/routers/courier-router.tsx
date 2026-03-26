import type { RouteObject } from "react-router-dom";
import PrivateRoute from "./private-route";
import CourierLayout from "../layouts/courier-layout";
import CourierDashboard from "../pages/courier/dashboard/dashboard";
import CourierOrders from "../pages/courier/orders/orders";

export const courierRouter: RouteObject[] = [
  {
    path: "/courier",
    element: (
      <PrivateRoute>
        <CourierLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <CourierDashboard />,
      },
      {
        path: "orders",
        element: <CourierOrders />,
      },
    ],
  },
];
