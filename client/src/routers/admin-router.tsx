import type { RouteObject } from "react-router-dom";
import AdminLayout from "../layouts/admin-layout";
import PrivateRoute from "./private-route";
import AdminDashboard from "../pages/admin/dashboard/dashboard";
import AdminProducts from "../pages/admin/products/products";
import AdminCategories from "../pages/admin/categories/categories";
import AdminStores from "../pages/admin/stores/stores";
import AdminUsersPage from "../pages/admin/users/users";

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
        element: <AdminCategories />,
      },
      {
        path: "stores",
        element: <AdminStores />,
      },
      {
        path: "users",
        element: <AdminUsersPage />,
      },
    ],
  },
];
