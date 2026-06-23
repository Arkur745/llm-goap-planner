import { useAppStore } from "@app/store/app-store";

export function useThemeMode() {
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const toggleThemeMode = useAppStore((state) => state.toggleThemeMode);

  return {
    themeMode,
    isDarkMode: themeMode === "dark",
    isLightMode: themeMode === "light",
    setThemeMode,
    toggleThemeMode,
  };
}
