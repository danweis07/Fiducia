import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    p2p: {
      getEnrollment: vi.fn(),
      enroll: vi.fn(),
      unenroll: vi.fn(),
      send: vi.fn(),
      requestMoney: vi.fn(),
      listTransactions: vi.fn(),
      cancelRequest: vi.fn(),
      getLimits: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  p2pKeys,
  useP2PEnrollment,
  useEnrollP2P,
  useSendP2P,
  useRequestP2P,
  useP2PTransactions,
  useCancelP2PRequest,
  useP2PLimits,
} from "../useP2P";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("p2pKeys", () => {
  it("has correct keys", () => {
    expect(p2pKeys.all).toEqual(["p2p"]);
    expect(p2pKeys.enrollment()).toEqual(["p2p", "enrollment"]);
    expect(p2pKeys.transactions("sent")).toEqual(["p2p", "transactions", "sent"]);
    expect(p2pKeys.limits()).toEqual(["p2p", "limits"]);
  });
});

describe("useP2PEnrollment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches enrollment status", async () => {
    vi.mocked(gateway.p2p.getEnrollment).mockResolvedValue({
      enrollment: { enrolled: true, type: "email" },
    } as never);
    const { result } = renderHook(() => useP2PEnrollment(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      (result.current.data as never as { enrollment: { enrolled: boolean } })?.enrollment?.enrolled,
    ).toBe(true);
  });
});

describe("useEnrollP2P", () => {
  beforeEach(() => vi.clearAllMocks());

  it("enrolls user in P2P", async () => {
    vi.mocked(gateway.p2p.enroll).mockResolvedValue({ enrollment: {} } as never);
    const { result } = renderHook(() => useEnrollP2P(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({
        accountId: "acct-1",
        enrollmentType: "email",
        enrollmentValue: "test@test.com",
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useSendP2P", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends money via P2P", async () => {
    vi.mocked(gateway.p2p.send).mockResolvedValue({
      transaction: { transactionId: "txn-1" },
    } as never);
    const { result } = renderHook(() => useSendP2P(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({
        recipientType: "email",
        recipientValue: "bob@test.com",
        amountCents: 5000,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRequestP2P", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests money", async () => {
    vi.mocked(gateway.p2p.requestMoney).mockResolvedValue({
      transaction: { requestId: "req-1" },
    } as never);
    const { result } = renderHook(() => useRequestP2P(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({
        recipientType: "email",
        recipientValue: "alice@test.com",
        amountCents: 2500,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useP2PTransactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches transactions", async () => {
    vi.mocked(gateway.p2p.listTransactions).mockResolvedValue({ transactions: [] });
    const { result } = renderHook(() => useP2PTransactions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCancelP2PRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels a request", async () => {
    vi.mocked(gateway.p2p.cancelRequest).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useCancelP2PRequest(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate("req-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useP2PLimits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches limits", async () => {
    vi.mocked(gateway.p2p.getLimits).mockResolvedValue({
      limits: { dailyLimitCents: 100000 },
    } as never);
    const { result } = renderHook(() => useP2PLimits(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      (result.current.data as never as { limits: { dailyLimitCents: number } })?.limits
        ?.dailyLimitCents,
    ).toBe(100000);
  });
});
