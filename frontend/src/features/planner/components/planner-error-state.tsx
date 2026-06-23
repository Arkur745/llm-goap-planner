import { Stack, Typography } from "@mui/material";

import { AppAlert } from "@shared/ui/components/alert";
import { AppButton } from "@shared/ui/components/button";

interface PlannerErrorStateProps {
  title: string;
  description: string;
  onRetry: () => void;
  onStartOver: () => void;
}

export function PlannerErrorState({
  title,
  description,
  onRetry,
  onStartOver,
}: PlannerErrorStateProps) {
  return (
    <Stack spacing={3} alignItems="center" sx={{ py: 8 }}>
      <AppAlert severity="error" variant="outlined" sx={{ width: "100%", maxWidth: 720 }}>
        <Typography variant="subtitle1" component="div" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2">{description}</Typography>
      </AppAlert>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <AppButton variant="contained" onClick={onRetry}>
          Retry
        </AppButton>
        <AppButton variant="outlined" onClick={onStartOver}>
          Start over
        </AppButton>
      </Stack>
    </Stack>
  );
}
