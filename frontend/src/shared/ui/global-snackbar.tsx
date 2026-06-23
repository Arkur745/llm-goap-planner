import { Alert, Snackbar } from "@mui/material";

import { useSnackbar } from "@shared/hooks/use-snackbar";

export function GlobalSnackbar() {
  const { snackbar, hideSnackbar } = useSnackbar();

  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={snackbar.duration}
      onClose={(_, reason) => {
        if (reason === "clickaway") {
          return;
        }

        hideSnackbar();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={hideSnackbar}
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {snackbar.title ? <strong>{snackbar.title}: </strong> : null}
        {snackbar.message}
      </Alert>
    </Snackbar>
  );
}
