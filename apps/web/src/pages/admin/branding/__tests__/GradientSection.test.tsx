import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { GradientSection } from "../GradientSection";
import type { GradientTokens } from "@/types/admin";

describe("GradientSection", () => {
  const defaultGradients: GradientTokens = {
    hero: { from: "215 50% 25%", to: "38 75% 50%", direction: "to-r" },
    cardHighlight: null,
    sidebar: null,
  };

  it("renders all 3 gradient slots", () => {
    render(createElement(GradientSection, { gradients: defaultGradients, onChange: vi.fn() }));
    expect(screen.getByText("Hero Gradient")).toBeTruthy();
    expect(screen.getByText("Card Highlight Gradient")).toBeTruthy();
    expect(screen.getByText("Sidebar Gradient")).toBeTruthy();
  });

  it("shows gradient editor when gradient is enabled", () => {
    render(createElement(GradientSection, { gradients: defaultGradients, onChange: vi.fn() }));
    // Hero is enabled, so From/To labels should appear
    expect(screen.getByText("From")).toBeTruthy();
    expect(screen.getByText("To")).toBeTruthy();
  });

  it("shows direction selector for active gradient", () => {
    render(createElement(GradientSection, { gradients: defaultGradients, onChange: vi.fn() }));
    expect(screen.getByText("Direction")).toBeTruthy();
  });

  it("enables a gradient slot when switch is toggled on", () => {
    const gradients: GradientTokens = { hero: null, cardHighlight: null, sidebar: null };
    const onChange = vi.fn();
    render(createElement(GradientSection, { gradients, onChange }));

    // Find all switches - they correspond to hero, cardHighlight, sidebar
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]); // Enable hero

    expect(onChange).toHaveBeenCalled();
    const newGradients = onChange.mock.calls[0][0] as GradientTokens;
    expect(newGradients.hero).not.toBeNull();
    expect(newGradients.hero!.from).toBeTruthy();
    expect(newGradients.hero!.to).toBeTruthy();
    expect(newGradients.hero!.direction).toBeTruthy();
  });

  it("disables a gradient slot when switch is toggled off", () => {
    const onChange = vi.fn();
    render(createElement(GradientSection, { gradients: defaultGradients, onChange }));

    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]); // Toggle hero off

    const newGradients = onChange.mock.calls[0][0] as GradientTokens;
    expect(newGradients.hero).toBeNull();
  });

  it("removes gradient when Remove button is clicked", () => {
    const onChange = vi.fn();
    render(createElement(GradientSection, { gradients: defaultGradients, onChange }));

    fireEvent.click(screen.getByText("Remove"));
    const newGradients = onChange.mock.calls[0][0] as GradientTokens;
    expect(newGradients.hero).toBeNull();
  });
});
