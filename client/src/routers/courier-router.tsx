import { Navigate, type RouteObject } from "react-router-dom";
import PrivateRoute from "./private-route";

export const courierRouter: RouteObject[] = [
  {
    path: "/courier/*",
    element: (
      <PrivateRoute roles={["COURIER"]}>
        <Navigate to="/mobile/courier/orders" replace />
      </PrivateRoute>
    ),
  },
];
