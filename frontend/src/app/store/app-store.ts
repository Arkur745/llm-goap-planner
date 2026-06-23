import { create } from "zustand";
import type { AlertColor } from "@mui/material";

import { DEFAULT_SNACKBAR_DURATION_MS, STORAGE_KEYS } from "@shared/constants/app";
import {
  THEME_MODE_DARK,
  THEME_MODE_LIGHT,
  THEME_MODE_SYSTEM,
  type ThemeMode,
  type ThemePreference,
} from "@shared/constants/theme";
import { env } from "@shared/config/env";
import { readJsonStorage, writeJsonStorage } from "@shared/lib/storage";

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
  title?: string;
  duration: number;
}

export interface SnackbarInput {
  message: string;
  severity?: AlertColor;
  title?: string;
  duration?: number;
}

export interface AppStoreState {
  themeMode: ThemeMode;
  snackbar: SnackbarState;
  setThemeMode: (mode: ThemePreference) => void;
  toggleThemeMode: () => void;
  showSnackbar: (input: SnackbarInput) => void;
  hideSnackbar: () => void;
}

function resolveSystemThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return THEME_MODE_LIGHT;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? THEME_MODE_DARK
    : THEME_MODE_LIGHT;
}

function resolveInitialThemeMode(): ThemeMode {
  const storedMode = readJsonStorage<ThemeMode | null>(STORAGE_KEYS.themeMode, null);

  if (storedMode === THEME_MODE_LIGHT || storedMode === THEME_MODE_DARK) {
    return storedMode;
  }

  if (env.VITE_DEFAULT_THEME === THEME_MODE_SYSTEM) {
    return resolveSystemThemeMode();
  }

  return env.VITE_DEFAULT_THEME;
}

const defaultSnackbarState: SnackbarState = {
  open: false,
  message: "",
  severity: "info",
  duration: DEFAULT_SNACKBAR_DURATION_MS,
};

export const useAppStore = create<AppStoreState>((set, get) => ({
  themeMode: resolveInitialThemeMode(),
  snackbar: defaultSnackbarState,
  setThemeMode: (mode) => {
    const resolvedMode = mode === THEME_MODE_SYSTEM ? resolveSystemThemeMode() : mode;
    writeJsonStorage(STORAGE_KEYS.themeMode, resolvedMode);
    set({ themeMode: resolvedMode });
  },
  toggleThemeMode: () => {
    const nextMode = get().themeMode === THEME_MODE_DARK ? THEME_MODE_LIGHT : THEME_MODE_DARK;
    get().setThemeMode(nextMode);
  },
  showSnackbar: (input) => {
    set({
      snackbar: {
        open: true,
        message: input.message,
        severity: input.severity ?? "info",
        title: input.title,
        duration: input.duration ?? DEFAULT_SNACKBAR_DURATION_MS,
      },
    });
  },
  hideSnackbar: () => {
    set((state) => ({
      snackbar: {
        ...state.snackbar,
        open: false,
      },
    }));
  },
}));
