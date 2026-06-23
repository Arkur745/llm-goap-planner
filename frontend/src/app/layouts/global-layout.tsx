import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { ROUTE_PATHS } from "@shared/constants/routes";
import { useBoolean } from "@shared/hooks/use-boolean";
import { AppShell } from "@shared/ui/layout/app-shell";
import type { SidebarItem } from "@shared/ui/navigation/sidebar";

export function GlobalLayout() {
  const { value: sidebarOpen, toggle: toggleSidebar } = useBoolean();
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems: SidebarItem[] = [
    {
      label: "Goal Input",
      selected: location.pathname === ROUTE_PATHS.planner,
      onClick: () => navigate(ROUTE_PATHS.planner),
    },
    {
      label: "Plan Result",
      selected: location.pathname === ROUTE_PATHS.plannerResult,
      onClick: () => navigate(ROUTE_PATHS.plannerResult),
    },
  ];

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      onSidebarClose={toggleSidebar}
      navigationItems={navigationItems}
      sidebarTitle="Planner"
    >
      <Outlet />
    </AppShell>
  );
}
