import { CircularProgress, Stack, Typography } from "@mui/material";

import { APP_NAME } from "@shared/constants/app";

export function LoadingScreen() {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: "100dvh" }}>
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        Loading {APP_NAME}...
      </Typography>
    </Stack>
  );
}
