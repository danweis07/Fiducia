import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  type ThemeConfig,
  type ThemeLayout,
  type ThemeFont,
  type ThemeMode,
  type ThemeBorderRadius,
  DEFAULT_THEME,
  FONT_FAMILIES,
  BORDER_RADIUS_VALUES,
  loadTheme,
  saveTheme,
} from "@/lib/theme";
import { loadFont } from "@/lib/theme/font-loader";
import { getLanguageDir } from "@/lib/i18n";

// =============================================================================
// CONTEXT VALUE
// =============================================================================

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (config: ThemeConfig) => void;
  updateTheme: (partial: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
  resolvedMode: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// =============================================================================
// HELPERS
// =============================================================================

function getSystemMode(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getSystemReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Derive a lighter variant of an HSL color for secondary/surface use in dark mode.
 * Input format: "H S% L%" — we bump lightness for dark-mode primary.
 */
function deriveDarkPrimary(hsl: string): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%?\s+(\d+)%?/);
  if (!parts) return hsl;
  const h = parts[1];
  const s = parts[2];
  const l = Math.min(65, Number(parts[3]) + 20);
  return `${h} ${s}% ${l}%`;
}

// =============================================================================
// PROVIDER
// =============================================================================

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(loadTheme);
  const [systemMode, setSystemMode] = useState<"light" | "dark">(getSystemMode);

  const resolvedMode: "light" | "dark" = theme.mode === "system" ? systemMode : theme.mode;

  // Listen for OS color-scheme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemMode(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Listen for OS reduced-motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => {
      setThemeState((prev) => ({ ...prev, reducedMotion: e.matches }));
    };
    // Initialize from system preference if user hasn't explicitly toggled
    if (getSystemReducedMotion() && !theme.reducedMotion) {
      setThemeState((prev) => ({ ...prev, reducedMotion: true }));
    }
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Dark / light class
    root.classList.toggle("dark", resolvedMode === "dark");

    // High contrast class
    root.classList.toggle("high-contrast", theme.highContrast);

    // Reduced motion class
    root.classList.toggle("reduced-motion", theme.reducedMotion);

    // Layout class
    root.dataset.layout = theme.layout;

    // CSS custom properties for dynamic colors
    const isDark = resolvedMode === "dark";
    root.style.setProperty(
      "--primary",
      isDark ? deriveDarkPrimary(theme.primaryColor) : theme.primaryColor,
    );
    root.style.setProperty("--primary-foreground", isDark ? "220 20% 10%" : "0 0% 100%");
    root.style.setProperty("--secondary", theme.secondaryColor);
    root.style.setProperty("--accent", theme.accentColor);
    root.style.setProperty(
      "--ring",
      isDark ? deriveDarkPrimary(theme.primaryColor) : theme.primaryColor,
    );

    // Border radius
    root.style.setProperty("--radius", BORDER_RADIUS_VALUES[theme.borderRadius]);

    // Font family
    root.style.setProperty("--font-family", FONT_FAMILIES[theme.font]);
    document.body.style.fontFamily = FONT_FAMILIES[theme.font];
    loadFont(theme.font);

    // RTL support — set dir attribute based on document lang
    const lang = document.documentElement.lang || "en";
    root.dir = getLanguageDir(lang);
  }, [theme, resolvedMode]);

  // Persist
  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  const setTheme = useCallback((config: ThemeConfig) => {
    setThemeState(config);
  }, []);

  const updateTheme = useCallback((partial: Partial<ThemeConfig>) => {
    setThemeState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetTheme = useCallback(() => {
    setThemeState({ ...DEFAULT_THEME });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, updateTheme, resetTheme, resolvedMode }),
    [theme, setTheme, updateTheme, resetTheme, resolvedMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// =============================================================================
// HOOKS
// =============================================================================

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

export type { ThemeLayout, ThemeFont, ThemeMode, ThemeBorderRadius };
