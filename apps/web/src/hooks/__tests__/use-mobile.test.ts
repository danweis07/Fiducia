import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "../use-mobile";

describe("useIsMobile", () => {
  let listeners: Array<() => void> = [];

  beforeEach(() => {
    listeners = [];
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: (_event: string, cb: () => void) => {
          listeners.push(cb);
        },
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  it("returns false for desktop width", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true for mobile width", () => {
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("responds to resize events", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
    act(() => {
      listeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);
  });
});
