import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ROUTE_PATHS } from "@shared/constants/routes";
import { GlobalLayout } from "@app/layouts/global-layout";

const appRouter = createBrowserRouter([
  {
    path: ROUTE_PATHS.root,
    element: <GlobalLayout />,
    children: [
      {
        index: true,
        element: null,
      },
      {
        path: "*",
        element: null,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={appRouter} />;
}
