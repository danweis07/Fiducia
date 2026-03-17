import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    currencyPots: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      close: vi.fn(),
      generateVIBAN: vi.fn(),
      getSwapQuote: vi.fn(),
      executeSwap: vi.fn(),
      listSwaps: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useCurrencyPots,
  useCurrencyPot,
  useCreateCurrencyPot,
  useCloseCurrencyPot,
  useGenerateVIBAN,
  useSwapQuote,
  useExecuteSwap,
  useSwapHistory,
} from "../useMultiCurrency";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCurrencyPots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches currency pots successfully", async () => {
    vi.mocked(gateway.currencyPots.list).mockResolvedValue({ pots: [] });

    const { result } = renderHook(() => useCurrencyPots(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.currencyPots.list).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCurrencyPots(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCurrencyPot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single pot successfully", async () => {
    vi.mocked(gateway.currencyPots.get).mockResolvedValue({ potId: "pot-1", currency: "EUR" });

    const { result } = renderHook(() => useCurrencyPot("pot-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when potId is empty", () => {
    const { result } = renderHook(() => useCurrencyPot(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.currencyPots.get).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCurrencyPot("pot-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateCurrencyPot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateCurrencyPot(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useCloseCurrencyPot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCloseCurrencyPot(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useGenerateVIBAN", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useGenerateVIBAN(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useSwapQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches swap quote successfully", async () => {
    vi.mocked(gateway.currencyPots.getSwapQuote).mockResolvedValue({
      rate: 1.12,
      toAmountCents: 11200,
    });

    const { result } = renderHook(() => useSwapQuote("pot-1", "pot-2", 10000), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when amount is zero", () => {
    const { result } = renderHook(() => useSwapQuote("pot-1", "pot-2", 0), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.currencyPots.getSwapQuote).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useSwapQuote("pot-1", "pot-2", 10000), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useExecuteSwap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useExecuteSwap(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useSwapHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches swap history successfully", async () => {
    vi.mocked(gateway.currencyPots.listSwaps).mockResolvedValue({ swaps: [] });

    const { result } = renderHook(() => useSwapHistory("pot-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.currencyPots.listSwaps).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useSwapHistory("pot-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
