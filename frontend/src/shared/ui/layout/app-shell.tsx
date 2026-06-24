import { AppBar, Box, Drawer, Toolbar } from "@mui/material";
import type { PropsWithChildren } from "react";

import { AppHeader } from "@shared/ui/navigation/header";
import { AppSidebar, type SidebarItem } from "@shared/ui/navigation/sidebar";

export interface AppShellProps extends PropsWithChildren {
  sidebarOpen?: boolean;
  onSidebarClose?: () => void;
  drawerWidth?: number;
  navigationItems?: SidebarItem[];
  sidebarTitle?: string;
}

export function AppShell({
  children,
  sidebarOpen = false,
  onSidebarClose,
  drawerWidth = 220,
  navigationItems,
  sidebarTitle,
}: AppShellProps) {
  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <AppBar position="fixed" color="transparent" elevation={0}>
        <Toolbar disableGutters>
          <AppHeader onMenuClick={onSidebarClose} />
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={onSidebarClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        <AppSidebar items={navigationItems} title={sidebarTitle} />
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
        }}
        open
      >
        <AppSidebar items={navigationItems} title={sidebarTitle} />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          display: "flex",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "1400px",
            px: { xs: 3, sm: 6, md: 8 },
            py: { xs: 4, md: 8 },
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Toolbar />
          {children}
        </Box>
      </Box>
    </Box>
  );
}
