import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    instantPayments: {
      list: vi.fn(),
      get: vi.fn(),
      getLimits: vi.fn(),
      checkReceiver: vi.fn(),
      send: vi.fn(),
      requestPayment: vi.fn(),
      exportISO20022: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useInstantPayments,
  useInstantPayment,
  useInstantPaymentLimits,
  useCheckReceiver,
  useSendInstantPayment,
  useRequestForPayment,
  useExportISO20022,
  instantPaymentKeys,
} from "../useInstantPayments";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("instantPaymentKeys", () => {
  it("has correct all key", () => {
    expect(instantPaymentKeys.all).toEqual(["instantPayments"]);
  });

  it("has correct list key", () => {
    expect(instantPaymentKeys.list({ accountId: "a1" })).toEqual([
      "instantPayments",
      "list",
      { accountId: "a1" },
    ]);
  });

  it("has correct detail key", () => {
    expect(instantPaymentKeys.detail("p-1")).toEqual(["instantPayments", "p-1"]);
  });

  it("has correct limits key", () => {
    expect(instantPaymentKeys.limits).toEqual(["instantPayments", "limits"]);
  });
});

describe("useInstantPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches payments successfully", async () => {
    vi.mocked(gateway.instantPayments.list).mockResolvedValue({ payments: [] });

    const { result } = renderHook(() => useInstantPayments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.instantPayments.list).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInstantPayments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInstantPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single payment", async () => {
    vi.mocked(gateway.instantPayments.get).mockResolvedValue({
      payment: {
        paymentId: "p-1",
        status: "completed",
        rail: "fps",
        amountCents: 1000,
        senderName: "Test",
        receiverName: "Test2",
        createdAt: "2024-01-01T00:00:00Z",
        completedAt: null,
      },
    });

    const { result } = renderHook(() => useInstantPayment("p-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when paymentId is empty", () => {
    const { result } = renderHook(() => useInstantPayment(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.instantPayments.get).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInstantPayment("p-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInstantPaymentLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches limits successfully", async () => {
    vi.mocked(gateway.instantPayments.getLimits).mockResolvedValue({
      limits: { dailyLimitCents: 2500000 } as never,
      supportedCurrencies: ["USD"],
      supportedRails: ["fps"],
    });

    const { result } = renderHook(() => useInstantPaymentLimits(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.instantPayments.getLimits).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInstantPaymentLimits(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCheckReceiver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches receiver check when routing number is valid", async () => {
    vi.mocked(gateway.instantPayments.checkReceiver).mockResolvedValue({
      eligible: true,
      availableRails: ["fps"],
      institutionName: "Chase",
    });

    const { result } = renderHook(() => useCheckReceiver("021000021"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when routing number is too short", () => {
    const { result } = renderHook(() => useCheckReceiver("0210"), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.instantPayments.checkReceiver).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useCheckReceiver("021000021"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useSendInstantPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useSendInstantPayment(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useRequestForPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRequestForPayment(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useExportISO20022", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useExportISO20022(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});
