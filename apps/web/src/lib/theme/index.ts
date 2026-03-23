// =============================================================================
// THEME CONFIGURATION — Types, presets, defaults
// =============================================================================

export type ThemeLayout = "classic" | "modern" | "compact" | "sidebar" | "dashboard";
export type ThemeFont = "inter" | "roboto" | "open-sans" | "dm-sans" | "nunito";
export type ThemeMode = "light" | "dark" | "system";
export type ThemeBorderRadius = "none" | "sm" | "md" | "lg" | "full";

export interface ThemeConfig {
  layout: ThemeLayout;
  font: ThemeFont;
  mode: ThemeMode;
  primaryColor: string; // HSL value like "215 70% 45%"
  secondaryColor: string; // HSL value
  accentColor: string; // HSL value
  borderRadius: ThemeBorderRadius;
  highContrast: boolean;
  reducedMotion: boolean;
}

/** Human-readable labels */
export const LAYOUT_LABELS: Record<ThemeLayout, string> = {
  classic: "Classic",
  modern: "Modern",
  compact: "Compact",
  sidebar: "Sidebar",
  dashboard: "Dashboard",
};

export const FONT_LABELS: Record<ThemeFont, string> = {
  inter: "Inter",
  roboto: "Roboto",
  "open-sans": "Open Sans",
  "dm-sans": "DM Sans",
  nunito: "Nunito",
};

export const FONT_FAMILIES: Record<ThemeFont, string> = {
  inter: "'Inter', system-ui, sans-serif",
  roboto: "'Roboto', system-ui, sans-serif",
  "open-sans": "'Open Sans', system-ui, sans-serif",
  "dm-sans": "'DM Sans', system-ui, sans-serif",
  nunito: "'Nunito', system-ui, sans-serif",
};

export const BORDER_RADIUS_VALUES: Record<ThemeBorderRadius, string> = {
  none: "0rem",
  sm: "0.375rem",
  md: "0.75rem",
  lg: "1rem",
  full: "9999px",
};

/** 5 preset themes */
export const THEME_PRESETS: Record<string, Partial<ThemeConfig>> = {
  classic: {
    layout: "classic",
    font: "inter",
    primaryColor: "215 70% 45%",
    secondaryColor: "40 10% 94%",
    accentColor: "38 75% 50%",
    borderRadius: "md",
  },
  modern: {
    layout: "modern",
    font: "dm-sans",
    primaryColor: "230 65% 50%",
    secondaryColor: "230 20% 94%",
    accentColor: "170 70% 45%",
    borderRadius: "lg",
  },
  compact: {
    layout: "compact",
    font: "roboto",
    primaryColor: "200 75% 40%",
    secondaryColor: "200 15% 93%",
    accentColor: "45 90% 50%",
    borderRadius: "sm",
  },
  warmth: {
    layout: "sidebar",
    font: "nunito",
    primaryColor: "25 80% 50%",
    secondaryColor: "25 20% 94%",
    accentColor: "350 70% 55%",
    borderRadius: "md",
  },
  professional: {
    layout: "dashboard",
    font: "open-sans",
    primaryColor: "210 25% 35%",
    secondaryColor: "210 10% 93%",
    accentColor: "180 50% 40%",
    borderRadius: "sm",
  },
};

export const PRESET_LABELS: Record<string, string> = {
  classic: "Classic",
  modern: "Modern",
  compact: "Compact",
  warmth: "Warmth",
  professional: "Professional",
};

export const DEFAULT_THEME: ThemeConfig = {
  layout: "classic",
  font: "inter",
  mode: "system",
  primaryColor: "215 50% 25%",
  secondaryColor: "40 10% 94%",
  accentColor: "38 75% 50%",
  borderRadius: "md",
  highContrast: false,
  reducedMotion: false,
};

const STORAGE_KEY = "vantage-theme";

export function loadTheme(): ThemeConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_THEME, ...JSON.parse(stored) };
    }
  } catch {
    // ignore corrupt storage
  }
  return { ...DEFAULT_THEME };
}

export function saveTheme(config: ThemeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // storage full — silently ignore
  }
}
