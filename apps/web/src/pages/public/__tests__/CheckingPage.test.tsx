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

import CheckingPage from "../CheckingPage";

describe("CheckingPage", () => {
  it("renders without crashing", () => {
    render(createElement(CheckingPage), { wrapper: createWrapper() });
    expect(screen.getByText("Free Checking")).toBeTruthy();
  });

  it("shows feature highlights", () => {
    render(createElement(CheckingPage), { wrapper: createWrapper() });
    expect(screen.getByText("Why Members Love Our Checking")).toBeTruthy();
    expect(screen.getAllByText("No Monthly Fees").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Free Debit Card").length).toBeGreaterThan(0);
  });

  it("shows account tiers", () => {
    render(createElement(CheckingPage), { wrapper: createWrapper() });
    expect(screen.getByText("Choose Your Checking Account")).toBeTruthy();
    expect(screen.getByText("Basic Checking")).toBeTruthy();
    expect(screen.getByText("Premium Checking")).toBeTruthy();
    expect(screen.getByText("Student Checking")).toBeTruthy();
  });

  it("shows the final CTA", () => {
    render(createElement(CheckingPage), { wrapper: createWrapper() });
    expect(screen.getByText("Ready to Switch to Better Banking?")).toBeTruthy();
  });
});
