import { Stack, Typography } from "@mui/material";

import { AppSkeleton } from "@shared/ui/components/skeleton";
import { AppSpinner } from "@shared/ui/components/spinner";

export function PlannerLoadingState() {
  return (
    <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ py: 10 }}>
      <AppSpinner />
      <Typography variant="h6" component="h2" fontWeight={700}>
        Generating plan
      </Typography>
      <Typography variant="body2" color="text.secondary">
        The backend is processing the goal and preparing the execution plan.
      </Typography>
      <Stack spacing={1.5} sx={{ width: "100%", maxWidth: 720 }}>
        <AppSkeleton variant="rounded" height={96} />
        <AppSkeleton variant="rounded" height={96} />
        <AppSkeleton variant="rounded" height={180} />
      </Stack>
    </Stack>
  );
}
