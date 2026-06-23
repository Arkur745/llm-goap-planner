export const THEME_MODE_LIGHT = "light" as const;
export const THEME_MODE_DARK = "dark" as const;
export const THEME_MODE_SYSTEM = "system" as const;

export type ThemeMode = typeof THEME_MODE_LIGHT | typeof THEME_MODE_DARK;
export type ThemePreference = ThemeMode | typeof THEME_MODE_SYSTEM;

export const THEME_MODES = [THEME_MODE_LIGHT, THEME_MODE_DARK] as const;
