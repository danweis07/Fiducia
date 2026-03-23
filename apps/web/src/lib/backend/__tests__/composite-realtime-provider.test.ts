import { describe, it, expect, vi } from "vitest";
import { CompositeRealtimeProvider } from "../composite-realtime-provider";
import type {
  RealtimeProvider,
  RealtimeSubscription,
  ChannelSubscription,
  PublishOptions,
} from "../types";

function createMockProvider(type: string = "mock"): RealtimeProvider {
  return {
    type: type as "supabase",
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    trackPresence: vi.fn(),
    getPresence: vi.fn(() => [{ userId: "u-1", lastSeen: "2024-01-01" }]),
    subscribeChannel: vi.fn(() => ({ unsubscribe: vi.fn() })),
    publish: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
  };
}

describe("CompositeRealtimeProvider", () => {
  it("delegates subscribe to primary", () => {
    const primary = createMockProvider();
    const channel = createMockProvider();
    const composite = new CompositeRealtimeProvider({ primary, channel });

    const config: RealtimeSubscription = {
      channel: "test",
      table: "accounts",
      onData: vi.fn(),
    };
    composite.subscribe(config);
    expect(primary.subscribe).toHaveBeenCalledWith(config);
    expect(channel.subscribe).not.toHaveBeenCalled();
  });

  it("delegates trackPresence to primary", () => {
    const primary = createMockProvider();
    const composite = new CompositeRealtimeProvider({ primary });

    composite.trackPresence!("room", { userId: "u-1" });
    expect(primary.trackPresence).toHaveBeenCalledWith("room", { userId: "u-1" });
  });

  it("delegates getPresence to primary", () => {
    const primary = createMockProvider();
    const composite = new CompositeRealtimeProvider({ primary });

    const result = composite.getPresence!("room");
    expect(result).toEqual([{ userId: "u-1", lastSeen: "2024-01-01" }]);
  });

  it("delegates subscribeChannel to channel provider when available", () => {
    const primary = createMockProvider();
    const channel = createMockProvider();
    const composite = new CompositeRealtimeProvider({ primary, channel });

    const config: ChannelSubscription = {
      channel: "transfers",
      onMessage: vi.fn(),
    };
    composite.subscribeChannel!(config);
    expect(channel.subscribeChannel).toHaveBeenCalledWith(config);
    expect(primary.subscribeChannel).not.toHaveBeenCalled();
  });

  it("falls back to primary for subscribeChannel when no channel provider", () => {
    const primary = createMockProvider();
    const composite = new CompositeRealtimeProvider({ primary });

    const config: ChannelSubscription = {
      channel: "transfers",
      onMessage: vi.fn(),
    };
    composite.subscribeChannel!(config);
    expect(primary.subscribeChannel).toHaveBeenCalledWith(config);
  });

  it("delegates publish to channel provider", async () => {
    const primary = createMockProvider();
    const channel = createMockProvider();
    const composite = new CompositeRealtimeProvider({ primary, channel });

    const opts: PublishOptions = {
      channel: "transfers",
      event: "status",
      data: { status: "completed" },
    };
    await composite.publish!(opts);
    expect(channel.publish).toHaveBeenCalledWith(opts);
    expect(primary.publish).not.toHaveBeenCalled();
  });

  it("disconnect calls both providers", () => {
    const primary = createMockProvider();
    const channel = createMockProvider();
    const composite = new CompositeRealtimeProvider({ primary, channel });

    composite.disconnect!();
    expect(primary.disconnect).toHaveBeenCalled();
    expect(channel.disconnect).toHaveBeenCalled();
  });

  it("calls onError when no channel provider has subscribeChannel", () => {
    const primary: RealtimeProvider = {
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    };
    const composite = new CompositeRealtimeProvider({ primary });

    const onError = vi.fn();
    composite.subscribeChannel!({
      channel: "test",
      onMessage: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalled();
  });
});
