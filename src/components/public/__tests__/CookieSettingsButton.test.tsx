import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

const mockConsent = {
  analytics: false,
  marketing: false,
  showBanner: false,
  openBanner: vi.fn(),
  updateConsent: vi.fn(),
};

vi.mock("../CookieConsent", () => ({
  useCookieConsent: () => mockConsent,
}));

import { CookieSettingsButton } from "../CookieSettingsButton";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CookieSettingsButton", () => {
  it("renders cookie settings button when banner is hidden", () => {
    mockConsent.showBanner = false;
    render(createElement(CookieSettingsButton));
    expect(screen.getByLabelText("Cookie settings")).toBeTruthy();
  });

  it("renders nothing when banner is visible", () => {
    mockConsent.showBanner = true;
    const { container } = render(createElement(CookieSettingsButton));
    expect(container.innerHTML).toBe("");
    mockConsent.showBanner = false;
  });
});
