import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    travelNotices: {
      list: vi.fn(),
      create: vi.fn(),
      cancel: vi.fn(),
    },
    cardReplacements: {
      list: vi.fn(),
      request: vi.fn(),
      status: vi.fn(),
      activate: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useTravelNotices,
  useCreateTravelNotice,
  useCancelTravelNotice,
  useCardReplacements,
  useRequestCardReplacement,
  useCardReplacementStatus,
  useActivateReplacementCard,
} from "../useCardServices";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

// =========================================================================
// TRAVEL NOTICES
// =========================================================================

describe("useTravelNotices", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches travel notices", async () => {
    const mockNotices = [
      { id: "tn-1", destinations: [{ country: "FR" }], startDate: "2026-06-01" },
    ];
    vi.mocked(gateway.travelNotices.list).mockResolvedValue({ notices: mockNotices });

    const { result } = renderHook(() => useTravelNotices("active"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.travelNotices.list).toHaveBeenCalledWith({ filter: "active" });
  });
});

describe("useCreateTravelNotice", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway.travelNotices.create on mutate", async () => {
    vi.mocked(gateway.travelNotices.create).mockResolvedValue({ id: "tn-2" });

    const { result } = renderHook(() => useCreateTravelNotice(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        cardId: "c-1",
        destinations: [{ country: "JP" }],
        startDate: "2026-07-01",
        endDate: "2026-07-15",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.travelNotices.create).toHaveBeenCalledTimes(1);
  });
});

describe("useCancelTravelNotice", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway.travelNotices.cancel on mutate", async () => {
    vi.mocked(gateway.travelNotices.cancel).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCancelTravelNotice(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate("tn-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.travelNotices.cancel).toHaveBeenCalledWith("tn-1");
  });
});

// =========================================================================
// CARD REPLACEMENTS
// =========================================================================

describe("useCardReplacements", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches card replacements list", async () => {
    const mockReplacements = [{ id: "cr-1", cardId: "c-1", status: "shipped" }];
    vi.mocked(gateway.cardReplacements.list).mockResolvedValue({ replacements: mockReplacements });

    const { result } = renderHook(() => useCardReplacements(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.replacements).toHaveLength(1);
  });
});

describe("useRequestCardReplacement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway.cardReplacements.request on mutate", async () => {
    vi.mocked(gateway.cardReplacements.request).mockResolvedValue({ id: "cr-2" });

    const { result } = renderHook(() => useRequestCardReplacement(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        cardId: "c-1",
        reason: "lost" as never,
        shippingMethod: "expedited",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.cardReplacements.request).toHaveBeenCalledTimes(1);
  });
});

describe("useCardReplacementStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches replacement status by id", async () => {
    vi.mocked(gateway.cardReplacements.status).mockResolvedValue({
      id: "cr-1",
      status: "shipped",
      trackingNumber: "TRK123",
    });

    const { result } = renderHook(() => useCardReplacementStatus("cr-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.cardReplacements.status).toHaveBeenCalledWith("cr-1");
  });

  it("does not fetch when replacementId is empty", () => {
    const { result } = renderHook(() => useCardReplacementStatus(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useActivateReplacementCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway.cardReplacements.activate on mutate", async () => {
    vi.mocked(gateway.cardReplacements.activate).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useActivateReplacementCard(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ replacementId: "cr-1", lastFourDigits: "9876" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.cardReplacements.activate).toHaveBeenCalledWith("cr-1", "9876");
  });
});
