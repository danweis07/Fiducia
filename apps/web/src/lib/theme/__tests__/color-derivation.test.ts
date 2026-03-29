import { describe, it, expect } from "vitest";
import { deriveLightPalette, deriveDarkPalette, deriveFullPalette } from "../color-derivation";
import { parseHslString } from "../color-utils";

describe("color-derivation", () => {
  describe("deriveLightPalette", () => {
    it("produces a complete palette from a single primary color", () => {
      const palette = deriveLightPalette("#1e40af");

      // All required fields should exist and be non-empty HSL strings
      expect(palette.primary.base).toMatch(/\d+ \d+% \d+%/);
      expect(palette.primary.foreground).toMatch(/\d+ \d+% \d+%/);
      expect(palette.secondary.base).toMatch(/\d+ \d+% \d+%/);
      expect(palette.accent.base).toMatch(/\d+ \d+% \d+%/);
      expect(palette.background.base).toMatch(/\d+ \d+% \d+%/);
      expect(palette.card.base).toMatch(/\d+ \d+% \d+%/);
      expect(palette.destructive.base).toMatch(/\d+ \d+% \d+%/);
      expect(palette.border).toMatch(/\d+ \d+% \d+%/);
      expect(palette.sidebar.background).toMatch(/\d+ \d+% \d+%/);
      expect(palette.riskCritical).toMatch(/\d+ \d+% \d+%/);
      expect(palette.statusSuccess).toMatch(/\d+ \d+% \d+%/);
      expect(palette.slate50).toMatch(/\d+ \d+% \d+%/);
      expect(palette.gold).toMatch(/\d+ \d+% \d+%/);
    });

    it("uses provided accent color when given", () => {
      const palette = deriveLightPalette("#1e40af", "#059669");
      const [aH] = parseHslString(palette.accent.base);
      // Should be in the green range (around 160)
      expect(aH).toBeGreaterThan(140);
      expect(aH).toBeLessThan(180);
    });

    it("auto-derives accent when not provided", () => {
      const palette = deriveLightPalette("#1e40af");
      // Accent should exist and differ from primary
      expect(palette.accent.base).not.toBe(palette.primary.base);
    });

    it("keeps semantic risk colors at standard hues", () => {
      const palette = deriveLightPalette("#1e40af");
      const [critH] = parseHslString(palette.riskCritical);
      const [lowH] = parseHslString(palette.riskLow);
      expect(critH).toBe(0); // Red
      expect(lowH).toBe(160); // Green
    });

    it("derives light backgrounds", () => {
      const palette = deriveLightPalette("#1e40af");
      const [, , bgL] = parseHslString(palette.background.base);
      expect(bgL).toBeGreaterThanOrEqual(95);
    });
  });

  describe("deriveDarkPalette", () => {
    it("produces darker backgrounds than light palette", () => {
      const light = deriveLightPalette("#1e40af");
      const dark = deriveDarkPalette(light);

      const [, , lightBgL] = parseHslString(light.background.base);
      const [, , darkBgL] = parseHslString(dark.background.base);

      expect(darkBgL).toBeLessThan(lightBgL);
      expect(darkBgL).toBeLessThanOrEqual(15);
    });

    it("lightens the primary for dark mode", () => {
      const light = deriveLightPalette("#1e40af");
      const dark = deriveDarkPalette(light);

      const [, , lightPrimaryL] = parseHslString(light.primary.base);
      const [, , darkPrimaryL] = parseHslString(dark.primary.base);

      expect(darkPrimaryL).toBeGreaterThan(lightPrimaryL);
    });

    it("keeps risk colors readable", () => {
      const light = deriveLightPalette("#1e40af");
      const dark = deriveDarkPalette(light);

      const [, , darkCritL] = parseHslString(dark.riskCritical);
      expect(darkCritL).toBeGreaterThanOrEqual(50);
    });
  });

  describe("deriveFullPalette", () => {
    it("returns both light and dark palettes", () => {
      const { light, dark } = deriveFullPalette("#1e40af");
      expect(light).toBeDefined();
      expect(dark).toBeDefined();
      expect(light.primary.base).not.toBe(dark.primary.base);
    });

    it("works with accent override", () => {
      const { light } = deriveFullPalette("#1e40af", "#059669");
      const [aH] = parseHslString(light.accent.base);
      expect(aH).toBeGreaterThan(140);
    });

    it("produces valid palettes for various brand colors", () => {
      const testColors = ["#ff0000", "#00ff00", "#0000ff", "#ff8c00", "#800080"];
      for (const color of testColors) {
        const { light, dark } = deriveFullPalette(color);
        expect(light.primary.base).toMatch(/\d+ \d+% \d+%/);
        expect(dark.primary.base).toMatch(/\d+ \d+% \d+%/);
      }
    });
  });
});
