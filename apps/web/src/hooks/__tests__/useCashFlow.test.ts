import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    cashFlow: {
      getForecast: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import { useCashFlowForecast } from "../useCashFlow";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCashFlowForecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches forecast successfully", async () => {
    vi.mocked(gateway.cashFlow.getForecast).mockResolvedValue({
      forecast: [{ date: "2026-03-18", projectedBalanceCents: 500000 }],
    });

    const { result } = renderHook(() => useCashFlowForecast("acct-1", 30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.forecast).toHaveLength(1);
  });

  it("handles error", async () => {
    vi.mocked(gateway.cashFlow.getForecast).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCashFlowForecast("acct-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("works without parameters", async () => {
    vi.mocked(gateway.cashFlow.getForecast).mockResolvedValue({ forecast: [] });

    const { result } = renderHook(() => useCashFlowForecast(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
