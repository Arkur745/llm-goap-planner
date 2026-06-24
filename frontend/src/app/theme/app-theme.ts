import { createTheme, responsiveFontSizes, type Theme } from "@mui/material/styles";
import { THEME_MODE_DARK, type ThemeMode } from "@shared/constants/theme";

function createPalette(mode: ThemeMode) {
  const isDarkMode = mode === THEME_MODE_DARK;
  return {
    mode,
    primary: {
      main: "#7C5CFF",
    },
    secondary: {
      main: "#7C5CFF", // single accent color only
    },
    background: {
      default: isDarkMode ? "#050816" : "#F9FAFB",
      paper: isDarkMode ? "#0B1020" : "#FFFFFF",
    },
    text: {
      primary: isDarkMode ? "#FFFFFF" : "#111827",
      secondary: isDarkMode ? "#9CA3AF" : "#6B7280",
    },
    divider: isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
    success: {
      main: "#10B981",
    },
    warning: {
      main: "#F59E0B",
    },
    error: {
      main: "#EF4444",
    },
  };
}

export function createAppTheme(mode: ThemeMode): Theme {
  const theme = createTheme({
    palette: createPalette(mode),
    typography: {
      fontFamily: "var(--font-family)",
      h1: {
        fontWeight: "var(--font-weight-bold)",
        fontSize: "2rem",
        letterSpacing: "-0.03em",
        lineHeight: 1.25,
      },
      h2: {
        fontWeight: "var(--font-weight-semibold)",
        fontSize: "1.5rem",
        letterSpacing: "-0.02em",
        lineHeight: 1.3,
      },
      h3: {
        fontWeight: "var(--font-weight-semibold)",
        fontSize: "1.25rem",
        letterSpacing: "-0.01em",
        lineHeight: 1.35,
      },
      body1: {
        fontSize: "0.9375rem",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.5,
      },
      button: {
        fontWeight: "var(--font-weight-medium)",
        textTransform: "none",
        fontSize: "0.875rem",
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: "var(--color-background)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-family)",
            transition: "background-color var(--transition-normal), color var(--transition-normal)",
          },
          "#root": {
            minHeight: "100dvh",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: "var(--color-surface)",
            backgroundImage: "none",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-flat)", // keep surfaces flat
            borderRadius: "var(--radius-md)",
            transition: "background-color var(--transition-normal), border-color var(--transition-normal)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-flat)",
            borderRadius: "var(--radius-md)",
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "var(--radius-sm)",
            padding: "8px 16px",
            boxShadow: "var(--shadow-flat)",
            transition: "all var(--transition-fast)",
            "&:hover": {
              boxShadow: "var(--shadow-flat)",
            },
          },
          containedPrimary: {
            backgroundColor: "var(--color-accent)",
            color: "#FFFFFF",
            "&:hover": {
              backgroundColor: "var(--color-accent-hover)",
            },
          },
          outlined: {
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
            "&:hover": {
              borderColor: "var(--color-border-hover)",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--color-surface-elevated)",
            transition: "all var(--transition-fast)",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-border)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-border-hover)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-accent)",
              borderWidth: "1px",
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: "var(--color-surface)",
            borderRight: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-flat)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: "transparent",
            boxShadow: "var(--shadow-flat)",
            borderBottom: "1px solid var(--color-border)",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: "var(--radius-xs)",
            margin: "2px 8px",
            transition: "all var(--transition-fast)",
            "&.Mui-selected": {
              backgroundColor: "var(--color-item-active)",
              color: "var(--color-accent)",
              "& .MuiListItemIcon-root": {
                color: "var(--color-accent)",
              },
              "&:hover": {
                backgroundColor: "var(--color-item-active-hover)",
              },
            },
            "&:hover": {
              backgroundColor: "var(--color-item-hover)",
              color: "var(--color-text-primary)",
              "& .MuiListItemIcon-root": {
                color: "var(--color-text-primary)",
              },
            },
          },
        },
      },
    },
  });

  return responsiveFontSizes(theme);
}

