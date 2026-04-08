import { Navigate, type RouteObject } from "react-router-dom";
import AdminLayout from "../layouts/admin-layout";
import PrivateRoute from "./private-route";
import AdminDashboard from "../pages/admin/dashboard/dashboard";
import AdminProducts from "../pages/admin/products/products";
import AdminStores from "../pages/admin/stores/stores";
import AdminUsersPage from "../pages/admin/users/users";
import AdminProfilePage from "../pages/admin/profile/profile";
import AdminApplicationsPage from "../pages/admin/applications/applications";
import AdminUnitsPage from "../pages/admin/units/units";

export const adminRouter: RouteObject[] = [
  {
    path: "/admin",
    element: (
      <PrivateRoute roles={["SUPER_ADMIN"]}>
        <AdminLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: "products",
        element: <AdminProducts />,
      },
      {
        path: "categories",
        element: <Navigate to="/admin/products" replace />,
      },
      {
        path: "stores",
        element: <AdminStores />,
      },
      {
        path: "users",
        element: <AdminUsersPage />,
      },
      {
        path: "units",
        element: <AdminUnitsPage />,
      },
      {
        path: "applications",
        element: <AdminApplicationsPage />,
      },
      {
        path: "profile",
        element: <AdminProfilePage />,
      },
    ],
  },
];
