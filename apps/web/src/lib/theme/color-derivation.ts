/**
 * Color Derivation — Auto-generate full palettes from 1-2 input colors
 *
 * This is the intelligence behind Easy Mode. Given a primary color (and
 * optionally an accent), it derives the entire ColorPalette for both
 * light and dark modes.
 */

import type { ColorPalette, ColorPair } from "@/types/admin";
import { hexToHsl, parseHslString, hslToString, clampL } from "./color-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pair(base: string, foreground: string): ColorPair {
  return { base, foreground };
}

/**
 * Derive a warm/cool neutral from the primary hue.
 * Uses the primary's hue direction to tint neutral grays.
 */
function neutralFromHue(h: number, s: number, l: number): string {
  // Keep a hint of the primary hue, low saturation
  return hslToString(h, Math.min(s, 20), l);
}

// ---------------------------------------------------------------------------
// Light palette derivation
// ---------------------------------------------------------------------------

/**
 * Generate a complete light-mode ColorPalette from a primary hex color
 * and an optional accent hex color.
 */
export function deriveLightPalette(primaryHex: string, accentHex?: string): ColorPalette {
  const primaryHsl = hexToHsl(primaryHex);
  const [pH, pS, pL] = parseHslString(primaryHsl);

  // Accent: use provided or derive split-complementary
  let accentHsl: string;
  if (accentHex) {
    accentHsl = hexToHsl(accentHex);
  } else {
    // Split-complementary: shift hue 150°, boost saturation
    accentHsl = hslToString((pH + 150) % 360, Math.min(pS + 10, 90), 50);
  }
  const [aH] = parseHslString(accentHsl);

  // Secondary: desaturated version of primary
  const secondaryHsl = hslToString(pH, Math.max(pS - 40, 10), clampL(pL + 50));

  return {
    // Brand
    primary: pair(primaryHsl, pL > 55 ? "220 20% 12%" : "0 0% 100%"),
    secondary: pair(secondaryHsl, hslToString(pH, 20, 25)),
    accent: pair(accentHsl, "220 20% 12%"),

    // Surfaces — warm neutrals tinted by primary hue
    background: pair(neutralFromHue(pH, pS, 98), hslToString(pH + 5, 20, 12)),
    card: pair("0 0% 100%", hslToString(pH + 5, 20, 12)),
    popover: pair("0 0% 100%", hslToString(pH + 5, 20, 12)),
    muted: pair(neutralFromHue(pH, pS, 95), hslToString(pH + 5, 10, 45)),

    // Feedback
    destructive: pair("0 65% 50%", "0 0% 100%"),

    // Utility
    border: neutralFromHue(pH, pS, 88),
    input: neutralFromHue(pH, pS, 88),
    ring: primaryHsl,

    // Sidebar — primary-tinted
    sidebar: {
      background: "0 0% 100%",
      foreground: hslToString(pH + 5, 20, 25),
      primary: primaryHsl,
      primaryForeground: pL > 55 ? "220 20% 12%" : "0 0% 100%",
      accent: neutralFromHue(pH, pS, 95),
      accentForeground: hslToString(pH + 5, 20, 25),
      border: neutralFromHue(pH, pS, 90),
      ring: primaryHsl,
    },

    // Semantic: risk — fixed hues, not brand-shifted
    riskCritical: "0 72% 51%",
    riskCriticalLight: "0 86% 97%",
    riskHigh: "38 92% 50%",
    riskHighLight: "48 96% 89%",
    riskMedium: "217 91% 60%",
    riskMediumLight: "214 95% 93%",
    riskLow: "160 84% 39%",
    riskLowLight: "152 81% 96%",

    // Semantic: status — fixed standard hues
    statusCritical: "0 65% 50%",
    statusWarning: "35 90% 50%",
    statusSuccess: "142 60% 40%",
    statusInfo: primaryHsl,

    // Neutral scale — tinted by primary direction
    slate50: neutralFromHue(pH, 40, 98),
    slate100: neutralFromHue(pH, 40, 96),
    slate200: neutralFromHue(pH, 32, 91),
    slate500: neutralFromHue(pH, 16, 47),
    slate600: neutralFromHue(pH, 19, 35),
    slate700: neutralFromHue(pH, 25, 27),
    slate800: neutralFromHue(pH, 33, 17),

    // Accent highlights
    gold: hslToString(aH, 75, 50),
    goldLight: hslToString(aH, 75, 60),
  };
}

