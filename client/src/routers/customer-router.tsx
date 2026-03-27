import type { RouteObject } from "react-router-dom";
import CustomerLayout from "../layouts/customer-layout";
import PrivateRoute from "./private-route";
import CustomerHome from "../pages/customer/home/home";
import StoreDetail from "../pages/customer/stores/store-detail";
import CustomerOrders from "../pages/customer/orders/orders";
import CustomerOrderDetailPage from "../pages/customer/orders/order-detail";
import CustomerProfile from "../pages/customer/profile/profile";
import ProductOffersPage from "../pages/customer/products/product-offers";
import CreateBroadcastRequestPage from "../pages/customer/broadcast/create-request";
import CustomerRequestsPage from "../pages/customer/requests/requests";
import BroadcastRequestDetailPage from "../pages/customer/requests/request-detail";

export const customerRouter: RouteObject[] = [
  {
    path: "/mobile",
    element: (
      <PrivateRoute roles={["CUSTOMER"]}>
        <CustomerLayout />
      </PrivateRoute>
    ),
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
        path: "orders/:id",
        element: <CustomerOrderDetailPage />,
      },
      {
        path: "products/:productId",
        element: <ProductOffersPage />,
      },
      {
        path: "broadcast/new",
        element: <CreateBroadcastRequestPage />,
      },
      {
        path: "requests",
        element: <CustomerRequestsPage />,
      },
      {
        path: "requests/:id",
        element: <BroadcastRequestDetailPage />,
      },
      {
        path: "profile",
        element: <CustomerProfile />,
      },
    ],
  },
];
