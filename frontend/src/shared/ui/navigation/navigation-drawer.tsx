import { Drawer, type DrawerProps } from "@mui/material";

import { AppSidebar, type AppSidebarProps } from "@shared/ui/navigation/sidebar";

export interface NavigationDrawerProps extends Omit<DrawerProps, "children">, AppSidebarProps {}

export function NavigationDrawer({ items, title, ...drawerProps }: NavigationDrawerProps) {
  return (
    <Drawer {...drawerProps}>
      <AppSidebar items={items} title={title} />
    </Drawer>
  );
}
