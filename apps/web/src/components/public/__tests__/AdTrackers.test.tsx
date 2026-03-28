import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";

// ---------------------------------------------------------------------------
// Mock cookie consent
// ---------------------------------------------------------------------------

const mockConsent = { analytics: false, marketing: false };

vi.mock("../CookieConsent", () => ({
  useCookieConsent: vi.fn(() => mockConsent),
}));

import { AdTrackers, trackEvent, trackConversion } from "../AdTrackers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function trackerScripts(): HTMLScriptElement[] {
  return Array.from(document.querySelectorAll("script[data-cookie-tracker]"));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("trackEvent", () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).gtag;
  });

  it("calls window.gtag when available", () => {
    const gtag = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = gtag;

    trackEvent("category1", "action1", "label1", 42);

    expect(gtag).toHaveBeenCalledWith("event", "action1", {
      event_category: "category1",
      event_label: "label1",
      value: 42,
    });
  });

  it("is a no-op when gtag is not available", () => {
    // Should not throw
    expect(() => trackEvent("cat", "act")).not.toThrow();
  });
});

describe("trackConversion", () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).gtag;
  });

  it("calls window.gtag with conversion event", () => {
    const gtag = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = gtag;

    trackConversion("AW-123/abc");

    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-123/abc",
    });
  });

  it("is a no-op when gtag is not available", () => {
    expect(() => trackConversion("AW-123")).not.toThrow();
  });
});

describe("AdTrackers component", () => {
  beforeEach(() => {
    // Reset consent defaults
    mockConsent.analytics = false;
    mockConsent.marketing = false;
    // Clear any injected scripts
    trackerScripts().forEach((el) => el.remove());
  });

  afterEach(() => {
    trackerScripts().forEach((el) => el.remove());
  });

  const trackerProps = { ga4Id: "G-TEST123", gtmId: "GTM-TEST456" };

  it("renders null (no visible output)", () => {
    const { container } = render(createElement(AdTrackers, trackerProps));
    expect(container.innerHTML).toBe("");
  });

  it("injects analytics scripts when analytics consent is true", () => {
    mockConsent.analytics = true;
    render(createElement(AdTrackers, trackerProps));

    const scripts = trackerScripts();
    const ids = scripts.map((s) => s.getAttribute("data-cookie-tracker"));
    expect(ids).toContain("ga4");
    expect(ids).toContain("ga4-init");
    expect(ids).toContain("gtm");
  });

  it("does not inject analytics scripts when analytics consent is false", () => {
    mockConsent.analytics = false;
    render(createElement(AdTrackers, trackerProps));

    const ids = trackerScripts().map((s) => s.getAttribute("data-cookie-tracker"));
    expect(ids).not.toContain("ga4");
    expect(ids).not.toContain("ga4-init");
  });

  it("removes analytics scripts when consent revoked", () => {
    // First render with consent
    mockConsent.analytics = true;
    const { unmount } = render(createElement(AdTrackers, trackerProps));
    expect(trackerScripts().some((s) => s.getAttribute("data-cookie-tracker") === "ga4")).toBe(
      true,
    );

    unmount();

    // Re-render without consent
    mockConsent.analytics = false;
    render(createElement(AdTrackers, trackerProps));

    const ids = trackerScripts().map((s) => s.getAttribute("data-cookie-tracker"));
    expect(ids).not.toContain("ga4");
    expect(ids).not.toContain("ga4-init");
  });
});
