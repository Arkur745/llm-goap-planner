import { Grid, Stack, Typography } from "@mui/material";

import { AppCard, AppCardContent, AppCardHeader } from "@shared/ui/components/card";
import type { PlannerMetadataItem } from "@features/planner/model/planner.models";

interface PlanMetadataProps {
  items: PlannerMetadataItem[];
}

export function PlanMetadata({ items }: PlanMetadataProps) {
  return (
    <AppCard variant="outlined">
      <AppCardHeader title="Plan metadata" subheader="Summary of the generated execution context" />
      <AppCardContent>
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.label}>
              <Stack spacing={0.5}>
                <Typography variant="overline" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {item.value}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </AppCardContent>
    </AppCard>
  );
}
