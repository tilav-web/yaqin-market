import { Navigate, type RouteObject } from "react-router-dom";
import CustomerLayout from "../layouts/customer-layout";
import AuthRequiredRoute from "./auth-required-route";
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
import HelpPage from "../pages/customer/help/help";
import AboutPage from "../pages/customer/about/about";
import EditProfilePage from "../pages/customer/profile/edit-profile";
import StoresMapPage from "../pages/customer/stores/stores-map";

import type { ReactElement } from "react";

// Faqat auth talab qiladigan route larni Auth bilan o'raymiz
function auth(element: ReactElement) {
  return <AuthRequiredRoute>{element}</AuthRequiredRoute>;
}

export const customerRouter: RouteObject[] = [
  {
    path: "/mobile",
    // Layout o'zi ochiq — auth shart emas
    element: <CustomerLayout />,
    children: [
      // === PUBLIC ===
      { index: true, element: <CustomerHome /> },
      { path: "stores/:id", element: <StoreDetail /> },
      { path: "products/:productId", element: <ProductOffersPage /> },

      // === AUTH REQUIRED ===
      { path: "orders", element: auth(<CustomerOrders />) },
      { path: "orders/:id", element: auth(<CustomerOrderDetailPage />) },
      { path: "broadcast/new", element: auth(<CreateBroadcastRequestPage />) },
      { path: "requests", element: auth(<CustomerRequestsPage />) },
      { path: "requests/:id", element: auth(<BroadcastRequestDetailPage />) },
      { path: "profile", element: auth(<CustomerProfile />) },
      { path: "locations", element: auth(<CustomerLocationsPage />) },
      { path: "wallet", element: auth(<CustomerWalletPage />) },
      { path: "chat", element: auth(<ConversationsPage />) },
      { path: "chat/:id", element: auth(<ChatMessagesPage />) },
      { path: "profile/apply-seller", element: auth(<ApplySellerPage />) },
      { path: "profile/apply-courier", element: auth(<ApplyCourierPage />) },
      { path: "profile/edit", element: auth(<EditProfilePage />) },
      { path: "stores-map", element: <StoresMapPage /> },

      // === PUBLIC INFO ===
      { path: "help", element: <HelpPage /> },
      { path: "about", element: <AboutPage /> },

      // Redirects
      { path: "profile/seller-store", element: <Navigate to="/mobile/seller/store" replace /> },
      { path: "profile/courier-orders", element: <Navigate to="/mobile/courier/orders" replace /> },
    ],
  },
];
