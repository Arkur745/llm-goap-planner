import Button, { type ButtonProps } from "@mui/material/Button";

export type AppButtonProps = ButtonProps;

export function AppButton(props: AppButtonProps) {
  return <Button {...props} />;
}
