import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { EasyModePanel } from "../EasyModePanel";
import { DEFAULT_DESIGN_SYSTEM, DESIGN_PRESETS } from "@/lib/theme/presets";
import type { DesignSystemConfig } from "@/types/admin";

describe("EasyModePanel", () => {
  const defaultProps = {
    config: DEFAULT_DESIGN_SYSTEM,
    onChange: vi.fn(),
  };

  it("renders all 5 preset options", () => {
    render(createElement(EasyModePanel, defaultProps));
    expect(screen.getByText("Classic")).toBeTruthy();
    expect(screen.getByText("Modern")).toBeTruthy();
    expect(screen.getByText("Compact")).toBeTruthy();
    expect(screen.getByText("Warmth")).toBeTruthy();
    expect(screen.getByText("Professional")).toBeTruthy();
  });

  it("renders preset descriptions", () => {
    render(createElement(EasyModePanel, defaultProps));
    expect(screen.getByText(/Navy & gold/)).toBeTruthy();
    expect(screen.getByText(/Blue & teal/)).toBeTruthy();
  });

  it("renders brand color pickers", () => {
    render(createElement(EasyModePanel, defaultProps));
    expect(screen.getByText("Primary Color")).toBeTruthy();
    expect(screen.getByText("Accent Color")).toBeTruthy();
  });

  it("renders logo section", () => {
    render(createElement(EasyModePanel, defaultProps));
    expect(screen.getByText("Logo")).toBeTruthy();
  });

  it("calls onChange with new preset config when a preset is selected", () => {
    const onChange = vi.fn();
    render(createElement(EasyModePanel, { ...defaultProps, onChange }));

    const modernButton = screen.getByText("Modern").closest("button");
    fireEvent.click(modernButton!);

    expect(onChange).toHaveBeenCalledTimes(1);
    const newConfig = onChange.mock.calls[0][0] as DesignSystemConfig;
    expect(newConfig.presetId).toBe("modern");
    expect(newConfig.surfaces.layoutTheme).toBe("modern");
  });

  it("preserves logos when switching presets", () => {
    const configWithLogo: DesignSystemConfig = {
      ...DEFAULT_DESIGN_SYSTEM,
      logos: {
        primary: "https://example.com/logo.svg",
        mark: null,
        primaryDark: null,
        footer: null,
      },
    };
    const onChange = vi.fn();
    render(createElement(EasyModePanel, { config: configWithLogo, onChange }));

    const modernButton = screen.getByText("Modern").closest("button");
    fireEvent.click(modernButton!);

    const newConfig = onChange.mock.calls[0][0] as DesignSystemConfig;
    expect(newConfig.logos.primary).toBe("https://example.com/logo.svg");
  });

  it("re-derives full palette when primary color changes", () => {
    const onChange = vi.fn();
    render(createElement(EasyModePanel, { ...defaultProps, onChange }));

    // Find the primary color hex input (first textbox in the brand colors section)
    const colorInputs = document.querySelectorAll('input[type="color"]');
    const primaryColorInput = colorInputs[0]; // First color picker is primary
    fireEvent.change(primaryColorInput, { target: { value: "#ff0000" } });

    expect(onChange).toHaveBeenCalled();
    const newConfig = onChange.mock.calls[0][0] as DesignSystemConfig;
    // The new palette should have a different primary
    expect(newConfig.colors.light.primary.base).not.toBe(
      DEFAULT_DESIGN_SYSTEM.colors.light.primary.base,
    );
    // And dark palette should also be regenerated
    expect(newConfig.colors.dark).toBeTruthy();
  });

  it("shows logo preview when logo URL is set", () => {
    const configWithLogo: DesignSystemConfig = {
      ...DEFAULT_DESIGN_SYSTEM,
      logos: {
        primary: "https://example.com/logo.svg",
        mark: null,
        primaryDark: null,
        footer: null,
      },
    };
    render(createElement(EasyModePanel, { config: configWithLogo, onChange: vi.fn() }));

    const img = screen.getByAltText("Logo");
    expect(img).toBeTruthy();
    expect((img as HTMLImageElement).src).toContain("example.com/logo.svg");
  });

  it("shows upload prompt when no logo", () => {
    render(createElement(EasyModePanel, defaultProps));
    expect(screen.getByText(/Upload your institution/)).toBeTruthy();
  });

  it("removes logo when remove button is clicked", () => {
    const configWithLogo: DesignSystemConfig = {
      ...DEFAULT_DESIGN_SYSTEM,
      logos: {
        primary: "https://example.com/logo.svg",
        mark: null,
        primaryDark: null,
        footer: null,
      },
    };
    const onChange = vi.fn();
    render(createElement(EasyModePanel, { config: configWithLogo, onChange }));

    fireEvent.click(screen.getByText("Remove"));
    const newConfig = onChange.mock.calls[0][0] as DesignSystemConfig;
    expect(newConfig.logos.primary).toBeNull();
  });
});
