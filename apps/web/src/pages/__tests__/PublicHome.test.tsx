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

vi.mock("@/components/public/MobileAppBanner", () => ({
  MobileAppBanner: () => null,
}));

vi.mock("@/components/public/StructuredData", () => ({
  StructuredData: () => null,
}));

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(MemoryRouter, null, children);
}

import PublicHome from "../PublicHome";

describe("PublicHome", () => {
  it("renders without crashing", () => {
    render(createElement(PublicHome), { wrapper: createWrapper() });
    expect(screen.getByText("Banking That Puts")).toBeTruthy();
  });

  it("shows products and services section", () => {
    render(createElement(PublicHome), { wrapper: createWrapper() });
    expect(screen.getByText("Products & Services")).toBeTruthy();
  });

  it("shows the CTA section", () => {
    render(createElement(PublicHome), { wrapper: createWrapper() });
    expect(screen.getByText("Ready to Join the Demo CU Family?")).toBeTruthy();
  });
});
