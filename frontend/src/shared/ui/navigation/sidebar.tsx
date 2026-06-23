import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import type { ReactNode } from "react";

export interface SidebarItem {
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface AppSidebarProps {
  items?: SidebarItem[];
  title?: string;
}

const defaultItems: SidebarItem[] = [{ label: "Dashboard", icon: <HomeIcon /> }];

export function AppSidebar({ items = defaultItems, title = "Navigation" }: AppSidebarProps) {
  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      <Box component="nav" aria-label={title}>
        <List disablePadding>
          {items.map((item) => (
            <ListItemButton
              key={item.label}
              selected={item.selected}
              disabled={item.disabled}
              onClick={item.onClick}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              {item.icon ? <ListItemIcon>{item.icon}</ListItemIcon> : null}
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Stack>
  );
}