// ---------------------------------------------------------------------------
// Dark palette derivation
// ---------------------------------------------------------------------------

/**
 * Auto-derive a dark-mode palette from a light-mode palette.
 * Inverts lightness scale, boosts saturation on primary.
 */
export function deriveDarkPalette(light: ColorPalette): ColorPalette {
  const [pH, pS, pL] = parseHslString(light.primary.base);
  const darkPrimary = hslToString(pH, Math.min(pS + 10, 90), clampL(pL + 20));
  const [aH, aS] = parseHslString(light.accent.base);

  return {
    // Brand — lighter for dark bg
    primary: pair(darkPrimary, hslToString(pH, 20, 10)),
    secondary: pair(hslToString(pH, 15, 18), hslToString(pH, 15, 90)),
    accent: pair(hslToString(aH, Math.min(aS, 75), 55), hslToString(pH, 20, 10)),

    // Surfaces — dark bg
    background: pair(hslToString(pH, 20, 10), hslToString(pH, 20, 95)),
    card: pair(hslToString(pH, 20, 13), hslToString(pH, 20, 95)),
    popover: pair(hslToString(pH, 20, 12), hslToString(pH, 20, 95)),
    muted: pair(hslToString(pH, 15, 16), hslToString(pH, 10, 55)),

    // Feedback
    destructive: pair("0 60% 55%", "0 0% 100%"),

    // Utility
    border: hslToString(pH, 15, 20),
    input: hslToString(pH, 15, 18),
    ring: darkPrimary,

    // Sidebar
    sidebar: {
      background: hslToString(pH, 20, 11),
      foreground: hslToString(pH, 15, 90),
      primary: darkPrimary,
      primaryForeground: hslToString(pH, 20, 10),
      accent: hslToString(pH, 15, 15),
      accentForeground: hslToString(pH, 15, 90),
      border: hslToString(pH, 15, 18),
      ring: darkPrimary,
    },

    // Semantic: risk — bumped lightness for dark bg
    riskCritical: "0 72% 55%",
    riskCriticalLight: "0 40% 20%",
    riskHigh: "38 92% 55%",
    riskHighLight: "38 40% 20%",
    riskMedium: "217 91% 65%",
    riskMediumLight: "217 40% 20%",
    riskLow: "160 84% 45%",
    riskLowLight: "160 40% 20%",

    // Status
    statusCritical: "0 60% 55%",
    statusWarning: "35 85% 55%",
    statusSuccess: "142 55% 45%",
    statusInfo: darkPrimary,

    // Neutrals — inverted
    slate50: hslToString(pH, 20, 14),
    slate100: hslToString(pH, 20, 16),
    slate200: hslToString(pH, 20, 20),
    slate500: hslToString(pH, 15, 55),
    slate600: hslToString(pH, 15, 65),
    slate700: hslToString(pH, 15, 75),
    slate800: hslToString(pH, 15, 85),

    // Gold
    gold: hslToString(aH, 75, 55),
    goldLight: hslToString(aH, 75, 65),
  };
}

// ---------------------------------------------------------------------------
// Full palette derivation (convenience)
// ---------------------------------------------------------------------------

/**
 * Derive both light and dark palettes from 1-2 hex colors.
 * This is the main entry point for Easy Mode.
 */
export function deriveFullPalette(
  primaryHex: string,
  accentHex?: string,
): { light: ColorPalette; dark: ColorPalette } {
  const light = deriveLightPalette(primaryHex, accentHex);
  const dark = deriveDarkPalette(light);
  return { light, dark };
}
