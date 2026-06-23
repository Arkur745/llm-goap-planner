import type { PropsWithChildren } from "react";
import { useEffect, useMemo } from "react";
import { CssBaseline } from "@mui/material";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";

import { createAppTheme } from "@app/theme/app-theme";
import { useThemeMode } from "@shared/hooks/use-theme-mode";

export function ThemeProvider({ children }: PropsWithChildren) {
  const { themeMode } = useThemeMode();

  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  );
}
