import { Alert, Stack, Typography } from "@mui/material";

interface ErrorStateProps {
  title: string;
  description: string;
}

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
      <Alert severity="error" variant="outlined" sx={{ width: "100%", maxWidth: 640 }}>
        <Typography variant="subtitle1" component="div" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2">{description}</Typography>
      </Alert>
    </Stack>
  );
}
