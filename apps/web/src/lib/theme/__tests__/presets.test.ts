import { describe, it, expect, beforeAll } from "vitest";
import {
  DESIGN_PRESETS,
  PRESET_LABELS,
  PRESET_DESCRIPTIONS,
  DEFAULT_DESIGN_SYSTEM,
} from "../presets";
import { parseHslString } from "../color-utils";
import type { DesignSystemConfig, ColorPalette } from "@/types/admin";

const PRESET_IDS = ["classic", "modern", "compact", "warmth", "professional"];

describe("presets", () => {
  describe("DESIGN_PRESETS", () => {
    it("contains all 5 expected presets", () => {
      expect(Object.keys(DESIGN_PRESETS)).toEqual(PRESET_IDS);
    });

    PRESET_IDS.forEach((id) => {
      describe(`preset: ${id}`, () => {
        let preset: DesignSystemConfig;

        beforeAll(() => {
          preset = DESIGN_PRESETS[id];
        });

        it("has version 1", () => {
          expect(preset.version).toBe(1);
        });

        it("has mode set to easy", () => {
          expect(preset.mode).toBe("easy");
        });

        it("has presetId matching its key", () => {
          expect(preset.presetId).toBe(id);
        });

        it("has a valid logo system with null defaults", () => {
          expect(preset.logos).toEqual({
            primary: null,
            mark: null,
            primaryDark: null,
            footer: null,
          });
        });

        it("has a light palette with valid HSL primary", () => {
          const [h, s, l] = parseHslString(preset.colors.light.primary.base);
          expect(h).toBeGreaterThanOrEqual(0);
          expect(h).toBeLessThanOrEqual(360);
          expect(s).toBeGreaterThanOrEqual(0);
          expect(s).toBeLessThanOrEqual(100);
          expect(l).toBeGreaterThanOrEqual(0);
          expect(l).toBeLessThanOrEqual(100);
        });

        it("has a dark palette", () => {
          expect(preset.colors.dark).toBeTruthy();
        });

        it("has valid typography settings", () => {
          expect(preset.typography.headingFont).toBeTruthy();
          expect(preset.typography.bodyFont).toBeTruthy();
          expect(["compact", "default", "spacious"]).toContain(preset.typography.fontScale);
        });

        it("has valid surface settings", () => {
          expect(["none", "sm", "md", "lg", "full"]).toContain(preset.surfaces.borderRadius);
          expect(["flat", "subtle", "raised"]).toContain(preset.surfaces.cardElevation);
          expect(["modern", "classic", "compact", "sidebar", "dashboard"]).toContain(
            preset.surfaces.layoutTheme,
          );
          expect(["square", "rounded", "pill"]).toContain(preset.surfaces.buttonShape);
        });

        it("has valid font weights", () => {
          expect(["300", "400", "500", "600", "700", "800"]).toContain(
            preset.typography.headingWeight,
          );
          expect(["300", "400", "500", "600", "700", "800"]).toContain(
            preset.typography.bodyWeight,
          );
        });

        it("has gradient tokens", () => {
          expect(preset.gradients).toBeDefined();
          // Hero gradient should be defined for all presets
          expect(preset.gradients.hero).not.toBeNull();
          if (preset.gradients.hero) {
            expect(preset.gradients.hero.from).toMatch(/\d+ \d+% \d+%/);
            expect(preset.gradients.hero.to).toMatch(/\d+ \d+% \d+%/);
            expect(["to-r", "to-br", "to-b", "to-bl"]).toContain(preset.gradients.hero.direction);
          }
        });

        it("has empty channel overrides by default", () => {
          expect(preset.channelOverrides).toEqual([]);
        });

        it("has empty customCss", () => {
          expect(preset.customCss).toBe("");
        });

        it("has all required palette fields", () => {
          const palette = preset.colors.light;
          // Brand
          expect(palette.primary.base).toBeTruthy();
          expect(palette.primary.foreground).toBeTruthy();
          expect(palette.secondary.base).toBeTruthy();
          expect(palette.accent.base).toBeTruthy();
          // Surfaces
          expect(palette.background.base).toBeTruthy();
          expect(palette.card.base).toBeTruthy();
          expect(palette.popover.base).toBeTruthy();
          expect(palette.muted.base).toBeTruthy();
          // Feedback
          expect(palette.destructive.base).toBeTruthy();
          // Utility
          expect(palette.border).toBeTruthy();
          expect(palette.input).toBeTruthy();
          expect(palette.ring).toBeTruthy();
          // Sidebar
          expect(palette.sidebar.background).toBeTruthy();
          expect(palette.sidebar.primary).toBeTruthy();
          // Semantic
          expect(palette.riskCritical).toBeTruthy();
          expect(palette.statusSuccess).toBeTruthy();
          // Neutrals
          expect(palette.slate50).toBeTruthy();
          expect(palette.slate800).toBeTruthy();
          // Gold
          expect(palette.gold).toBeTruthy();
        });

        it("dark palette has different background lightness than light", () => {
          const [, , lightL] = parseHslString(preset.colors.light.background.base);
          const [, , darkL] = parseHslString(preset.colors.dark!.background.base);
          expect(darkL).toBeLessThan(lightL);
        });
      });
    });
  });

  describe("PRESET_LABELS", () => {
    it("has a label for every preset", () => {
      PRESET_IDS.forEach((id) => {
        expect(PRESET_LABELS[id]).toBeTruthy();
        expect(typeof PRESET_LABELS[id]).toBe("string");
      });
    });
  });

  describe("PRESET_DESCRIPTIONS", () => {
    it("has a description for every preset", () => {
      PRESET_IDS.forEach((id) => {
        expect(PRESET_DESCRIPTIONS[id]).toBeTruthy();
        expect(typeof PRESET_DESCRIPTIONS[id]).toBe("string");
      });
    });
  });

  describe("DEFAULT_DESIGN_SYSTEM", () => {
    it("is the classic preset", () => {
      expect(DEFAULT_DESIGN_SYSTEM).toBe(DESIGN_PRESETS.classic);
    });

    it("is a valid DesignSystemConfig", () => {
      expect(DEFAULT_DESIGN_SYSTEM.version).toBe(1);
      expect(DEFAULT_DESIGN_SYSTEM.colors.light).toBeTruthy();
      expect(DEFAULT_DESIGN_SYSTEM.typography).toBeTruthy();
      expect(DEFAULT_DESIGN_SYSTEM.surfaces).toBeTruthy();
    });
  });
});
