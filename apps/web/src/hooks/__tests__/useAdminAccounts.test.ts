import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    adminAccounts: {
      list: vi.fn(),
      aggregates: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useAdminAccountList,
  useAdminAccountAggregates,
  adminAccountKeys,
} from "../useAdminAccounts";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("adminAccountKeys", () => {
  it("has correct all key", () => {
    expect(adminAccountKeys.all).toEqual(["admin-accounts"]);
  });

  it("has correct list key", () => {
    expect(adminAccountKeys.list({ type: "checking" })).toEqual([
      "admin-accounts",
      "list",
      { type: "checking" },
    ]);
  });

  it("has correct aggregates key", () => {
    expect(adminAccountKeys.aggregates()).toEqual(["admin-accounts", "aggregates"]);
  });
});

describe("useAdminAccountList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches admin accounts successfully", async () => {
    vi.mocked(gateway.adminAccounts.list).mockResolvedValue({ accounts: [], total: 0 });

    const { result } = renderHook(() => useAdminAccountList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.adminAccounts.list).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAdminAccountList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useAdminAccountAggregates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches aggregates successfully", async () => {
    vi.mocked(gateway.adminAccounts.aggregates).mockResolvedValue({
      totalAccounts: 100,
      totalBalanceCents: 50000000,
    });

    const { result } = renderHook(() => useAdminAccountAggregates(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.adminAccounts.aggregates).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAdminAccountAggregates(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
