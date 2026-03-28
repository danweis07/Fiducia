import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    cd: {
      maturity: vi.fn(),
      updateMaturityAction: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/useAccounts", () => ({
  accountKeys: {
    detail: (id: string) => ["accounts", id],
  },
}));

import { gateway } from "@/lib/gateway";
import { cdKeys, useCDMaturity, useUpdateCDMaturityAction } from "../useCDMaturity";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("cdKeys", () => {
  it("has correct maturity key", () => {
    expect(cdKeys.maturity("acct-1")).toEqual(["cd", "maturity", "acct-1"]);
  });
});

describe("useCDMaturity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches CD maturity info for an account", async () => {
    const mockMaturity = {
      maturity: {
        accountId: "acct-1",
        maturityDate: "2027-01-15",
        maturityAction: "renew_same_term" as const,
        maturityTransferAccountId: null,
        originalTermMonths: 12,
        penaltyWithdrawnCents: 0,
        productId: null,
      },
    };
    vi.mocked(gateway.cd.maturity).mockResolvedValue(mockMaturity);

    const { result } = renderHook(() => useCDMaturity("acct-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMaturity);
    expect(gateway.cd.maturity).toHaveBeenCalledWith("acct-1");
  });

  it("does not fetch when accountId is empty", () => {
    const { result } = renderHook(() => useCDMaturity(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(gateway.cd.maturity).not.toHaveBeenCalled();
  });
});

describe("useUpdateCDMaturityAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway.cd.updateMaturityAction on mutate", async () => {
    vi.mocked(gateway.cd.updateMaturityAction).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUpdateCDMaturityAction(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        accountId: "acct-1",
        maturityAction: "transfer",
        maturityTransferAccountId: "acct-2",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.cd.updateMaturityAction).toHaveBeenCalledWith("acct-1", "transfer", "acct-2");
  });

  it("calls without transfer account id for renew action", async () => {
    vi.mocked(gateway.cd.updateMaturityAction).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUpdateCDMaturityAction(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        accountId: "acct-1",
        maturityAction: "renew",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.cd.updateMaturityAction).toHaveBeenCalledWith("acct-1", "renew", undefined);
  });
});
