import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUnsubscribe = vi.fn();
const mockSubscribeChannel = vi.fn(() => ({ unsubscribe: mockUnsubscribe }));

vi.mock("@/lib/backend", () => ({
  getBackend: () => ({
    realtime: {
      subscribeChannel: mockSubscribeChannel,
    },
  }),
}));

import { useRealtimeChannel } from "../useRealtimeChannel";

describe("useRealtimeChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes to a channel when enabled", () => {
    const { result } = renderHook(() =>
      useRealtimeChannel({ channel: "test-channel", event: "test.event" }),
    );

    expect(mockSubscribeChannel).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "test-channel", event: "test.event" }),
    );
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.messages).toEqual([]);
    expect(result.current.lastMessage).toBeNull();
  });

  it("does not subscribe when disabled", () => {
    const { result } = renderHook(() =>
      useRealtimeChannel({ channel: "test-channel", enabled: false }),
    );

    expect(mockSubscribeChannel).not.toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(false);
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeChannel({ channel: "test-channel" }));

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
