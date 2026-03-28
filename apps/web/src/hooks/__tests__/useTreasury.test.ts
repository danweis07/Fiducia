import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    treasury: {
      listVaults: vi.fn(),
      createVault: vi.fn(),
      closeVault: vi.fn(),
      getSummary: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useTreasuryVaults,
  useCreateTreasuryVault,
  useCloseTreasuryVault,
  useTreasurySummary,
} from "../useTreasury";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useTreasuryVaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches vaults successfully", async () => {
    vi.mocked(gateway.treasury.listVaults).mockResolvedValue({ vaults: [] });

    const { result } = renderHook(() => useTreasuryVaults(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.treasury.listVaults).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useTreasuryVaults(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateTreasuryVault", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateTreasuryVault(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useCloseTreasuryVault", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCloseTreasuryVault(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useTreasurySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches summary successfully", async () => {
    const mockSummary = {
      totalVaultBalanceCents: 10000000,
      totalAccruedInterestCents: 0,
      weightedAvgApyBps: 450,
      vaults: [],
    } as import("@/types/business").TreasurySummary;
    vi.mocked(gateway.treasury.getSummary).mockResolvedValue({ summary: mockSummary });

    const { result } = renderHook(() => useTreasurySummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.treasury.getSummary).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useTreasurySummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
