import { Navigate, type RouteObject } from "react-router-dom";
import CustomerLayout from "../layouts/customer-layout";
import PrivateRoute from "./private-route";
import CustomerHome from "../pages/customer/home/home";
import StoreDetail from "../pages/customer/stores/store-detail";
import CustomerOrders from "../pages/customer/orders/orders";
import CustomerOrderDetailPage from "../pages/customer/orders/order-detail";
import CustomerProfile from "../pages/customer/profile/profile";
import CustomerLocationsPage from "../pages/customer/locations/locations";
import CustomerWalletPage from "../pages/customer/wallet/wallet";
import ProductOffersPage from "../pages/customer/products/product-offers";
import CreateBroadcastRequestPage from "../pages/customer/broadcast/create-request";
import CustomerRequestsPage from "../pages/customer/requests/requests";
import BroadcastRequestDetailPage from "../pages/customer/requests/request-detail";
import ApplySellerPage from "../pages/customer/profile/apply-seller";
import ApplyCourierPage from "../pages/customer/profile/apply-courier";
import ConversationsPage from "../pages/customer/chat/conversations";
import ChatMessagesPage from "../pages/customer/chat/messages";

export const customerRouter: RouteObject[] = [
  {
    path: "/mobile",
    element: (
      <PrivateRoute roles={["CUSTOMER", "SELLER", "COURIER"]}>
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
      {
        path: "locations",
        element: <CustomerLocationsPage />,
      },
      {
        path: "wallet",
        element: <CustomerWalletPage />,
      },
      {
        path: "profile/seller-store",
        element: <Navigate to="/mobile/seller/store" replace />,
      },
      {
        path: "profile/courier-orders",
        element: <Navigate to="/mobile/courier/orders" replace />,
      },
      {
        path: "profile/apply-seller",
        element: <ApplySellerPage />,
      },
      {
        path: "profile/apply-courier",
        element: <ApplyCourierPage />,
      },
      {
        path: "chat",
        element: <ConversationsPage />,
      },
      {
        path: "chat/:id",
        element: <ChatMessagesPage />,
      },
    ],
  },
];
