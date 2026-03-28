/**
 * Design System Presets
 *
 * Five ready-to-use design system configurations. Each is a complete
 * DesignSystemConfig built from a seed primary + accent color via
 * deriveFullPalette().
 */

import type { DesignSystemConfig } from "@/types/admin";
import { deriveFullPalette } from "./color-derivation";

/** Seed colors for each preset */
const PRESET_SEEDS: Record<
  string,
  {
    primary: string;
    accent: string;
    headingFont: string;
    bodyFont: string;
    radius: DesignSystemConfig["surfaces"]["borderRadius"];
    layout: DesignSystemConfig["surfaces"]["layoutTheme"];
  }
> = {
  classic: {
    primary: "#1e3a5f",
    accent: "#c8952e",
    headingFont: "Inter",
    bodyFont: "Inter",
    radius: "md",
    layout: "classic",
  },
  modern: {
    primary: "#3451b2",
    accent: "#2b9f8f",
    headingFont: "DM Sans",
    bodyFont: "DM Sans",
    radius: "lg",
    layout: "modern",
  },
  compact: {
    primary: "#1a8faa",
    accent: "#d4a017",
    headingFont: "Roboto",
    bodyFont: "Roboto",
    radius: "sm",
    layout: "compact",
  },
  warmth: {
    primary: "#c05621",
    accent: "#d6336c",
    headingFont: "Nunito",
    bodyFont: "Nunito",
    radius: "md",
    layout: "sidebar",
  },
  professional: {
    primary: "#3d4f5f",
    accent: "#2a9d8f",
    headingFont: "Open Sans",
    bodyFont: "Open Sans",
    radius: "sm",
    layout: "dashboard",
  },
};

function buildPreset(id: string): DesignSystemConfig {
  const seed = PRESET_SEEDS[id];
  const { light, dark } = deriveFullPalette(seed.primary, seed.accent);

  return {
    version: 1,
    mode: "easy",
    presetId: id,
    logos: {
      primary: null,
      mark: null,
      primaryDark: null,
      footer: null,
    },
    colors: { light, dark },
    typography: {
      headingFont: seed.headingFont,
      bodyFont: seed.bodyFont,
      fontScale: "default",
    },
    surfaces: {
      borderRadius: seed.radius,
      cardElevation: "subtle",
      layoutTheme: seed.layout,
    },
    customCss: "",
  };
}

/** Pre-built design system configurations */
export const DESIGN_PRESETS: Record<string, DesignSystemConfig> = {
  classic: buildPreset("classic"),
  modern: buildPreset("modern"),
  compact: buildPreset("compact"),
  warmth: buildPreset("warmth"),
  professional: buildPreset("professional"),
};

export const PRESET_LABELS: Record<string, string> = {
  classic: "Classic",
  modern: "Modern",
  compact: "Compact",
  warmth: "Warmth",
  professional: "Professional",
};

export const PRESET_DESCRIPTIONS: Record<string, string> = {
  classic: "Navy & gold — traditional banking trust",
  modern: "Blue & teal — clean, contemporary feel",
  compact: "Cyan & amber — dense, data-focused",
  warmth: "Orange & pink — friendly, approachable",
  professional: "Slate & teal — executive, polished",
};

/** Default design system config — uses the Classic preset */
export const DEFAULT_DESIGN_SYSTEM: DesignSystemConfig = DESIGN_PRESETS.classic;
