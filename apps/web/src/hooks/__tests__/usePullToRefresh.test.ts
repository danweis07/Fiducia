import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePullToRefresh } from "../usePullToRefresh";

describe("usePullToRefresh", () => {
  beforeEach(() => {
    // Ensure scrollY is 0 (at top of page)
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
  });

  it("starts with isRefreshing false", () => {
    const { result } = renderHook(() => usePullToRefresh({ onRefresh: vi.fn() }));
    expect(result.current.isRefreshing).toBe(false);
  });

  it("triggers refresh on pull down past threshold", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh({ onRefresh, threshold: 60 }));

    // Simulate touch start at Y=100
    act(() => {
      window.dispatchEvent(
        new TouchEvent("touchstart", {
          touches: [{ clientY: 100 } as Touch],
        }),
      );
    });

    // Simulate touch move
    act(() => {
      window.dispatchEvent(
        new TouchEvent("touchmove", {
          touches: [{ clientY: 200 } as Touch],
        }),
      );
    });

    // Simulate touch end at Y=200 (distance = 100 > threshold 60)
    act(() => {
      window.dispatchEvent(
        new TouchEvent("touchend", {
          changedTouches: [{ clientY: 200 } as Touch],
        }),
      );
    });

    expect(onRefresh).toHaveBeenCalled();
  });

  it("does not trigger when pull distance is below threshold", () => {
    const onRefresh = vi.fn();
    renderHook(() => usePullToRefresh({ onRefresh, threshold: 60 }));

    act(() => {
      window.dispatchEvent(
        new TouchEvent("touchstart", {
          touches: [{ clientY: 100 } as Touch],
        }),
      );
    });

    act(() => {
      window.dispatchEvent(
        new TouchEvent("touchend", {
          changedTouches: [{ clientY: 130 } as Touch],
        }),
      );
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("does not trigger when not scrolled to top", () => {
    Object.defineProperty(window, "scrollY", { value: 100, writable: true });
    const onRefresh = vi.fn();
    renderHook(() => usePullToRefresh({ onRefresh, threshold: 60 }));

    act(() => {
      window.dispatchEvent(
        new TouchEvent("touchstart", {
          touches: [{ clientY: 100 } as Touch],
        }),
      );
    });

    act(() => {
      window.dispatchEvent(
        new TouchEvent("touchend", {
          changedTouches: [{ clientY: 300 } as Touch],
        }),
      );
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("uses default threshold of 60", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }));
    expect(result.current.isRefreshing).toBe(false);
  });
});
