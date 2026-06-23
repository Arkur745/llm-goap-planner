import Dialog, { type DialogProps } from "@mui/material/Dialog";
import DialogActions, { type DialogActionsProps } from "@mui/material/DialogActions";
import DialogContent, { type DialogContentProps } from "@mui/material/DialogContent";
import DialogContentText, { type DialogContentTextProps } from "@mui/material/DialogContentText";
import DialogTitle, { type DialogTitleProps } from "@mui/material/DialogTitle";

export type AppDialogProps = DialogProps;
export type AppDialogActionsProps = DialogActionsProps;
export type AppDialogContentProps = DialogContentProps;
export type AppDialogContentTextProps = DialogContentTextProps;
export type AppDialogTitleProps = DialogTitleProps;

export function AppDialog(props: AppDialogProps) {
  return <Dialog {...props} />;
}

export function AppDialogTitle(props: AppDialogTitleProps) {
  return <DialogTitle {...props} />;
}

export function AppDialogContent(props: AppDialogContentProps) {
  return <DialogContent {...props} />;
}

export function AppDialogContentText(props: AppDialogContentTextProps) {
  return <DialogContentText {...props} />;
}

export function AppDialogActions(props: AppDialogActionsProps) {
  return <DialogActions {...props} />;
}
