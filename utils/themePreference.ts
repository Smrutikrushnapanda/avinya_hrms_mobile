export type ThemePreference = "light" | "dark";

export const THEME_PREFERENCE_KEY = "theme_preference";

export const isThemePreference = (
  value: string | null
): value is ThemePreference => value === "light" || value === "dark";
