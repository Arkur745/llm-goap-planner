import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Box } from "@mui/material";

import { ROUTE_PATHS } from "@shared/constants/routes";
import { useBoolean } from "@shared/hooks/use-boolean";
import { AppShell } from "@shared/ui/layout/app-shell";
import type { SidebarItem } from "@shared/ui/navigation/sidebar";
import { SoftAurora } from "@shared/ui/visualization/soft-aurora";
import { useThemeMode } from "@shared/hooks/use-theme-mode";

export function GlobalLayout() {
  const { value: sidebarOpen, toggle: toggleSidebar } = useBoolean();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode } = useThemeMode();

  const navigationItems: SidebarItem[] = useMemo(
    () => [
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
    ],
    [location.pathname, navigate],
  );

  return (
    <Box sx={{ position: "relative", minHeight: "100dvh" }}>
      {/* Background Aurora */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: isDarkMode ? 0.6 : 0.35,
          transition: "opacity 0.5s ease-in-out",
        }}
      >
        <SoftAurora
          speed={0.3}
          scale={1.2}
          brightness={isDarkMode ? 0.8 : 0.4}
          color1={isDarkMode ? "#8b5cf6" : "#4f46e5"}
          color2={isDarkMode ? "#22d3ee" : "#0891b2"}
          noiseFrequency={2.0}
          noiseAmplitude={0.8}
          bandHeight={0.6}
          bandSpread={0.8}
          enableMouseInteraction={true}
          mouseInfluence={0.2}
        />
      </Box>

      {/* Main App Layout */}
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <AppShell
          sidebarOpen={sidebarOpen}
          onSidebarClose={toggleSidebar}
          navigationItems={navigationItems}
          sidebarTitle="Planner"
        >
          <Outlet />
        </AppShell>
      </Box>
    </Box>
  );
}

