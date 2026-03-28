import { describe, it, expect } from "vitest";
import {
  hexToHsl,
  hslToHex,
  parseHslString,
  hslToString,
  adjustLightness,
  shiftHue,
} from "../color-utils";

describe("color-utils", () => {
  describe("hexToHsl", () => {
    it("converts pure red", () => {
      expect(hexToHsl("#ff0000")).toBe("0 100% 50%");
    });

    it("converts pure white", () => {
      expect(hexToHsl("#ffffff")).toBe("0 0% 100%");
    });

    it("converts pure black", () => {
      expect(hexToHsl("#000000")).toBe("0 0% 0%");
    });

    it("converts a navy blue", () => {
      const result = hexToHsl("#1e40af");
      const [h, s, l] = parseHslString(result);
      expect(h).toBeGreaterThanOrEqual(220);
      expect(h).toBeLessThanOrEqual(227);
      expect(s).toBeGreaterThan(50);
      expect(l).toBeGreaterThan(30);
      expect(l).toBeLessThan(50);
    });

    it("handles 3-character hex", () => {
      const result = hexToHsl("#fff");
      expect(result).toBe("0 0% 100%");
    });
  });

  describe("hslToHex", () => {
    it("converts pure red HSL to hex", () => {
      expect(hslToHex("0 100% 50%")).toBe("#ff0000");
    });

    it("converts white", () => {
      expect(hslToHex("0 0% 100%")).toBe("#ffffff");
    });

    it("converts black", () => {
      expect(hslToHex("0 0% 0%")).toBe("#000000");
    });
  });

  describe("round-trip fidelity", () => {
    const testColors = [
      "#1e40af",
      "#059669",
      "#dc2626",
      "#f59e0b",
      "#8b5cf6",
      "#64748b",
      "#0ea5e9",
    ];

    testColors.forEach((hex) => {
      it(`round-trips ${hex}`, () => {
        const hsl = hexToHsl(hex);
        const backToHex = hslToHex(hsl);
        // Allow small rounding differences (±2 per channel)
        const orig = parseInt(hex.slice(1), 16);
        const result = parseInt(backToHex.slice(1), 16);
        const diffR = Math.abs(((orig >> 16) & 255) - ((result >> 16) & 255));
        const diffG = Math.abs(((orig >> 8) & 255) - ((result >> 8) & 255));
        const diffB = Math.abs((orig & 255) - (result & 255));
        expect(diffR).toBeLessThanOrEqual(3);
        expect(diffG).toBeLessThanOrEqual(3);
        expect(diffB).toBeLessThanOrEqual(3);
      });
    });
  });

  describe("parseHslString", () => {
    it("parses standard format", () => {
      expect(parseHslString("215 50% 25%")).toEqual([215, 50, 25]);
    });

    it("parses without percent signs", () => {
      expect(parseHslString("215 50 25")).toEqual([215, 50, 25]);
    });

    it("returns zeros for invalid input", () => {
      expect(parseHslString("invalid")).toEqual([0, 0, 0]);
    });
  });

  describe("hslToString", () => {
    it("formats correctly", () => {
      expect(hslToString(215, 50, 25)).toBe("215 50% 25%");
    });

    it("rounds values", () => {
      expect(hslToString(215.7, 50.3, 25.9)).toBe("216 50% 26%");
    });
  });

  describe("adjustLightness", () => {
    it("increases lightness", () => {
      expect(adjustLightness("215 50% 25%", 20)).toBe("215 50% 45%");
    });

    it("clamps at 100", () => {
      expect(adjustLightness("215 50% 90%", 20)).toBe("215 50% 100%");
    });

    it("clamps at 0", () => {
      expect(adjustLightness("215 50% 10%", -20)).toBe("215 50% 0%");
    });
  });

  describe("shiftHue", () => {
    it("shifts hue forward", () => {
      expect(shiftHue("215 50% 25%", 150)).toBe("5 50% 25%");
    });

    it("wraps around 360", () => {
      expect(shiftHue("300 50% 25%", 100)).toBe("40 50% 25%");
    });

    it("handles negative shift", () => {
      expect(shiftHue("30 50% 25%", -60)).toBe("330 50% 25%");
    });
  });
});
