/**
 * Apply Design System — Sets all CSS custom properties on :root
 *
 * Takes a DesignSystemConfig and resolved mode (light/dark), then sets
 * every CSS variable the app consumes. Also injects custom CSS and loads fonts.
 */

import type { DesignSystemConfig, ColorPalette } from "@/types/admin";
import { BORDER_RADIUS_VALUES, FONT_NAME_TO_KEY } from "./index";
import { loadFont } from "./font-loader";
import { deriveDarkPalette } from "./color-derivation";
import type { ThemeFont } from "./index";

const CUSTOM_CSS_ID = "tenant-custom-css";

/**
 * Map a ColorPalette to CSS custom properties on the document root.
 */
function applyPalette(root: HTMLElement, palette: ColorPalette): void {
  // Brand colors
  root.style.setProperty("--primary", palette.primary.base);
  root.style.setProperty("--primary-foreground", palette.primary.foreground);
  root.style.setProperty("--secondary", palette.secondary.base);
  root.style.setProperty("--secondary-foreground", palette.secondary.foreground);
  root.style.setProperty("--accent", palette.accent.base);
  root.style.setProperty("--accent-foreground", palette.accent.foreground);

  // Surfaces
  root.style.setProperty("--background", palette.background.base);
  root.style.setProperty("--foreground", palette.background.foreground);
  root.style.setProperty("--card", palette.card.base);
  root.style.setProperty("--card-foreground", palette.card.foreground);
  root.style.setProperty("--popover", palette.popover.base);
  root.style.setProperty("--popover-foreground", palette.popover.foreground);
  root.style.setProperty("--muted", palette.muted.base);
  root.style.setProperty("--muted-foreground", palette.muted.foreground);

  // Feedback
  root.style.setProperty("--destructive", palette.destructive.base);
  root.style.setProperty("--destructive-foreground", palette.destructive.foreground);

  // Utility
  root.style.setProperty("--border", palette.border);
  root.style.setProperty("--input", palette.input);
  root.style.setProperty("--ring", palette.ring);

  // Sidebar
  root.style.setProperty("--sidebar-background", palette.sidebar.background);
  root.style.setProperty("--sidebar-foreground", palette.sidebar.foreground);
  root.style.setProperty("--sidebar-primary", palette.sidebar.primary);
  root.style.setProperty("--sidebar-primary-foreground", palette.sidebar.primaryForeground);
  root.style.setProperty("--sidebar-accent", palette.sidebar.accent);
  root.style.setProperty("--sidebar-accent-foreground", palette.sidebar.accentForeground);
  root.style.setProperty("--sidebar-border", palette.sidebar.border);
  root.style.setProperty("--sidebar-ring", palette.sidebar.ring);

  // Semantic: risk
  root.style.setProperty("--risk-critical", palette.riskCritical);
  root.style.setProperty("--risk-critical-light", palette.riskCriticalLight);
  root.style.setProperty("--risk-high", palette.riskHigh);
  root.style.setProperty("--risk-high-light", palette.riskHighLight);
  root.style.setProperty("--risk-medium", palette.riskMedium);
  root.style.setProperty("--risk-medium-light", palette.riskMediumLight);
  root.style.setProperty("--risk-low", palette.riskLow);
  root.style.setProperty("--risk-low-light", palette.riskLowLight);

  // Semantic: status
  root.style.setProperty("--status-critical", palette.statusCritical);
  root.style.setProperty("--status-warning", palette.statusWarning);
  root.style.setProperty("--status-success", palette.statusSuccess);
  root.style.setProperty("--status-info", palette.statusInfo);

  // Neutrals
  root.style.setProperty("--slate-50", palette.slate50);
  root.style.setProperty("--slate-100", palette.slate100);
  root.style.setProperty("--slate-200", palette.slate200);
  root.style.setProperty("--slate-500", palette.slate500);
  root.style.setProperty("--slate-600", palette.slate600);
  root.style.setProperty("--slate-700", palette.slate700);
  root.style.setProperty("--slate-800", palette.slate800);

  // Gold
  root.style.setProperty("--gold", palette.gold);
  root.style.setProperty("--gold-light", palette.goldLight);
}

/**
 * Get the resolved font family string for a font name.
 */
function fontFamilyString(fontName: string): string {
  return `'${fontName}', system-ui, sans-serif`;
}

/**
 * Apply the full design system to the document.
 *
 * @param config The DesignSystemConfig from the database
 * @param mode Resolved display mode ("light" | "dark")
 */
export function applyDesignSystem(config: DesignSystemConfig, mode: "light" | "dark"): void {
  const root = document.documentElement;

  // Determine which palette to apply
  const isDark = mode === "dark";
  let palette: ColorPalette;

  if (isDark) {
    // Use manual dark palette if provided, otherwise auto-derive
    palette = config.colors.dark ?? deriveDarkPalette(config.colors.light);
  } else {
    palette = config.colors.light;
  }

  // Apply all color tokens
  applyPalette(root, palette);

  // Border radius
  root.style.setProperty("--radius", BORDER_RADIUS_VALUES[config.surfaces.borderRadius]);

  // Typography
  const bodyFamily = fontFamilyString(config.typography.bodyFont);
  const headingFamily = fontFamilyString(config.typography.headingFont);
  root.style.setProperty("--font-family", bodyFamily);
  root.style.setProperty("--font-family-heading", headingFamily);
  document.body.style.fontFamily = bodyFamily;

  // Load fonts via Google Fonts
  const bodyKey = FONT_NAME_TO_KEY[config.typography.bodyFont] as ThemeFont | undefined;
  if (bodyKey) loadFont(bodyKey);
  if (config.typography.headingFont !== config.typography.bodyFont) {
    const headingKey = FONT_NAME_TO_KEY[config.typography.headingFont] as ThemeFont | undefined;
    if (headingKey) loadFont(headingKey);
  }

  // Font scale
  const scaleMap = { compact: "0.875", default: "1", spacious: "1.125" } as const;
  root.style.setProperty("--font-scale", scaleMap[config.typography.fontScale]);

  // Card elevation
  const elevationMap = {
    flat: "none",
    subtle: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    raised: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  } as const;
  root.style.setProperty("--card-shadow", elevationMap[config.surfaces.cardElevation]);

  // Layout theme
  root.dataset.layout = config.surfaces.layoutTheme;

  // Custom CSS injection
  let styleEl = document.getElementById(CUSTOM_CSS_ID) as HTMLStyleElement | null;
  if (config.customCss) {
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = CUSTOM_CSS_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = config.customCss;
  } else if (styleEl) {
    styleEl.textContent = "";
  }
}
