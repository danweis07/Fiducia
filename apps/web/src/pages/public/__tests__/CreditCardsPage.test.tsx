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

import CreditCardsPage from "../CreditCardsPage";

describe("CreditCardsPage", () => {
  it("renders without crashing", () => {
    render(createElement(CreditCardsPage), { wrapper: createWrapper() });
    expect(screen.getByText("Credit Cards That Reward You")).toBeTruthy();
  });

  it("shows card products", () => {
    render(createElement(CreditCardsPage), { wrapper: createWrapper() });
    expect(screen.getByText("Choose Your Card")).toBeTruthy();
    expect(screen.getByText("Rewards Visa")).toBeTruthy();
    expect(screen.getByText("Cash Back")).toBeTruthy();
    expect(screen.getByText("Low Rate")).toBeTruthy();
  });

  it("shows shared card benefits", () => {
    render(createElement(CreditCardsPage), { wrapper: createWrapper() });
    expect(screen.getByText("Every Demo CU Card Includes")).toBeTruthy();
    expect(screen.getByText("Zero Liability")).toBeTruthy();
    expect(screen.getByText("Contactless Pay")).toBeTruthy();
  });

  it("shows the final CTA", () => {
    render(createElement(CreditCardsPage), { wrapper: createWrapper() });
    expect(screen.getByText("Find the Right Card for You")).toBeTruthy();
  });
});
