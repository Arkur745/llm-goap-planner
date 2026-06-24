import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

export interface SidebarItem {
  label: string;
  icon?: ReactNode;
  iconName?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface AppSidebarProps {
  items?: SidebarItem[];
  title?: string;
}

// Native inline SVGs to bypass React 19 / MUI SvgIcon context bugs
const HomeIconSvg = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ minWidth: "18px" }}
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const GoalIconSvg = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ minWidth: "18px" }}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ResultIconSvg = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ minWidth: "18px" }}
  >
    <path d="M6 3v12" />
    <path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <path d="M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
    <path d="M6 12h9a3 3 0 0 0 3-3" />
  </svg>
);

const defaultItems: SidebarItem[] = [{ label: "Dashboard", icon: <HomeIconSvg /> }];

export function AppSidebar({ items = defaultItems, title = "Navigation" }: AppSidebarProps) {
  return (
    <Stack spacing={1.5} sx={{ p: 2, pt: 3.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        letterSpacing="0.08em"
        sx={{ textTransform: "uppercase", px: 1, opacity: 0.6 }}
      >
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
              sx={{ mb: "var(--spacing-xs)" }}
            >
              {item.iconName === "goal" ? (
                <ListItemIcon sx={{ minWidth: "32px" }}>
                  <GoalIconSvg />
                </ListItemIcon>
              ) : item.iconName === "result" ? (
                <ListItemIcon sx={{ minWidth: "32px" }}>
                  <ResultIconSvg />
                </ListItemIcon>
              ) : item.icon ? (
                <ListItemIcon sx={{ minWidth: "32px" }}>{item.icon}</ListItemIcon>
              ) : null}
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Stack>
  );
}
