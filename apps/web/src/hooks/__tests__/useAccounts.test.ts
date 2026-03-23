import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    accounts: {
      list: vi.fn(),
      get: vi.fn(),
      summary: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import { useAccounts, useAccount, useAccountSummary, accountKeys } from "../useAccounts";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("accountKeys", () => {
  it("has correct all key", () => {
    expect(accountKeys.all).toEqual(["accounts"]);
  });

  it("has correct detail key", () => {
    expect(accountKeys.detail("acct-1")).toEqual(["accounts", "acct-1"]);
  });

  it("has correct summary key", () => {
    expect(accountKeys.summary()).toEqual(["accounts", "summary"]);
  });
});

describe("useAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches accounts successfully", async () => {
    const mockAccounts = [
      {
        id: "acct-1",
        type: "checking",
        balanceCents: 150000,
        status: "active",
        nickname: "Main Checking",
        accountNumberMasked: "****1234",
      },
      {
        id: "acct-2",
        type: "savings",
        balanceCents: 500000,
        status: "active",
        nickname: "Emergency Fund",
        accountNumberMasked: "****5678",
      },
    ];
    vi.mocked(gateway.accounts.list).mockResolvedValue({ accounts: mockAccounts });

    const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.accounts).toHaveLength(2);
    expect(result.current.data?.accounts[0].balanceCents).toBe(150000);
    expect(result.current.data?.accounts[0].type).toBe("checking");
  });

  it("handles API error gracefully", async () => {
    vi.mocked(gateway.accounts.list).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Network error");
  });

  it("returns empty array when no accounts", async () => {
    vi.mocked(gateway.accounts.list).mockResolvedValue({ accounts: [] });

    const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.accounts).toHaveLength(0);
  });

  it("includes all account types", async () => {
    const mockAccounts = [
      {
        id: "1",
        type: "checking",
        balanceCents: 100000,
        status: "active",
        accountNumberMasked: "****0001",
      },
      {
        id: "2",
        type: "savings",
        balanceCents: 200000,
        status: "active",
        accountNumberMasked: "****0002",
      },
      {
        id: "3",
        type: "cd",
        balanceCents: 1000000,
        status: "active",
        accountNumberMasked: "****0003",
      },
      {
        id: "4",
        type: "money_market",
        balanceCents: 500000,
        status: "active",
        accountNumberMasked: "****0004",
      },
    ];
    vi.mocked(gateway.accounts.list).mockResolvedValue({ accounts: mockAccounts });

    const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.accounts).toHaveLength(4);
    const types = result.current.data?.accounts.map((a: { type: string }) => a.type);
    expect(types).toContain("checking");
    expect(types).toContain("savings");
    expect(types).toContain("cd");
    expect(types).toContain("money_market");
  });

  it("starts in loading state", () => {
    vi.mocked(gateway.accounts.list).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("calls gateway.accounts.list exactly once", async () => {
    vi.mocked(gateway.accounts.list).mockResolvedValue({ accounts: [] });

    const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.accounts.list).toHaveBeenCalledTimes(1);
  });
});

describe("useAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single account by id", async () => {
    vi.mocked(gateway.accounts.get).mockResolvedValue({
      account: {
        id: "acct-1",
        type: "checking",
        balanceCents: 524300,
        availableBalanceCents: 500000,
        status: "active",
        interestRateBps: 10,
      },
    } as never);

    const { result } = renderHook(() => useAccount("acct-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
    expect(gateway.accounts.get).toHaveBeenCalledWith("acct-1");
  });

  it("does not fetch when id is empty string", () => {
    const { result } = renderHook(() => useAccount(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(gateway.accounts.get).not.toHaveBeenCalled();
  });

  it("handles not found error", async () => {
    vi.mocked(gateway.accounts.get).mockRejectedValue(new Error("Account not found"));

    const { result } = renderHook(() => useAccount("nonexistent"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Account not found");
  });

  it("passes different ids correctly", async () => {
    vi.mocked(gateway.accounts.get).mockResolvedValue({ account: { id: "acct-99" } } as never);

    const { result } = renderHook(() => useAccount("acct-99"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.accounts.get).toHaveBeenCalledWith("acct-99");
  });
});

describe("useAccountSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches account summary", async () => {
    vi.mocked(gateway.accounts.summary).mockResolvedValue({
      totalBalanceCents: 1774300,
      totalAvailableCents: 1750000,
      accountCount: 2,
      accounts: [],
    });

    const { result } = renderHook(() => useAccountSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalBalanceCents).toBe(1774300);
    expect(result.current.data?.accountCount).toBe(2);
  });

  it("handles summary with zero accounts", async () => {
    vi.mocked(gateway.accounts.summary).mockResolvedValue({
      totalBalanceCents: 0,
      totalAvailableCents: 0,
      accountCount: 0,
      accounts: [],
    });

    const { result } = renderHook(() => useAccountSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalBalanceCents).toBe(0);
    expect(result.current.data?.accountCount).toBe(0);
  });

  it("handles error in summary", async () => {
    vi.mocked(gateway.accounts.summary).mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useAccountSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("handles large balance sums", async () => {
    vi.mocked(gateway.accounts.summary).mockResolvedValue({
      totalBalanceCents: 999999999,
      totalAvailableCents: 999999999,
      accountCount: 10,
      accounts: [],
    });

    const { result } = renderHook(() => useAccountSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalBalanceCents).toBe(999999999);
  });
});
