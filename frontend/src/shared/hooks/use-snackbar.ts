import { useAppStore } from "@app/store/app-store";

export function useSnackbar() {
  const snackbar = useAppStore((state) => state.snackbar);
  const showSnackbar = useAppStore((state) => state.showSnackbar);
  const hideSnackbar = useAppStore((state) => state.hideSnackbar);

  return {
    snackbar,
    showSnackbar,
    hideSnackbar,
  };
}
