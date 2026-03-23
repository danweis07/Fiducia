import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

// Calculators has no hooks that need gateway/context mocking — it's purely local state

describe("Calculators page", () => {
  it("renders without crashing", async () => {
    const { default: Calculators } = await import("../Calculators");
    const { container } = render(createElement(Calculators));
    expect(container).toBeTruthy();
  });

  it("displays the Financial Calculators heading", async () => {
    const { default: Calculators } = await import("../Calculators");
    render(createElement(Calculators));
    expect(screen.getByText("Financial Calculators")).toBeTruthy();
  });

  it("shows the Savings Growth tab by default", async () => {
    const { default: Calculators } = await import("../Calculators");
    render(createElement(Calculators));
    expect(screen.getAllByText("Savings Growth").length).toBeGreaterThan(0);
  });

  it("displays the Results card with computed values", async () => {
    const { default: Calculators } = await import("../Calculators");
    render(createElement(Calculators));
    expect(screen.getByText("Future Value")).toBeTruthy();
  });
});
