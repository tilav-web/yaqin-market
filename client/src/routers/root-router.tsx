import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layouts/root-layout";
import { authRouter } from "./auth-router";
import Home from "../pages/home";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    loader: () => {},
    children: [
      { index: true, element: <Home /> },
      ...authRouter,
    ],
  },
]);
