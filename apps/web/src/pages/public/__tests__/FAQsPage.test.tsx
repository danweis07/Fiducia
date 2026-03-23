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

import FAQsPage from "../FAQsPage";

describe("FAQsPage", () => {
  it("renders without crashing", () => {
    render(createElement(FAQsPage), { wrapper: createWrapper() });
    expect(screen.getByText("Frequently Asked Questions")).toBeTruthy();
  });

  it("shows category filter buttons", () => {
    render(createElement(FAQsPage), { wrapper: createWrapper() });
    expect(screen.getByText("All Categories")).toBeTruthy();
    expect(screen.getAllByText("Membership").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Accounts").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Digital Banking").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the CTA section", () => {
    render(createElement(FAQsPage), { wrapper: createWrapper() });
    expect(screen.getByText("Still Have Questions?")).toBeTruthy();
  });
});
