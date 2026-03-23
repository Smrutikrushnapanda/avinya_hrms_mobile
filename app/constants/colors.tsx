export type AppTheme = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  card: string;
  border: string;
  inputBackground: string;
  chip: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  green: string;
  red: string;
  blue: string;
  grey: string;
  white: string;
  onPrimary: string;
  overlay: string;
  shadow: string;
  statusBar: string;
};

export const lightTheme: AppTheme = {
  primary: "#026D94",
  secondary: "#7AB2FF",
  background: "#F3F8FB",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "#D8E3EC",
  inputBackground: "#F1F8FB",
  chip: "#EAF2F7",
  text: "#0F172A",
  textSecondary: "#334155",
  textMuted: "#64748B",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#3B82F6",
  grey: "#6B7280",
  white: "#FFFFFF",
  onPrimary: "#FFFFFF",
  overlay: "rgba(0,0,0,0.45)",
  shadow: "#000000",
  statusBar: "#026D94",
};

export const darkTheme: AppTheme = {
  primary: "#0A84B7",
  secondary: "#5CA3FF",
  background: "#0B1220",
  surface: "#121B2B",
  card: "#172235",
  border: "#2A3A50",
  inputBackground: "#1A2A3F",
  chip: "#24344B",
  text: "#E5EEF8",
  textSecondary: "#CBD7E6",
  textMuted: "#98ABC2",
  green: "#22C55E",
  red: "#F87171",
  blue: "#60A5FA",
  grey: "#94A3B8",
  white: "#172235",
  onPrimary: "#FFFFFF",
  overlay: "rgba(0,0,0,0.72)",
  shadow: "#000000",
  statusBar: "#0B1220",
};

export default { lightTheme, darkTheme };
