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
      forecast: {
        currentBalanceCents: 500000,
        projectedBalanceCents: 500000,
        projectedDate: "2026-04-17",
        avgDailyInflowCents: 10000,
        avgDailyOutflowCents: 8000,
        upcomingPayrollCents: 0,
        upcomingBillsCents: 0,
        runwayDays: 60,
        dataPoints: [
          {
            date: "2026-03-18",
            balanceCents: 500000,
            inflowCents: 0,
            outflowCents: 0,
            isProjected: true,
          },
        ],
        insights: [],
      },
    });

    const { result } = renderHook(() => useCashFlowForecast("acct-1", 30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.forecast.dataPoints).toHaveLength(1);
  });

  it("handles error", async () => {
    vi.mocked(gateway.cashFlow.getForecast).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCashFlowForecast("acct-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("works without parameters", async () => {
    vi.mocked(gateway.cashFlow.getForecast).mockResolvedValue({
      forecast: {
        currentBalanceCents: 0,
        projectedBalanceCents: 0,
        projectedDate: "2026-04-17",
        avgDailyInflowCents: 0,
        avgDailyOutflowCents: 0,
        upcomingPayrollCents: 0,
        upcomingBillsCents: 0,
        runwayDays: 0,
        dataPoints: [],
        insights: [],
      },
    });

    const { result } = renderHook(() => useCashFlowForecast(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
