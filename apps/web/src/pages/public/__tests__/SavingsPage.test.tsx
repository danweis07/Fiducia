import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/public/PublicShell", () => ({
  PublicShell: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-testid": "public-shell" }, children),
}));

vi.mock("@/components/public/SEOHead", () => ({
  SEOHead: () => null,
}));

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(MemoryRouter, null, children);
}

import SavingsPage from "../SavingsPage";

describe("SavingsPage", () => {
  it("renders without crashing", () => {
    render(createElement(SavingsPage), { wrapper: createWrapper() });
    expect(screen.getByText("Grow Your Savings")).toBeTruthy();
  });

  it("shows NCUA insurance notice", () => {
    render(createElement(SavingsPage), { wrapper: createWrapper() });
    expect(screen.getByText(/Federally insured up to \$250,000 by NCUA/)).toBeTruthy();
  });

  it("shows savings account products", () => {
    render(createElement(SavingsPage), { wrapper: createWrapper() });
    expect(screen.getByText("Savings Accounts")).toBeTruthy();
    expect(screen.getByText("Regular Savings")).toBeTruthy();
    expect(screen.getByText("High-Yield Savings")).toBeTruthy();
    expect(screen.getByText("Money Market")).toBeTruthy();
  });

  it("shows share certificates section", () => {
    render(createElement(SavingsPage), { wrapper: createWrapper() });
    expect(screen.getByText("Share Certificates (CDs)")).toBeTruthy();
    expect(screen.getByText("12-Month Certificate")).toBeTruthy();
  });

  it("shows the final CTA", () => {
    render(createElement(SavingsPage), { wrapper: createWrapper() });
    expect(screen.getByText("Start Saving Smarter Today")).toBeTruthy();
  });
});
