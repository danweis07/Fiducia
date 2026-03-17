import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("react-router-dom", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => createElement("a", { href: to, ...rest }, children),
  Outlet: () => createElement("div", { "data-testid": "outlet" }, "Outlet Content"),
  useNavigate: () => vi.fn(),
}));

vi.mock("../CookieConsent", () => ({
  CookieConsentProvider: ({ children }: { children?: React.ReactNode }) =>
    createElement("div", null, children),
  CookieConsent: () => createElement("div", { "data-testid": "cookie-consent" }),
  useCookieConsent: () => ({
    analytics: false,
    marketing: false,
    showBanner: false,
    openBanner: vi.fn(),
    updateConsent: vi.fn(),
  }),
}));

vi.mock("../AdTrackers", () => ({
  AdTrackers: () => null,
}));

vi.mock("../AIMetaTags", () => ({
  AIMetaTags: () => null,
}));

vi.mock("../ConsentProviderBridge", () => ({
  ConsentProviderBridge: () => null,
  getDefaultConsentConfig: () => ({ provider: "built-in" }),
}));

vi.mock("../CookieSettingsButton", () => ({
  CookieSettingsButton: () => null,
}));

import { PublicShell } from "../PublicShell";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PublicShell", () => {
  it("renders header and footer", () => {
    const { container } = render(createElement(PublicShell));
    expect(container.querySelector("header")).toBeTruthy();
    expect(container.querySelector("footer")).toBeTruthy();
  });

  it("renders Outlet when no children provided", () => {
    render(createElement(PublicShell));
    expect(screen.getByTestId("outlet")).toBeTruthy();
  });

  it("renders children when provided", () => {
    render(createElement(PublicShell, null, createElement("div", null, "Custom Page Content")));
    expect(screen.getByText("Custom Page Content")).toBeTruthy();
  });

  it("renders with tenant name", () => {
    render(createElement(PublicShell, { tenantName: "My CU" }));
    expect(screen.getByText("My CU")).toBeTruthy();
  });
});
