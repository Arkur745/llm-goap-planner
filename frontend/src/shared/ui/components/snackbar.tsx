import Snackbar, { type SnackbarProps } from "@mui/material/Snackbar";

export type AppSnackbarProps = SnackbarProps;

export function AppSnackbar(props: AppSnackbarProps) {
  return <Snackbar {...props} />;
}
