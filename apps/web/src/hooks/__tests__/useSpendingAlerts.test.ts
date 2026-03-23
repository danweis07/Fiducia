import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    spendingAlerts: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      history: vi.fn(),
      summary: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useSpendingAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useAlertHistory,
  useAlertSummary,
} from "../useSpendingAlerts";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("useSpendingAlerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches alerts", async () => {
    vi.mocked(gateway.spendingAlerts.list).mockResolvedValue({ alerts: [] });
    const { result } = renderHook(() => useSpendingAlerts(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateAlert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an alert", async () => {
    vi.mocked(gateway.spendingAlerts.create).mockResolvedValue({ alertId: "a-new" });
    const { result } = renderHook(() => useCreateAlert(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({
        name: "High Spend",
        alertType: "threshold" as Record<string, unknown>,
        thresholdCents: 50000,
        channels: ["push", "email"],
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateAlert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates an alert", async () => {
    vi.mocked(gateway.spendingAlerts.update).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useUpdateAlert(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ alertId: "a-1", isEnabled: false });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteAlert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes an alert", async () => {
    vi.mocked(gateway.spendingAlerts.delete).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDeleteAlert(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate("a-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAlertHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches alert history", async () => {
    vi.mocked(gateway.spendingAlerts.history).mockResolvedValue({ events: [] });
    const { result } = renderHook(() => useAlertHistory(20, 0), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAlertSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches summary", async () => {
    vi.mocked(gateway.spendingAlerts.summary).mockResolvedValue({
      activeAlerts: 3,
      triggeredToday: 1,
    });
    const { result } = renderHook(() => useAlertSummary(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.activeAlerts).toBe(3);
  });
});
