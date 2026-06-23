import CircularProgress, { type CircularProgressProps } from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";

export type AppSpinnerProps = CircularProgressProps;

export function AppSpinner(props: AppSpinnerProps) {
  return <CircularProgress {...props} />;
}

export function SpinnerCenter() {
  return (
    <Stack alignItems="center" justifyContent="center">
      <CircularProgress />
    </Stack>
  );
}
