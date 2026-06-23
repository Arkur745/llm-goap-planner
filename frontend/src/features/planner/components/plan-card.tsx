import type { PropsWithChildren, ReactNode } from "react";
import { CardContent, Stack, Typography } from "@mui/material";

import { AppCard, AppCardHeader } from "@shared/ui/components/card";

export interface PlanCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PlanCard({ title, subtitle, action, children }: PlanCardProps) {
  return (
    <AppCard variant="outlined">
      <AppCardHeader
        title={title}
        subheader={subtitle}
        action={action}
        titleTypographyProps={{ fontWeight: 700 }}
      />
      <CardContent>
        <Stack spacing={2}>
          {children}
          {subtitle ? (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </AppCard>
  );
}
