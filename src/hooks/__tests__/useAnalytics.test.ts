import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

const mockAnalytics = {
  name: "console",
  init: vi.fn(),
  identify: vi.fn(),
  track: vi.fn(),
  page: vi.fn(),
  setUserProperties: vi.fn(),
  reset: vi.fn(),
  optOut: vi.fn(),
  optIn: vi.fn(),
  revenue: vi.fn(),
  timeEvent: vi.fn(),
  flush: vi.fn(),
};

vi.mock("@/lib/services/analytics", () => ({
  getAnalytics: () => mockAnalytics,
}));

import { useAnalytics } from "../useAnalytics";

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(MemoryRouter, { initialEntries: ["/dashboard"] }, children);
}

describe("useAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tracking functions", () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });
    expect(typeof result.current.identify).toBe("function");
    expect(typeof result.current.track).toBe("function");
    expect(typeof result.current.trackLogin).toBe("function");
    expect(typeof result.current.trackAccountViewed).toBe("function");
    expect(typeof result.current.trackTransferInitiated).toBe("function");
    expect(typeof result.current.trackTransferCompleted).toBe("function");
    expect(typeof result.current.trackDepositSubmitted).toBe("function");
    expect(typeof result.current.trackCardAction).toBe("function");
    expect(typeof result.current.trackBillPaid).toBe("function");
    expect(typeof result.current.trackFeatureUsed).toBe("function");
    expect(typeof result.current.trackSignup).toBe("function");
    expect(typeof result.current.trackLogout).toBe("function");
  });

  it("identify calls analytics.identify", () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });
    result.current.identify("user-1", { email: "test@test.com" });
    expect(mockAnalytics.identify).toHaveBeenCalledWith({ id: "user-1", email: "test@test.com" });
  });

  it("track calls analytics.track", () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });
    result.current.track("Test Event", { key: "val" });
    expect(mockAnalytics.track).toHaveBeenCalledWith("Test Event", { key: "val" });
  });

  it("trackLogin sends correct event", () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });
    result.current.trackLogin("password");
    expect(mockAnalytics.track).toHaveBeenCalledWith("Member Logged In", { method: "password" });
  });

  it("trackLogout resets analytics", () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });
    result.current.trackLogout();
    expect(mockAnalytics.track).toHaveBeenCalledWith("Member Logged Out");
    expect(mockAnalytics.reset).toHaveBeenCalled();
  });
});
