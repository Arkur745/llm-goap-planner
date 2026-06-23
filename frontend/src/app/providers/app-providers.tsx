import type { PropsWithChildren } from "react";

import { ReactQueryProvider } from "@app/providers/react-query-provider";
import { SnackbarProvider } from "@app/providers/snackbar-provider";
import { ThemeProvider } from "@app/providers/theme-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <SnackbarProvider>{children}</SnackbarProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  );
}
