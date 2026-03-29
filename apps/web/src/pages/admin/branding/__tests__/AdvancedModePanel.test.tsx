import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { AdvancedModePanel } from "../AdvancedModePanel";
import { DEFAULT_DESIGN_SYSTEM } from "@/lib/theme/presets";
import type { DesignSystemConfig } from "@/types/admin";

describe("AdvancedModePanel", () => {
  const defaultProps = {
    config: DEFAULT_DESIGN_SYSTEM,
    onChange: vi.fn(),
  };

  it("renders all section titles", () => {
    render(createElement(AdvancedModePanel, defaultProps));

    expect(screen.getByText("Logos")).toBeTruthy();
    expect(screen.getByText("Brand Colors")).toBeTruthy();
    expect(screen.getByText("Surface Colors")).toBeTruthy();
    expect(screen.getByText("Feedback & Utility Colors")).toBeTruthy();
    expect(screen.getByText("Sidebar Colors")).toBeTruthy();
    expect(screen.getByText("Risk Level Colors")).toBeTruthy();
    expect(screen.getByText("Status Colors")).toBeTruthy();
    expect(screen.getByText("Neutral Scale (Slate)")).toBeTruthy();
    expect(screen.getByText("Accent Highlights")).toBeTruthy();
    expect(screen.getByText("Dark Mode")).toBeTruthy();
    expect(screen.getByText("Typography")).toBeTruthy();
    expect(screen.getByText("Layout & Surfaces")).toBeTruthy();
    expect(screen.getByText("Gradients")).toBeTruthy();
    expect(screen.getByText("Channel Overrides")).toBeTruthy();
    expect(screen.getByText("Custom CSS")).toBeTruthy();
  });

  it("renders color pickers for brand colors", () => {
    render(createElement(AdvancedModePanel, defaultProps));

    // Brand colors section should have Primary, Secondary, Accent pickers
    // These labels appear in multiple sections, so use getAllByText
    expect(screen.getAllByText("Primary").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Secondary").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Accent").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the dark mode toggle", () => {
    render(createElement(AdvancedModePanel, defaultProps));
    expect(screen.getByText("Manual Dark Mode Override")).toBeTruthy();
  });

  it("shows dark mode is auto-derived by default", () => {
    const config: DesignSystemConfig = {
      ...DEFAULT_DESIGN_SYSTEM,
      colors: { light: DEFAULT_DESIGN_SYSTEM.colors.light, dark: null },
    };
    render(createElement(AdvancedModePanel, { config, onChange: vi.fn() }));
    expect(screen.getByText(/automatically derived/)).toBeTruthy();
  });

  it("enables manual dark mode when toggled", () => {
    const onChange = vi.fn();
    const config: DesignSystemConfig = {
      ...DEFAULT_DESIGN_SYSTEM,
      colors: { light: DEFAULT_DESIGN_SYSTEM.colors.light, dark: null },
    };
    render(createElement(AdvancedModePanel, { config, onChange }));

    // Find the dark mode switch — it's near the "Manual Dark Mode Override" label
    const darkModeLabel = screen.getByText("Manual Dark Mode Override");
    const darkModeSection = darkModeLabel.closest("div")!.parentElement!;
    const switchEl = darkModeSection.querySelector("[role='switch']") as HTMLElement;
    fireEvent.click(switchEl);

    expect(onChange).toHaveBeenCalled();
    const newConfig = onChange.mock.calls[0][0] as DesignSystemConfig;
    expect(newConfig.colors.dark).not.toBeNull();
  });

  it("disables manual dark mode when toggled off", () => {
    const onChange = vi.fn();
    const configWithDark: DesignSystemConfig = {
      ...DEFAULT_DESIGN_SYSTEM,
      colors: {
        light: DEFAULT_DESIGN_SYSTEM.colors.light,
        dark: { ...DEFAULT_DESIGN_SYSTEM.colors.light },
      },
    };
    render(createElement(AdvancedModePanel, { config: configWithDark, onChange }));

    const darkModeLabel = screen.getByText("Manual Dark Mode Override");
    const darkModeSection = darkModeLabel.closest("div")!.parentElement!;
    const switchEl = darkModeSection.querySelector("[role='switch']") as HTMLElement;
    fireEvent.click(switchEl);

    const newConfig = onChange.mock.calls[0][0] as DesignSystemConfig;
    expect(newConfig.colors.dark).toBeNull();
  });

  it("renders custom CSS textarea", () => {
    render(createElement(AdvancedModePanel, defaultProps));
    const textarea = screen.getByPlaceholderText(/custom CSS/);
    expect(textarea).toBeTruthy();
  });

  it("updates custom CSS on input", () => {
    const onChange = vi.fn();
    render(createElement(AdvancedModePanel, { ...defaultProps, onChange }));
    const textarea = screen.getByPlaceholderText(/custom CSS/);

    fireEvent.change(textarea, { target: { value: "body { color: red; }" } });

    expect(onChange).toHaveBeenCalled();
    const newConfig = onChange.mock.calls[0][0] as DesignSystemConfig;
    expect(newConfig.customCss).toBe("body { color: red; }");
  });

  it("shows custom CSS character count", () => {
    const config: DesignSystemConfig = {
      ...DEFAULT_DESIGN_SYSTEM,
      customCss: "body { color: red; }",
    };
    render(createElement(AdvancedModePanel, { config, onChange: vi.fn() }));
    expect(screen.getByText(/20 \/ 50,000/)).toBeTruthy();
  });

  it("renders logo upload section with 4 slots", () => {
    render(createElement(AdvancedModePanel, defaultProps));
    expect(screen.getByText("Primary Logo")).toBeTruthy();
    expect(screen.getByText("Logo Mark / Icon")).toBeTruthy();
    expect(screen.getByText("Dark Mode Logo")).toBeTruthy();
    expect(screen.getByText("Footer Logo")).toBeTruthy();
  });

  it("renders typography controls", () => {
    render(createElement(AdvancedModePanel, defaultProps));
    expect(screen.getByText("Heading Font")).toBeTruthy();
    expect(screen.getByText("Body Font")).toBeTruthy();
    expect(screen.getByText("Font Scale")).toBeTruthy();
  });

  it("renders layout controls", () => {
    render(createElement(AdvancedModePanel, defaultProps));
    expect(screen.getByText("Border Radius")).toBeTruthy();
    expect(screen.getByText("Card Elevation")).toBeTruthy();
    expect(screen.getByText("Layout Theme")).toBeTruthy();
  });

  it("updates typography when font is changed", () => {
    const onChange = vi.fn();
    render(createElement(AdvancedModePanel, { ...defaultProps, onChange }));

    // Click the "Spacious" font scale option
    const spaciousButton = screen.getByText("Spacious").closest("button");
    fireEvent.click(spaciousButton!);

    expect(onChange).toHaveBeenCalled();
    const newConfig = onChange.mock.calls[0][0] as DesignSystemConfig;
    expect(newConfig.typography.fontScale).toBe("spacious");
  });

  it("updates surfaces when border radius changes", () => {
    const onChange = vi.fn();
    render(createElement(AdvancedModePanel, { ...defaultProps, onChange }));

    // Click the "Full" border radius option
    const fullButton = screen.getByText("Full").closest("button");
    fireEvent.click(fullButton!);

    expect(onChange).toHaveBeenCalled();
    const newConfig = onChange.mock.calls[0][0] as DesignSystemConfig;
    expect(newConfig.surfaces.borderRadius).toBe("full");
  });

  it("renders button shape controls", () => {
    render(createElement(AdvancedModePanel, defaultProps));
    expect(screen.getByText("Button Shape")).toBeTruthy();
    expect(screen.getByText("Square")).toBeTruthy();
    expect(screen.getByText("Pill")).toBeTruthy();
  });

  it("updates button shape when clicked", () => {
    const onChange = vi.fn();
    render(createElement(AdvancedModePanel, { ...defaultProps, onChange }));

    const pillButton = screen.getByText("Pill").closest("button");
    fireEvent.click(pillButton!);

    expect(onChange).toHaveBeenCalled();
    const newConfig = onChange.mock.calls[0][0] as DesignSystemConfig;
    expect(newConfig.surfaces.buttonShape).toBe("pill");
  });

  it("renders font weight controls", () => {
    render(createElement(AdvancedModePanel, defaultProps));
    expect(screen.getByText("Heading Weight")).toBeTruthy();
    expect(screen.getByText("Body Weight")).toBeTruthy();
  });

  it("renders gradient section", () => {
    render(createElement(AdvancedModePanel, defaultProps));
    expect(screen.getByText("Gradients")).toBeTruthy();
    expect(screen.getByText("Hero Gradient")).toBeTruthy();
  });

  it("renders channel overrides section", () => {
    render(createElement(AdvancedModePanel, defaultProps));
    expect(screen.getByText("Channel Overrides")).toBeTruthy();
    expect(screen.getByText(/No channel overrides configured/)).toBeTruthy();
  });
});
