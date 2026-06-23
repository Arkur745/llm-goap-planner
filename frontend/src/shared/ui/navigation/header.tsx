import { IconButton, Stack, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

import { APP_NAME } from "@shared/constants/app";

export interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ width: "100%", px: 2, py: 1 }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        {onMenuClick ? (
          <IconButton aria-label="Open navigation drawer" onClick={onMenuClick} edge="start">
            <MenuIcon />
          </IconButton>
        ) : null}
        <Typography variant="h6" component="div" fontWeight={700}>
          {APP_NAME}
        </Typography>
      </Stack>
    </Stack>
  );
}
