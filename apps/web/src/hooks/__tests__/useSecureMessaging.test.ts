import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    messaging: {
      listThreads: vi.fn(),
      getThread: vi.fn(),
      createThread: vi.fn(),
      reply: vi.fn(),
      markRead: vi.fn(),
      archive: vi.fn(),
      listDepartments: vi.fn(),
      unreadCount: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  messagingKeys,
  useMessageThreads,
  useThread,
  useCreateThread,
  useReplyToThread,
  useMarkThreadRead,
  useArchiveThread,
  useMessageDepartments,
  useUnreadMessageCount,
} from "../useSecureMessaging";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("messagingKeys", () => {
  it("has correct keys", () => {
    expect(messagingKeys.all).toEqual(["messaging"]);
    expect(messagingKeys.threads({})).toEqual(["messaging", "threads", {}]);
    expect(messagingKeys.thread("t-1")).toEqual(["messaging", "thread", "t-1"]);
    expect(messagingKeys.departments()).toEqual(["messaging", "departments"]);
    expect(messagingKeys.unreadCount()).toEqual(["messaging", "unreadCount"]);
  });
});

describe("useMessageThreads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches threads", async () => {
    vi.mocked(gateway.messaging.listThreads).mockResolvedValue({ threads: [] });
    const { result } = renderHook(() => useMessageThreads(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useThread", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches a thread", async () => {
    vi.mocked(gateway.messaging.getThread).mockResolvedValue({ id: "t-1", messages: [] });
    const { result } = renderHook(() => useThread("t-1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch with null id", () => {
    const { result } = renderHook(() => useThread(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useCreateThread", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a thread", async () => {
    vi.mocked(gateway.messaging.createThread).mockResolvedValue({ threadId: "t-new" });
    const { result } = renderHook(() => useCreateThread(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ subject: "Help", body: "I need assistance" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useReplyToThread", () => {
  beforeEach(() => vi.clearAllMocks());

  it("replies to thread", async () => {
    vi.mocked(gateway.messaging.reply).mockResolvedValue({ messageId: "m-new" });
    const { result } = renderHook(() => useReplyToThread(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ threadId: "t-1", body: "Thanks!" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useMarkThreadRead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks thread as read", async () => {
    vi.mocked(gateway.messaging.markRead).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useMarkThreadRead(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate("t-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useArchiveThread", () => {
  beforeEach(() => vi.clearAllMocks());

  it("archives thread", async () => {
    vi.mocked(gateway.messaging.archive).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useArchiveThread(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate("t-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useMessageDepartments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches departments", async () => {
    vi.mocked(gateway.messaging.listDepartments).mockResolvedValue({
      departments: [{ id: "d-1", name: "Support" }],
    });
    const { result } = renderHook(() => useMessageDepartments(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUnreadMessageCount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches unread count", async () => {
    vi.mocked(gateway.messaging.unreadCount).mockResolvedValue({ count: 5 });
    const { result } = renderHook(() => useUnreadMessageCount(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(5);
  });
});
