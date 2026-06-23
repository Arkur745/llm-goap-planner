import Alert, { type AlertProps } from "@mui/material/Alert";

export type AppAlertProps = AlertProps;

export function AppAlert(props: AppAlertProps) {
  return <Alert {...props} />;
}
