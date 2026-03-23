import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/contexts/TenantContext", () => ({
  useAuth: () => ({
    tenant: { features: {}, region: "US" },
  }),
}));

import { MobileBottomNav } from "../MobileBottomNav";

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(MemoryRouter, { initialEntries: ["/dashboard"] }, children);
}

describe("MobileBottomNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(createElement(MobileBottomNav), { wrapper });
    expect(container.querySelector("nav")).toBeTruthy();
  });
});
