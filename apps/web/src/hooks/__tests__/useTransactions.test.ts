import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    transactions: {
      list: vi.fn(),
      get: vi.fn(),
      search: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import { useTransactions, useTransaction, transactionKeys } from "../useTransactions";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockTransactions = [
  {
    id: "txn-1",
    description: "Grocery Store",
    amountCents: -8500,
    category: "groceries",
    status: "posted",
    transactionDate: "2026-03-10",
  },
  {
    id: "txn-2",
    description: "Direct Deposit",
    amountCents: 300000,
    category: "income",
    status: "posted",
    transactionDate: "2026-03-09",
  },
  {
    id: "txn-3",
    description: "Coffee Shop",
    amountCents: -450,
    category: "dining",
    status: "pending",
    transactionDate: "2026-03-11",
  },
];

describe("transactionKeys", () => {
  it("has correct all key", () => {
    expect(transactionKeys.all).toEqual(["transactions"]);
  });

  it("has correct list key with params", () => {
    const params = { accountId: "a1", category: "food" as never };
    expect(transactionKeys.list(params)).toEqual(["transactions", "list", params]);
  });

  it("has correct detail key", () => {
    expect(transactionKeys.detail("txn-1")).toEqual(["transactions", "txn-1"]);
  });
});

describe("useTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches transactions list", async () => {
    vi.mocked(gateway.transactions.list).mockResolvedValue({
      transactions: mockTransactions as never[],
      _pagination: { total: 3, limit: 50, offset: 0, hasMore: false },
    });

    const { result } = renderHook(() => useTransactions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.transactions).toHaveLength(3);
  });

  it("passes accountId filter", async () => {
    vi.mocked(gateway.transactions.list).mockResolvedValue({
      transactions: [mockTransactions[0]] as never[],
    });

    const { result } = renderHook(() => useTransactions({ accountId: "acct-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.transactions.list).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: "acct-1" }),
    );
  });

  it("passes category filter", async () => {
    vi.mocked(gateway.transactions.list).mockResolvedValue({ transactions: [] });

    const { result } = renderHook(() => useTransactions({ category: "groceries" as never }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.transactions.list).toHaveBeenCalledWith(
      expect.objectContaining({ category: "groceries" }),
    );
  });

  it("passes date range filter", async () => {
    vi.mocked(gateway.transactions.list).mockResolvedValue({ transactions: [] });

    const { result } = renderHook(
      () => useTransactions({ fromDate: "2026-03-01", toDate: "2026-03-31" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.transactions.list).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate: "2026-03-01", toDate: "2026-03-31" }),
    );
  });

  it("passes pagination parameters", async () => {
    vi.mocked(gateway.transactions.list).mockResolvedValue({ transactions: [] });

    const { result } = renderHook(() => useTransactions({ limit: 10, offset: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.transactions.list).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 20 }),
    );
  });

  it("passes search parameter", async () => {
    vi.mocked(gateway.transactions.list).mockResolvedValue({ transactions: [] });

    const { result } = renderHook(() => useTransactions({ search: "coffee" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.transactions.list).toHaveBeenCalledWith(
      expect.objectContaining({ search: "coffee" }),
    );
  });

  it("handles empty results", async () => {
    vi.mocked(gateway.transactions.list).mockResolvedValue({ transactions: [] });

    const { result } = renderHook(() => useTransactions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.transactions).toHaveLength(0);
  });

  it("handles API error", async () => {
    vi.mocked(gateway.transactions.list).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useTransactions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Server error");
  });

  it("passes combined filters", async () => {
    vi.mocked(gateway.transactions.list).mockResolvedValue({ transactions: [] });

    const { result } = renderHook(
      () =>
        useTransactions({
          accountId: "acct-1",
          category: "dining" as never,
          fromDate: "2026-03-01",
          toDate: "2026-03-31",
          limit: 25,
          offset: 0,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.transactions.list).toHaveBeenCalledWith({
      accountId: "acct-1",
      category: "dining",
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      limit: 25,
      offset: 0,
    });
  });

  it("passes status filter", async () => {
    vi.mocked(gateway.transactions.list).mockResolvedValue({ transactions: [] });

    const { result } = renderHook(() => useTransactions({ status: "pending" as never }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.transactions.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  it("passes type filter", async () => {
    vi.mocked(gateway.transactions.list).mockResolvedValue({ transactions: [] });

    const { result } = renderHook(() => useTransactions({ type: "debit" as never }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.transactions.list).toHaveBeenCalledWith(
      expect.objectContaining({ type: "debit" }),
    );
  });

  it("starts in loading state", () => {
    vi.mocked(gateway.transactions.list).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTransactions(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });
});

describe("useTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single transaction", async () => {
    vi.mocked(gateway.transactions.get).mockResolvedValue({
      transaction: {
        id: "txn-1",
        description: "Grocery Store",
        amountCents: -8500,
        category: "groceries",
        status: "posted",
      },
    } as never);

    const { result } = renderHook(() => useTransaction("txn-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
    expect(gateway.transactions.get).toHaveBeenCalledWith("txn-1");
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useTransaction(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(gateway.transactions.get).not.toHaveBeenCalled();
  });

  it("handles transaction not found", async () => {
    vi.mocked(gateway.transactions.get).mockRejectedValue(new Error("Transaction not found"));

    const { result } = renderHook(() => useTransaction("bad-id"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Transaction not found");
  });

  it("returns credit transaction data", async () => {
    vi.mocked(gateway.transactions.get).mockResolvedValue({
      transaction: {
        id: "txn-2",
        description: "Direct Deposit",
        amountCents: 300000,
        category: "income",
        status: "posted",
      },
    } as never);

    const { result } = renderHook(() => useTransaction("txn-2"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("returns pending transaction data", async () => {
    vi.mocked(gateway.transactions.get).mockResolvedValue({
      transaction: {
        id: "txn-3",
        description: "Pending Auth",
        amountCents: -1500,
        status: "pending",
      },
    } as never);

    const { result } = renderHook(() => useTransaction("txn-3"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
