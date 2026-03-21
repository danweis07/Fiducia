import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIdleTimeout } from "../useIdleTimeout";

const mockSignOut = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/backend", () => ({
  getBackend: vi.fn(() => ({
    auth: { signOut: mockSignOut },
  })),
}));

describe("useIdleTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    sessionStorage.clear();
    // Mock window.location
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "/", origin: "http://localhost" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with warning hidden", () => {
    const { result } = renderHook(() => useIdleTimeout({ timeoutMinutes: 15, graceMinutes: 2 }));
    expect(result.current.showWarning).toBe(false);
  });

  it("initializes remainingSeconds from graceMinutes", () => {
    const { result } = renderHook(() => useIdleTimeout({ timeoutMinutes: 15, graceMinutes: 2 }));
    expect(result.current.remainingSeconds).toBe(120); // 2 * 60
  });

  it("shows warning after timeout", () => {
    const { result } = renderHook(() => useIdleTimeout({ timeoutMinutes: 1, graceMinutes: 1 }));

    expect(result.current.showWarning).toBe(false);

    // Advance past 1 minute timeout
    act(() => {
      vi.advanceTimersByTime(61 * 1000);
    });

    expect(result.current.showWarning).toBe(true);
  });

  it("dismiss resets the timer", () => {
    const { result } = renderHook(() => useIdleTimeout({ timeoutMinutes: 1, graceMinutes: 1 }));

    // Trigger warning
    act(() => {
      vi.advanceTimersByTime(61 * 1000);
    });
    expect(result.current.showWarning).toBe(true);

    // Dismiss
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.showWarning).toBe(false);
  });

  it("provides a dismiss function", () => {
    const { result } = renderHook(() => useIdleTimeout({ timeoutMinutes: 15, graceMinutes: 2 }));
    expect(typeof result.current.dismiss).toBe("function");
  });

  it("stores last activity in sessionStorage", () => {
    renderHook(() => useIdleTimeout({ timeoutMinutes: 15, graceMinutes: 2 }));
    const stored = sessionStorage.getItem("fiducia_last_activity");
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(0);
  });
});
