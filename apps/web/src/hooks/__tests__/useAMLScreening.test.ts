import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    aml: {
      screen: vi.fn(),
      getScreening: vi.fn(),
      monitoring: { list: vi.fn(), update: vi.fn() },
      alerts: { list: vi.fn(), review: vi.fn() },
    },
    kyc: {
      refresh: vi.fn(),
      configureRefresh: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useAMLScreen,
  useAMLScreening,
  useAMLMonitoring,
  useUpdateAMLMonitoring,
  useAMLAlerts,
  useReviewAMLAlert,
  useKYCRefresh,
  useConfigureKYCRefresh,
  amlKeys,
} from "../useAMLScreening";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("amlKeys", () => {
  it("has correct screening key", () => {
    expect(amlKeys.screening("scr-1")).toEqual(["aml-screening", "scr-1"]);
  });

  it("has correct monitoring key", () => {
    expect(amlKeys.monitoring({ customerId: "c1" })).toEqual([
      "aml-monitoring",
      { customerId: "c1" },
    ]);
  });

  it("has correct alerts key", () => {
    expect(amlKeys.alerts()).toEqual(["aml-alerts", undefined]);
  });
});

describe("useAMLScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useAMLScreen(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useAMLScreening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches screening successfully", async () => {
    vi.mocked(gateway.aml.getScreening).mockResolvedValue({
      screening: {
        screeningId: "scr-1",
        customerId: "cust-1",
        riskLevel: "low",
        totalMatches: 0,
        matches: [],
        watchlistsChecked: [],
        screenedAt: "2024-01-01T00:00:00Z",
        expiresAt: "2025-01-01T00:00:00Z",
        provider: "test",
      },
    });

    const { result } = renderHook(() => useAMLScreening("scr-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  it("does not fetch when screeningId is undefined", () => {
    const { result } = renderHook(() => useAMLScreening(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.aml.getScreening).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAMLScreening("scr-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useAMLMonitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches monitoring list successfully", async () => {
    vi.mocked(gateway.aml.monitoring.list).mockResolvedValue({ subscriptions: [] });

    const { result } = renderHook(() => useAMLMonitoring(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.aml.monitoring.list).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAMLMonitoring(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdateAMLMonitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useUpdateAMLMonitoring(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useAMLAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches alerts successfully", async () => {
    vi.mocked(gateway.aml.alerts.list).mockResolvedValue({ alerts: [] });

    const { result } = renderHook(() => useAMLAlerts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.aml.alerts.list).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAMLAlerts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useReviewAMLAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useReviewAMLAlert(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useKYCRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useKYCRefresh(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useConfigureKYCRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useConfigureKYCRefresh(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});
