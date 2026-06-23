import { createTheme, responsiveFontSizes, type Theme } from "@mui/material/styles";

import { THEME_MODE_DARK, type ThemeMode } from "@shared/constants/theme";

function createPalette(mode: ThemeMode) {
  const isDarkMode = mode === THEME_MODE_DARK;

  return {
    mode,
    primary: {
      main: isDarkMode ? "#8b5cf6" : "#4f46e5",
    },
    secondary: {
      main: isDarkMode ? "#22d3ee" : "#0891b2",
    },
    background: {
      default: isDarkMode ? "#0b1020" : "#f8fafc",
      paper: isDarkMode ? "#111827" : "#ffffff",
    },
    text: {
      primary: isDarkMode ? "#f8fafc" : "#0f172a",
      secondary: isDarkMode ? "#cbd5e1" : "#475569",
    },
  };
}

export function createAppTheme(mode: ThemeMode): Theme {
  const theme = createTheme({
    palette: createPalette(mode),
    typography: {
      fontFamily: ["Inter", "Segoe UI", "Arial", "sans-serif"].join(","),
      h1: {
        fontWeight: 800,
      },
      h2: {
        fontWeight: 700,
      },
      button: {
        fontWeight: 600,
        textTransform: "none",
      },
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: mode === THEME_MODE_DARK ? "#0b1020" : "#f8fafc",
          },
          "#root": {
            minHeight: "100dvh",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
      },
    },
  });

  return responsiveFontSizes(theme);
}
