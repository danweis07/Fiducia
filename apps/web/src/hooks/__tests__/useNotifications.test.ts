import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    notifications: {
      list: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      unreadCount: vi.fn(),
    },
  },
}));

import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  notificationKeys,
} from "../useNotifications";
import { gateway } from "@/lib/gateway";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockNotifications = [
  {
    id: "n-1",
    title: "Transfer Complete",
    message: "Your $500 transfer is done",
    read: false,
    createdAt: "2026-03-14T10:00:00Z",
  },
  {
    id: "n-2",
    title: "Low Balance Alert",
    message: "Checking below $100",
    read: false,
    createdAt: "2026-03-13T08:00:00Z",
  },
  {
    id: "n-3",
    title: "Statement Ready",
    message: "February statement available",
    read: true,
    createdAt: "2026-03-01T12:00:00Z",
  },
];

describe("notificationKeys", () => {
  it("has correct all key", () => {
    expect(notificationKeys.all).toEqual(["notifications"]);
  });

  it("has correct list key", () => {
    expect(notificationKeys.list({ unreadOnly: true })).toEqual([
      "notifications",
      "list",
      { unreadOnly: true },
    ]);
  });

  it("has correct unreadCount key", () => {
    expect(notificationKeys.unreadCount()).toEqual(["notifications", "unreadCount"]);
  });
});

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches notifications list", async () => {
    vi.mocked(gateway.notifications.list).mockResolvedValue({
      notifications: mockNotifications,
      _pagination: { total: 3, limit: 50, offset: 0, hasMore: false },
    });

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.notifications).toHaveLength(3);
  });

  it("passes unreadOnly filter", async () => {
    vi.mocked(gateway.notifications.list).mockResolvedValue({
      notifications: [mockNotifications[0], mockNotifications[1]],
    });

    const { result } = renderHook(() => useNotifications({ unreadOnly: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.notifications.list).toHaveBeenCalledWith(
      expect.objectContaining({ unreadOnly: true }),
    );
  });

  it("passes pagination params", async () => {
    vi.mocked(gateway.notifications.list).mockResolvedValue({ notifications: [] });

    const { result } = renderHook(() => useNotifications({ limit: 10, offset: 5 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.notifications.list).toHaveBeenCalledWith({ limit: 10, offset: 5 });
  });

  it("handles empty notifications", async () => {
    vi.mocked(gateway.notifications.list).mockResolvedValue({ notifications: [] });

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.notifications).toHaveLength(0);
  });

  it("handles error", async () => {
    vi.mocked(gateway.notifications.list).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches unread count", async () => {
    vi.mocked(gateway.notifications.unreadCount).mockResolvedValue({ count: 5 });

    const { result } = renderHook(() => useUnreadCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(5);
  });

  it("returns zero when no unread", async () => {
    vi.mocked(gateway.notifications.unreadCount).mockResolvedValue({ count: 0 });

    const { result } = renderHook(() => useUnreadCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(0);
  });

  it("handles large unread count", async () => {
    vi.mocked(gateway.notifications.unreadCount).mockResolvedValue({ count: 999 });

    const { result } = renderHook(() => useUnreadCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(999);
  });

  it("handles error", async () => {
    vi.mocked(gateway.notifications.unreadCount).mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useUnreadCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useMarkRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a notification as read", async () => {
    vi.mocked(gateway.notifications.markRead).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useMarkRead(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync("n-1");
    });

    expect(gateway.notifications.markRead).toHaveBeenCalledWith("n-1");
  });

  it("handles mark read failure", async () => {
    vi.mocked(gateway.notifications.markRead).mockRejectedValue(
      new Error("Notification not found"),
    );

    const { result } = renderHook(() => useMarkRead(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync("bad-id");
      }),
    ).rejects.toThrow("Notification not found");
  });

  it("marks different notifications", async () => {
    vi.mocked(gateway.notifications.markRead).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useMarkRead(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync("n-2");
    });

    expect(gateway.notifications.markRead).toHaveBeenCalledWith("n-2");
  });
});

describe("useMarkAllRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks all notifications as read", async () => {
    vi.mocked(gateway.notifications.markAllRead).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useMarkAllRead(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(gateway.notifications.markAllRead).toHaveBeenCalled();
  });

  it("handles mark all failure", async () => {
    vi.mocked(gateway.notifications.markAllRead).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useMarkAllRead(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync();
      }),
    ).rejects.toThrow("Server error");
  });

  it("succeeds when no notifications exist", async () => {
    vi.mocked(gateway.notifications.markAllRead).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useMarkAllRead(), { wrapper: createWrapper() });

    await act(async () => {
      const response = await result.current.mutateAsync();
      expect(response).toEqual({ success: true });
    });
  });
});
