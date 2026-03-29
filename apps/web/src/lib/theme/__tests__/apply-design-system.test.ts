import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyDesignSystem } from "../apply-design-system";
import { DEFAULT_DESIGN_SYSTEM } from "../presets";
import type { DesignSystemConfig } from "@/types/admin";

// Mock font-loader to avoid DOM side effects
vi.mock("../font-loader", () => ({
  loadFont: vi.fn(),
}));

describe("applyDesignSystem", () => {
  beforeEach(() => {
    // Reset document state
    document.documentElement.style.cssText = "";
    document.body.style.cssText = "";
    document.documentElement.removeAttribute("data-layout");
    const existing = document.getElementById("tenant-custom-css");
    if (existing) existing.remove();
  });

  describe("color palette application", () => {
    it("sets all core brand CSS variables on :root", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const root = document.documentElement;

      expect(root.style.getPropertyValue("--primary")).toBeTruthy();
      expect(root.style.getPropertyValue("--primary-foreground")).toBeTruthy();
      expect(root.style.getPropertyValue("--secondary")).toBeTruthy();
      expect(root.style.getPropertyValue("--accent")).toBeTruthy();
    });

    it("sets surface CSS variables", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const root = document.documentElement;

      expect(root.style.getPropertyValue("--background")).toBeTruthy();
      expect(root.style.getPropertyValue("--foreground")).toBeTruthy();
      expect(root.style.getPropertyValue("--card")).toBeTruthy();
      expect(root.style.getPropertyValue("--card-foreground")).toBeTruthy();
      expect(root.style.getPropertyValue("--popover")).toBeTruthy();
      expect(root.style.getPropertyValue("--muted")).toBeTruthy();
    });

    it("sets sidebar CSS variables", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const root = document.documentElement;

      expect(root.style.getPropertyValue("--sidebar-background")).toBeTruthy();
      expect(root.style.getPropertyValue("--sidebar-foreground")).toBeTruthy();
      expect(root.style.getPropertyValue("--sidebar-primary")).toBeTruthy();
      expect(root.style.getPropertyValue("--sidebar-border")).toBeTruthy();
    });

    it("sets risk level CSS variables", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const root = document.documentElement;

      expect(root.style.getPropertyValue("--risk-critical")).toBeTruthy();
      expect(root.style.getPropertyValue("--risk-critical-light")).toBeTruthy();
      expect(root.style.getPropertyValue("--risk-high")).toBeTruthy();
      expect(root.style.getPropertyValue("--risk-low")).toBeTruthy();
    });

    it("sets status CSS variables", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const root = document.documentElement;

      expect(root.style.getPropertyValue("--status-critical")).toBeTruthy();
      expect(root.style.getPropertyValue("--status-warning")).toBeTruthy();
      expect(root.style.getPropertyValue("--status-success")).toBeTruthy();
      expect(root.style.getPropertyValue("--status-info")).toBeTruthy();
    });

    it("sets slate neutral CSS variables", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const root = document.documentElement;

      expect(root.style.getPropertyValue("--slate-50")).toBeTruthy();
      expect(root.style.getPropertyValue("--slate-500")).toBeTruthy();
      expect(root.style.getPropertyValue("--slate-800")).toBeTruthy();
    });

    it("sets gold accent CSS variables", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const root = document.documentElement;

      expect(root.style.getPropertyValue("--gold")).toBeTruthy();
      expect(root.style.getPropertyValue("--gold-light")).toBeTruthy();
    });

    it("applies light palette values in light mode", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const root = document.documentElement;
      expect(root.style.getPropertyValue("--primary")).toBe(
        DEFAULT_DESIGN_SYSTEM.colors.light.primary.base,
      );
    });

    it("applies different values in dark mode", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const lightPrimary = document.documentElement.style.getPropertyValue("--primary");

      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "dark");
      const darkPrimary = document.documentElement.style.getPropertyValue("--primary");

      expect(darkPrimary).not.toBe(lightPrimary);
    });

    it("uses manual dark palette when provided", () => {
      const config: DesignSystemConfig = {
        ...DEFAULT_DESIGN_SYSTEM,
        colors: {
          light: DEFAULT_DESIGN_SYSTEM.colors.light,
          dark: {
            ...DEFAULT_DESIGN_SYSTEM.colors.light,
            primary: { base: "999 99% 99%", foreground: "0 0% 0%" },
          },
        },
      };
      applyDesignSystem(config, "dark");
      expect(document.documentElement.style.getPropertyValue("--primary")).toBe("999 99% 99%");
    });

    it("auto-derives dark palette when dark is null", () => {
      const config: DesignSystemConfig = {
        ...DEFAULT_DESIGN_SYSTEM,
        colors: { light: DEFAULT_DESIGN_SYSTEM.colors.light, dark: null },
      };
      applyDesignSystem(config, "dark");
      // Should still set a primary value (auto-derived)
      expect(document.documentElement.style.getPropertyValue("--primary")).toBeTruthy();
    });
  });

  describe("border radius", () => {
    it("sets --radius for each border radius option", () => {
      const options = ["none", "sm", "md", "lg", "full"] as const;
      for (const br of options) {
        const config = {
          ...DEFAULT_DESIGN_SYSTEM,
          surfaces: { ...DEFAULT_DESIGN_SYSTEM.surfaces, borderRadius: br },
        };
        applyDesignSystem(config, "light");
        expect(document.documentElement.style.getPropertyValue("--radius")).toBeTruthy();
      }
    });

    it("maps 'none' to 0rem", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        surfaces: { ...DEFAULT_DESIGN_SYSTEM.surfaces, borderRadius: "none" as const },
      };
      applyDesignSystem(config, "light");
      expect(document.documentElement.style.getPropertyValue("--radius")).toBe("0rem");
    });
  });

  describe("typography", () => {
    it("sets --font-family from bodyFont", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const ff = document.documentElement.style.getPropertyValue("--font-family");
      expect(ff).toContain(DEFAULT_DESIGN_SYSTEM.typography.bodyFont);
    });

    it("sets --font-family-heading from headingFont", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const ff = document.documentElement.style.getPropertyValue("--font-family-heading");
      expect(ff).toContain(DEFAULT_DESIGN_SYSTEM.typography.headingFont);
    });

    it("sets body fontFamily", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      expect(document.body.style.fontFamily).toContain(DEFAULT_DESIGN_SYSTEM.typography.bodyFont);
    });
  });

  describe("font scale", () => {
    it("sets compact scale to 0.875", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        typography: { ...DEFAULT_DESIGN_SYSTEM.typography, fontScale: "compact" as const },
      };
      applyDesignSystem(config, "light");
      expect(document.documentElement.style.getPropertyValue("--font-scale")).toBe("0.875");
    });

    it("sets default scale to 1", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      expect(document.documentElement.style.getPropertyValue("--font-scale")).toBe("1");
    });

    it("sets spacious scale to 1.125", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        typography: { ...DEFAULT_DESIGN_SYSTEM.typography, fontScale: "spacious" as const },
      };
      applyDesignSystem(config, "light");
      expect(document.documentElement.style.getPropertyValue("--font-scale")).toBe("1.125");
    });
  });

  describe("card elevation", () => {
    it("sets flat to none", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        surfaces: { ...DEFAULT_DESIGN_SYSTEM.surfaces, cardElevation: "flat" as const },
      };
      applyDesignSystem(config, "light");
      expect(document.documentElement.style.getPropertyValue("--card-shadow")).toBe("none");
    });

    it("sets subtle to a shadow value", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        surfaces: { ...DEFAULT_DESIGN_SYSTEM.surfaces, cardElevation: "subtle" as const },
      };
      applyDesignSystem(config, "light");
      const shadow = document.documentElement.style.getPropertyValue("--card-shadow");
      expect(shadow).toContain("rgb");
    });

    it("sets raised to a larger shadow value", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        surfaces: { ...DEFAULT_DESIGN_SYSTEM.surfaces, cardElevation: "raised" as const },
      };
      applyDesignSystem(config, "light");
      const shadow = document.documentElement.style.getPropertyValue("--card-shadow");
      expect(shadow).toContain("4px");
    });
  });

  describe("layout theme", () => {
    it("sets data-layout attribute on root", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      expect(document.documentElement.dataset.layout).toBe(
        DEFAULT_DESIGN_SYSTEM.surfaces.layoutTheme,
      );
    });

    it("updates when layout theme changes", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        surfaces: { ...DEFAULT_DESIGN_SYSTEM.surfaces, layoutTheme: "dashboard" as const },
      };
      applyDesignSystem(config, "light");
      expect(document.documentElement.dataset.layout).toBe("dashboard");
    });
  });

  describe("font weights", () => {
    it("sets --font-weight-heading", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      expect(document.documentElement.style.getPropertyValue("--font-weight-heading")).toBe(
        DEFAULT_DESIGN_SYSTEM.typography.headingWeight,
      );
    });

    it("sets --font-weight-body", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      expect(document.documentElement.style.getPropertyValue("--font-weight-body")).toBe(
        DEFAULT_DESIGN_SYSTEM.typography.bodyWeight,
      );
    });

    it("updates when weight changes", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        typography: { ...DEFAULT_DESIGN_SYSTEM.typography, headingWeight: "800" as const },
      };
      applyDesignSystem(config, "light");
      expect(document.documentElement.style.getPropertyValue("--font-weight-heading")).toBe("800");
    });
  });

  describe("button shape", () => {
    it("sets --button-radius for square", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        surfaces: { ...DEFAULT_DESIGN_SYSTEM.surfaces, buttonShape: "square" as const },
      };
      applyDesignSystem(config, "light");
      expect(document.documentElement.style.getPropertyValue("--button-radius")).toBe("0.25rem");
    });

    it("sets --button-radius for rounded", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        surfaces: { ...DEFAULT_DESIGN_SYSTEM.surfaces, buttonShape: "rounded" as const },
      };
      applyDesignSystem(config, "light");
      expect(document.documentElement.style.getPropertyValue("--button-radius")).toBe("0.5rem");
    });

    it("sets --button-radius for pill", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        surfaces: { ...DEFAULT_DESIGN_SYSTEM.surfaces, buttonShape: "pill" as const },
      };
      applyDesignSystem(config, "light");
      expect(document.documentElement.style.getPropertyValue("--button-radius")).toBe("9999px");
    });
  });

  describe("gradients", () => {
    it("sets --gradient-hero when hero gradient is defined", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      const hero = document.documentElement.style.getPropertyValue("--gradient-hero");
      expect(hero).toContain("linear-gradient");
      expect(hero).toContain("hsl");
    });

    it("sets --gradient-hero to none when hero is null", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        gradients: { hero: null, cardHighlight: null, sidebar: null },
      };
      applyDesignSystem(config, "light");
      expect(document.documentElement.style.getPropertyValue("--gradient-hero")).toBe("none");
    });

    it("sets --gradient-card-highlight to none when not defined", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      expect(document.documentElement.style.getPropertyValue("--gradient-card-highlight")).toBe(
        "none",
      );
    });

    it("sets correct gradient direction", () => {
      const config = {
        ...DEFAULT_DESIGN_SYSTEM,
        gradients: {
          hero: { from: "215 50% 25%", to: "38 75% 50%", direction: "to-b" as const },
          cardHighlight: null,
          sidebar: null,
        },
      };
      applyDesignSystem(config, "light");
      const hero = document.documentElement.style.getPropertyValue("--gradient-hero");
      expect(hero).toContain("to bottom");
    });
  });

  describe("custom CSS injection", () => {
    it("injects custom CSS into a style element", () => {
      const config = { ...DEFAULT_DESIGN_SYSTEM, customCss: "body { color: red; }" };
      applyDesignSystem(config, "light");

      const styleEl = document.getElementById("tenant-custom-css");
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toBe("body { color: red; }");
    });

    it("updates existing style element on re-apply", () => {
      const config1 = { ...DEFAULT_DESIGN_SYSTEM, customCss: "body { color: red; }" };
      applyDesignSystem(config1, "light");

      const config2 = { ...DEFAULT_DESIGN_SYSTEM, customCss: "body { color: blue; }" };
      applyDesignSystem(config2, "light");

      const styleEl = document.getElementById("tenant-custom-css");
      expect(styleEl!.textContent).toBe("body { color: blue; }");
      // Should be the same element, not a duplicate
      expect(document.querySelectorAll("#tenant-custom-css").length).toBe(1);
    });

    it("clears style element when customCss is empty", () => {
      const config1 = { ...DEFAULT_DESIGN_SYSTEM, customCss: "body { color: red; }" };
      applyDesignSystem(config1, "light");

      const config2 = { ...DEFAULT_DESIGN_SYSTEM, customCss: "" };
      applyDesignSystem(config2, "light");

      const styleEl = document.getElementById("tenant-custom-css");
      expect(styleEl!.textContent).toBe("");
    });

    it("does not create style element when no custom CSS", () => {
      applyDesignSystem(DEFAULT_DESIGN_SYSTEM, "light");
      // DEFAULT_DESIGN_SYSTEM has empty customCss and no pre-existing element
      const styleEl = document.getElementById("tenant-custom-css");
      expect(styleEl).toBeNull();
    });
  });
});
