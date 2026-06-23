import { AppBar, Box, Drawer, Toolbar } from "@mui/material";
import type { PropsWithChildren } from "react";

import { AppHeader } from "@shared/ui/navigation/header";
import { AppSidebar } from "@shared/ui/navigation/sidebar";

export interface AppShellProps extends PropsWithChildren {
  sidebarOpen?: boolean;
  onSidebarClose?: () => void;
  drawerWidth?: number;
}

export function AppShell({
  children,
  sidebarOpen = false,
  onSidebarClose,
  drawerWidth = 280,
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
        <AppSidebar />
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
        <AppSidebar />
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
