import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    disputes: {
      list: vi.fn(),
      get: vi.fn(),
      file: vi.fn(),
      addDocument: vi.fn(),
      cancel: vi.fn(),
      timeline: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  disputeKeys,
  useDisputes,
  useDispute,
  useFileDispute,
  useCancelDispute,
  useDisputeTimeline,
} from "../useDisputes";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("disputeKeys", () => {
  it("has correct keys", () => {
    expect(disputeKeys.all).toEqual(["disputes"]);
    expect(disputeKeys.detail("d-1")).toEqual(["disputes", "detail", "d-1"]);
    expect(disputeKeys.timeline("d-1")).toEqual(["disputes", "timeline", "d-1"]);
  });
});

describe("useDisputes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches disputes", async () => {
    vi.mocked(gateway.disputes.list).mockResolvedValue({ disputes: [] });
    const { result } = renderHook(() => useDisputes(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDispute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches single dispute", async () => {
    vi.mocked(gateway.disputes.get).mockResolvedValue({
      dispute: { id: "d-1", status: "open" } as never,
      timeline: [],
      documents: [],
    });
    const { result } = renderHook(() => useDispute("d-1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch without id", () => {
    const { result } = renderHook(() => useDispute(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useFileDispute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("files a dispute", async () => {
    vi.mocked(gateway.disputes.file).mockResolvedValue({ dispute: { id: "d-new" } } as never);
    const { result } = renderHook(() => useFileDispute(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({
        transactionId: "txn-1",
        reason: "unauthorized",
        description: "Not my charge",
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCancelDispute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels a dispute", async () => {
    vi.mocked(gateway.disputes.cancel).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useCancelDispute(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ disputeId: "d-1", reason: "Resolved" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDisputeTimeline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches timeline", async () => {
    vi.mocked(gateway.disputes.timeline).mockResolvedValue({ events: [] });
    const { result } = renderHook(() => useDisputeTimeline("d-1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
