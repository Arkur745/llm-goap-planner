import type { PropsWithChildren } from "react";

import { GlobalSnackbar } from "@shared/ui/global-snackbar";

export function SnackbarProvider({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <GlobalSnackbar />
    </>
  );
}
