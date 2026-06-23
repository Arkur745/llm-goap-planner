import { Alert, Button, Stack, Typography } from "@mui/material";

import { APP_NAME } from "@shared/constants/app";

interface ErrorScreenProps {
  onReset: () => void;
}

export function ErrorScreen({ onReset }: ErrorScreenProps) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={2}
      sx={{ minHeight: "100dvh", px: 3 }}
    >
      <Alert severity="error" variant="filled" sx={{ maxWidth: 560, width: "100%" }}>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          {APP_NAME} failed to render
        </Typography>
        <Typography variant="body2">An unexpected application error occurred.</Typography>
      </Alert>
      <Button variant="contained" onClick={onReset}>
        Reload application
      </Button>
    </Stack>
  );
}
