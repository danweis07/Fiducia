import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
}));

vi.mock("@/contexts/TenantContext", () => ({
  useAuth: () => ({
    user: { email: "test@test.com" },
    tenant: { displayName: "Test User", tenantName: "TestBank", features: {}, region: "US" },
    isAuthenticated: true,
    signOut: vi.fn(),
  }),
}));

import { Header } from "../Header";

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(MemoryRouter, { initialEntries: ["/dashboard"] }, children);
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(createElement(Header), { wrapper });
    expect(container.querySelector("header")).toBeTruthy();
  });

  it("renders tenant name", () => {
    const { container } = render(createElement(Header), { wrapper });
    expect(container.textContent).toContain("TestBank");
  });
});
