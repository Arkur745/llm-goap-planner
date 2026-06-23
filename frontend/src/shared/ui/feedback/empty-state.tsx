import { Stack, Typography } from "@mui/material";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1}
      sx={{ py: 8, textAlign: "center" }}
    >
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={520}>
        {description}
      </Typography>
    </Stack>
  );
}
