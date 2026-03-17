import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

vi.mock("../CookieConsent", () => ({
  useCookieConsent: () => ({
    analytics: false,
    marketing: false,
    showBanner: false,
    openBanner: vi.fn(),
    updateConsent: vi.fn(),
  }),
}));

import { ConsentProviderBridge } from "../ConsentProviderBridge";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConsentProviderBridge", () => {
  it("renders null (no visible output)", () => {
    const { container } = render(
      createElement(ConsentProviderBridge, { config: { provider: "built-in" } }),
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders null with ketch provider (no crash without codes)", () => {
    const { container } = render(
      createElement(ConsentProviderBridge, { config: { provider: "ketch" } }),
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders null with onetrust provider (no crash without domain script)", () => {
    const { container } = render(
      createElement(ConsentProviderBridge, { config: { provider: "onetrust" } }),
    );
    expect(container.innerHTML).toBe("");
  });
});
