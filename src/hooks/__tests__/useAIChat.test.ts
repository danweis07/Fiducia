import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    ai: { chat: vi.fn() },
  },
}));

vi.mock("@/hooks/useErrorHandler", () => ({
  useErrorHandler: () => ({ handleError: vi.fn() }),
}));

beforeEach(() => {
  crypto.randomUUID = vi.fn().mockReturnValue("test-uuid-1234");
});

import { gateway } from "@/lib/gateway";
import { useAIChat } from "../useAIChat";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useAIChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    crypto.randomUUID = vi.fn().mockReturnValue("test-uuid-1234");
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useAIChat(), { wrapper: createWrapper() });

    expect(result.current.messages).toEqual([]);
    expect(result.current.sendMessage).toBeDefined();
    expect(result.current.clearChat).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.sessionId).toBeNull();
  });

  it("sends a message and receives reply", async () => {
    vi.mocked(gateway.ai.chat).mockResolvedValue({
      reply: "Hello! How can I help?",
      sessionId: "session-abc",
    });

    const { result } = renderHook(() => useAIChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.sendMessage("Hi there");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(gateway.ai.chat).toHaveBeenCalledTimes(1);
    expect(result.current.sessionId).toBe("session-abc");
  });

  it("does not send empty messages", () => {
    const { result } = renderHook(() => useAIChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.sendMessage("   ");
    });

    expect(gateway.ai.chat).not.toHaveBeenCalled();
  });

  it("clears chat history", async () => {
    vi.mocked(gateway.ai.chat).mockResolvedValue({
      reply: "Response",
      sessionId: "session-1",
    });

    const { result } = renderHook(() => useAIChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.sendMessage("Hello");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.sessionId).toBeNull();
  });

  it("handles error from gateway", async () => {
    vi.mocked(gateway.ai.chat).mockRejectedValue(new Error("AI service down"));

    const { result } = renderHook(() => useAIChat(), { wrapper: createWrapper() });

    act(() => {
      result.current.sendMessage("Hello");
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // After error, loading placeholder should be removed
    const loadingMessages = result.current.messages.filter((m) => m.isLoading);
    expect(loadingMessages).toHaveLength(0);
  });
});
