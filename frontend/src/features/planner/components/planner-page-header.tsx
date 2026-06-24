import { Stack, Typography } from "@mui/material";

interface PlannerPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PlannerPageHeader({ eyebrow, title, description }: PlannerPageHeaderProps) {
  return (
    <Stack spacing={1} sx={{ mb: "var(--spacing-xl)" }}>
      <Typography
        variant="caption"
        color="primary"
        fontWeight={600}
        letterSpacing="0.05em"
        sx={{ textTransform: "uppercase" }}
      >
        {eyebrow}
      </Typography>
      <Typography variant="h2" component="h1" fontWeight="var(--font-weight-bold)">
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" maxWidth={680} sx={{ mt: 1 }}>
        {description}
      </Typography>
    </Stack>
  );
}
