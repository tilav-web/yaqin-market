import { Navigate, type RouteObject } from "react-router-dom";
import PrivateRoute from "./private-route";

export const sellerRouter: RouteObject[] = [
  {
    path: "/seller/*",
    element: (
      <PrivateRoute roles={["SELLER"]}>
        <Navigate to="/mobile/seller/store" replace />
      </PrivateRoute>
    ),
  },
];
