import { describe, it, expect, vi, beforeEach } from "vitest";
import { AblyRealtimeProvider } from "../ably-realtime-provider";
import type { RealtimeProvider } from "../types";

describe("AblyRealtimeProvider", () => {
  let provider: AblyRealtimeProvider;
  let mockFallback: RealtimeProvider;

  beforeEach(() => {
    mockFallback = {
      type: "supabase",
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      trackPresence: vi.fn(),
      getPresence: vi.fn(() => [{ userId: "u-1", lastSeen: "2024-01-01" }]),
    };

    provider = new AblyRealtimeProvider({
      apiKey: "test-key",
      tableChangeProvider: mockFallback,
    });
  });

  it("has type ably", () => {
    expect(provider.type).toBe("ably");
  });

  describe("subscribe (table changes)", () => {
    it("delegates to fallback provider", () => {
      const config = {
        channel: "test",
        table: "accounts",
        onData: vi.fn(),
      };
      provider.subscribe(config);
      expect(mockFallback.subscribe).toHaveBeenCalledWith(config);
    });

    it("calls onError when no fallback provider", () => {
      const noFallback = new AblyRealtimeProvider({ apiKey: "test" });
      const onError = vi.fn();
      noFallback.subscribe({
        channel: "test",
        table: "accounts",
        onData: vi.fn(),
        onError,
      });
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("fallback") }),
      );
    });
  });

  describe("presence", () => {
    it("delegates trackPresence to fallback", () => {
      provider.trackPresence("room", { userId: "u-1" });
      expect(mockFallback.trackPresence).toHaveBeenCalledWith("room", { userId: "u-1" });
    });

    it("delegates getPresence to fallback", () => {
      const result = provider.getPresence("room");
      expect(result).toEqual([{ userId: "u-1", lastSeen: "2024-01-01" }]);
    });

    it("returns empty array when no fallback for getPresence", () => {
      const noFallback = new AblyRealtimeProvider({ apiKey: "test" });
      expect(noFallback.getPresence("room")).toEqual([]);
    });
  });

  describe("disconnect", () => {
    it("cleans up without throwing", () => {
      expect(() => provider.disconnect()).not.toThrow();
    });
  });

  describe("subscribeChannel", () => {
    it("returns unsubscribe function", () => {
      const unsub = provider.subscribeChannel({
        channel: "payments",
        event: "status_changed",
        onMessage: vi.fn(),
      });
      expect(typeof unsub.unsubscribe).toBe("function");
      // Should not throw when called
      unsub.unsubscribe();
    });
  });
});
