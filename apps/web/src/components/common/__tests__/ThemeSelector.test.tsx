import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUpdateTheme = vi.fn();
const mockResetTheme = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primaryColor: "220 90% 56%",
      mode: "light",
      font: "inter",
      layout: "default",
      highContrast: false,
      reducedMotion: false,
    },
    updateTheme: mockUpdateTheme,
    resetTheme: mockResetTheme,
  }),
}));

vi.mock("@/lib/theme", () => ({
  THEME_PRESETS: {
    default: { primaryColor: "220 90% 56%", layout: "default" },
    ocean: { primaryColor: "200 80% 50%", layout: "default" },
  },
  PRESET_LABELS: { default: "Default", ocean: "Ocean" },
  FONT_LABELS: { inter: "Inter", roboto: "Roboto" },
  LAYOUT_LABELS: { default: "Default", compact: "Compact" },
}));

import { ThemeSelector } from "../ThemeSelector";

describe("ThemeSelector", () => {
  it("renders the appearance card heading", () => {
    render(<ThemeSelector />);
    expect(screen.getByText("settings.appearance")).toBeTruthy();
  });

  it("renders theme preset buttons", () => {
    render(<ThemeSelector />);
    // "Default" may appear in both preset button and layout select
    expect(screen.getAllByText("Default").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Ocean")).toBeTruthy();
  });

  it("renders mode toggle buttons", () => {
    render(<ThemeSelector />);
    expect(screen.getByLabelText("settings.lightMode")).toBeTruthy();
    expect(screen.getByLabelText("settings.systemMode")).toBeTruthy();
  });

  it("renders the reset defaults button and calls resetTheme on click", () => {
    render(<ThemeSelector />);
    const resetBtn = screen.getByText("settings.resetDefaults");
    fireEvent.click(resetBtn);
    expect(mockResetTheme).toHaveBeenCalled();
  });
});
