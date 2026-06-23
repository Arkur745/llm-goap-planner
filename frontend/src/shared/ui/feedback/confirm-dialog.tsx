import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { AppButton } from "@shared/ui/components/button";
import { AppDialog } from "@shared/ui/components/dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AppDialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <AppButton onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </AppButton>
        <AppButton
          onClick={onConfirm}
          variant="contained"
          color="primary"
          disabled={loading}
          autoFocus
        >
          {confirmLabel}
        </AppButton>
      </DialogActions>
    </AppDialog>
  );
}
