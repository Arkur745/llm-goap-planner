import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import { ROUTE_PATHS } from "@shared/constants/routes";
import { GlobalLayout } from "@app/layouts/global-layout";
import { GoalInputPage } from "@features/planner/pages/goal-input-page";
import { PlanResultPage } from "@features/planner/pages/plan-result-page";

const appRouter = createBrowserRouter([
  {
    path: ROUTE_PATHS.root,
    element: <GlobalLayout />,
    children: [
      {
        index: true,
        element: <Navigate to={ROUTE_PATHS.planner} replace />,
      },
      {
        path: ROUTE_PATHS.planner.slice(1),
        element: <GoalInputPage />,
      },
      {
        path: ROUTE_PATHS.plannerResult.slice(1),
        element: <PlanResultPage />,
      },
      {
        path: "*",
        element: <Navigate to={ROUTE_PATHS.planner} replace />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={appRouter} />;
}
