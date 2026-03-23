import { describe, it, expect, vi, beforeEach } from "vitest";
import { KafkaRealtimeProvider } from "../kafka-realtime-provider";
import type { RealtimeProvider } from "../types";

describe("KafkaRealtimeProvider", () => {
  let provider: KafkaRealtimeProvider;
  let mockFallback: RealtimeProvider;

  beforeEach(() => {
    mockFallback = {
      type: "supabase",
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      trackPresence: vi.fn(),
      getPresence: vi.fn(() => [{ userId: "u-1", lastSeen: "2024-01-01" }]),
    };

    provider = new KafkaRealtimeProvider({
      wsUrl: "ws://localhost:8080/kafka",
      restUrl: "http://localhost:8082",
      consumerGroup: "test-group",
      tableChangeProvider: mockFallback,
    });
  });

  it("has type kafka", () => {
    expect(provider.type).toBe("kafka");
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

    it("calls onError when no fallback", () => {
      const noFallback = new KafkaRealtimeProvider({ wsUrl: "ws://test" });
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

    it("returns empty when no fallback for getPresence", () => {
      const noFallback = new KafkaRealtimeProvider({ wsUrl: "ws://test" });
      expect(noFallback.getPresence("room")).toEqual([]);
    });
  });

  describe("subscribeChannel", () => {
    it("returns unsubscribe function", () => {
      const unsub = provider.subscribeChannel({
        channel: "payments-topic",
        onMessage: vi.fn(),
      });
      expect(typeof unsub.unsubscribe).toBe("function");
    });

    it("calls onError when connection fails", async () => {
      const onError = vi.fn();
      // Provider with no valid WS URL
      const badProvider = new KafkaRealtimeProvider({});
      badProvider.subscribeChannel({
        channel: "test-topic",
        onMessage: vi.fn(),
        onError,
      });
      // Give async subscribe time to fail
      await new Promise((r) => setTimeout(r, 50));
      expect(onError).toHaveBeenCalled();
    });

    it("unsubscribe removes handler", () => {
      const unsub = provider.subscribeChannel({
        channel: "test-topic",
        onMessage: vi.fn(),
      });
      expect(() => unsub.unsubscribe()).not.toThrow();
    });
  });

  describe("publish", () => {
    it("publishes via REST proxy when configured", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
      await provider.publish!({
        channel: "payments-topic",
        event: "transfer.completed",
        data: { transferId: "t-1" },
      });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/topics/payments-topic"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("throws on REST publish failure", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });
      await expect(
        provider.publish!({
          channel: "test",
          event: "e",
          data: {},
        }),
      ).rejects.toThrow("Kafka REST publish failed");
    });
  });

  describe("disconnect", () => {
    it("cleans up without throwing", () => {
      expect(() => provider.disconnect()).not.toThrow();
    });

    it("prevents reconnection after disconnect", () => {
      provider.disconnect();
      // After disconnect, subscribing should not attempt reconnection
      const unsub = provider.subscribeChannel({
        channel: "test",
        onMessage: vi.fn(),
      });
      expect(typeof unsub.unsubscribe).toBe("function");
    });
  });
});
