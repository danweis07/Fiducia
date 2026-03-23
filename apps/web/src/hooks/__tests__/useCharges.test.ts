import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    charges: {
      definitions: vi.fn(),
      list: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import { useChargeDefinitions, useCharges, chargeKeys } from "../useCharges";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("chargeKeys", () => {
  it("has correct all key", () => {
    expect(chargeKeys.all).toEqual(["charges"]);
  });

  it("has correct definitions key", () => {
    expect(chargeKeys.definitions({ appliesTo: "savings" })).toEqual([
      "charges",
      "definitions",
      { appliesTo: "savings" },
    ]);
  });

  it("has correct list key", () => {
    expect(chargeKeys.list({ accountId: "acct-1", status: "active" })).toEqual([
      "charges",
      "list",
      { accountId: "acct-1", status: "active" },
    ]);
  });
});

describe("useChargeDefinitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches charge definitions successfully", async () => {
    const mockDefs = [{ id: "cd-1", name: "Monthly Fee", amountCents: 500 }];
    vi.mocked(gateway.charges.definitions).mockResolvedValue(mockDefs);

    const { result } = renderHook(() => useChargeDefinitions({ appliesTo: "checking" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(gateway.charges.definitions).toHaveBeenCalledWith({ appliesTo: "checking" });
  });

  it("fetches with empty params", async () => {
    vi.mocked(gateway.charges.definitions).mockResolvedValue([]);

    const { result } = renderHook(() => useChargeDefinitions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.charges.definitions).toHaveBeenCalledWith({});
  });
});

describe("useCharges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches charges when accountId is provided", async () => {
    const mockCharges = [{ id: "ch-1", amountCents: 1000, status: "pending" }];
    vi.mocked(gateway.charges.list).mockResolvedValue(mockCharges);

    const { result } = renderHook(() => useCharges({ accountId: "acct-1", status: "pending" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(gateway.charges.list).toHaveBeenCalledWith({ accountId: "acct-1", status: "pending" });
  });

  it("is disabled when accountId is not provided", () => {
    const { result } = renderHook(() => useCharges(), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe("idle");
    expect(gateway.charges.list).not.toHaveBeenCalled();
  });

  it("handles error", async () => {
    vi.mocked(gateway.charges.list).mockRejectedValue(new Error("Failed"));

    const { result } = renderHook(() => useCharges({ accountId: "acct-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
