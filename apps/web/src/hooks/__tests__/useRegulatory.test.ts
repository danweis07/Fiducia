import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    regulatory: {
      getSafeguarding: vi.fn(),
      listWithholding: vi.fn(),
      getCarbonFootprint: vi.fn(),
      getCarbonSummary: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useSafeguarding,
  useInterestWithholding,
  useCarbonFootprint,
  useCarbonSummary,
} from "../useRegulatory";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useSafeguarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches safeguarding data successfully", async () => {
    vi.mocked(gateway.regulatory.getSafeguarding).mockResolvedValue({ safeguarding: [] });

    const { result } = renderHook(() => useSafeguarding("UK"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.regulatory.getSafeguarding).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useSafeguarding(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInterestWithholding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches withholding data successfully", async () => {
    vi.mocked(gateway.regulatory.listWithholding).mockResolvedValue({
      entries: [],
      totalGrossInterestCents: 0,
      totalTaxWithheldCents: 0,
      totalNetInterestCents: 0,
    });

    const { result } = renderHook(() => useInterestWithholding(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.regulatory.listWithholding).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInterestWithholding(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCarbonFootprint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches carbon footprint successfully", async () => {
    vi.mocked(gateway.regulatory.getCarbonFootprint).mockResolvedValue({ carbonKg: 2.5 } as never);

    const { result } = renderHook(() => useCarbonFootprint("txn-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when transactionId is empty", () => {
    const { result } = renderHook(() => useCarbonFootprint(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.regulatory.getCarbonFootprint).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCarbonFootprint("txn-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCarbonSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches carbon summary successfully", async () => {
    vi.mocked(gateway.regulatory.getCarbonSummary).mockResolvedValue({
      totalCarbonKg: 50.0,
    } as never);

    const { result } = renderHook(() => useCarbonSummary("2026-01-01", "2026-03-01"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when dates are empty", () => {
    const { result } = renderHook(() => useCarbonSummary("", ""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.regulatory.getCarbonSummary).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCarbonSummary("2026-01-01", "2026-03-01"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
