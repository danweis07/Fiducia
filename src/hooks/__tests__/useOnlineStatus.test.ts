import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";

import { useOnlineStatus } from "../useOnlineStatus";

describe("useOnlineStatus", () => {
  it("returns navigator.onLine value", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(typeof result.current).toBe("boolean");
  });

  it("returns true when online", () => {
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });
});
