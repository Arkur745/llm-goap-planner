import TextField, { type TextFieldProps } from "@mui/material/TextField";

export type AppTextFieldProps = TextFieldProps;

export function AppTextField(props: AppTextFieldProps) {
  return <TextField fullWidth variant="outlined" {...props} />;
}
