import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    sessions: {
      list: vi.fn(),
      activity: vi.fn(),
      revoke: vi.fn(),
      revokeAll: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useSessions,
  useSessionActivity,
  useRevokeSession,
  useRevokeAllSessions,
} from "../useSessions";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("useSessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches session list", async () => {
    const mockSessions = [{ id: "s-1", device: "Chrome", ip: "192.168.1.1" }];
    vi.mocked(gateway.sessions.list).mockResolvedValue({ sessions: mockSessions });

    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sessions).toHaveLength(1);
  });
});

describe("useSessionActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches session activity", async () => {
    const mockActivity = [{ id: "a-1", action: "login", timestamp: "2026-01-01T00:00:00Z" }];
    vi.mocked(gateway.sessions.activity).mockResolvedValue({ activity: mockActivity });

    const { result } = renderHook(() => useSessionActivity(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.activity).toHaveLength(1);
  });
});

describe("useRevokeSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway.sessions.revoke on mutate", async () => {
    vi.mocked(gateway.sessions.revoke).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRevokeSession(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate("s-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.sessions.revoke).toHaveBeenCalledWith("s-1");
  });
});

describe("useRevokeAllSessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway.sessions.revokeAll on mutate", async () => {
    vi.mocked(gateway.sessions.revokeAll).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRevokeAllSessions(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate("current-session-id");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.sessions.revokeAll).toHaveBeenCalledWith("current-session-id");
  });

  it("calls revokeAll without currentSessionId", async () => {
    vi.mocked(gateway.sessions.revokeAll).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRevokeAllSessions(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.sessions.revokeAll).toHaveBeenCalledWith(undefined);
  });
});
