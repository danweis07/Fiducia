import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    aggregator: {
      searchInstitutions: vi.fn(),
      listConnections: vi.fn(),
      listAccounts: vi.fn(),
      listTransactions: vi.fn(),
      createConnection: vi.fn(),
      refreshConnection: vi.fn(),
      removeConnection: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useAggregatorInstitutions,
  useAggregatorConnections,
  useAggregatedAccounts,
  useAggregatedTransactions,
  useCreateAggregatorConnection,
  useRefreshAggregatorConnection,
  useRemoveAggregatorConnection,
  aggregatorKeys,
} from "../useAggregator";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("aggregatorKeys", () => {
  it("has correct all key", () => {
    expect(aggregatorKeys.all).toEqual(["aggregator"]);
  });

  it("has correct institutions key", () => {
    expect(aggregatorKeys.institutions("chase", "US")).toEqual([
      "aggregator",
      "institutions",
      "chase",
      "US",
    ]);
  });

  it("has correct connections key", () => {
    expect(aggregatorKeys.connections()).toEqual(["aggregator", "connections"]);
  });

  it("has correct accounts key", () => {
    expect(aggregatorKeys.accounts("conn-1")).toEqual(["aggregator", "accounts", "conn-1"]);
  });

  it("has correct transactions key", () => {
    expect(aggregatorKeys.transactions("acct-1")).toEqual(["aggregator", "transactions", "acct-1"]);
  });
});

describe("useAggregatorInstitutions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches institutions successfully", async () => {
    vi.mocked(gateway.aggregator.searchInstitutions).mockResolvedValue({ institutions: [] });

    const { result } = renderHook(() => useAggregatorInstitutions("chase"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when query is too short", () => {
    const { result } = renderHook(() => useAggregatorInstitutions("c"), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.aggregator.searchInstitutions).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAggregatorInstitutions("chase"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useAggregatorConnections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches connections successfully", async () => {
    vi.mocked(gateway.aggregator.listConnections).mockResolvedValue({ connections: [] });

    const { result } = renderHook(() => useAggregatorConnections(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.aggregator.listConnections).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAggregatorConnections(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useAggregatedAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches accounts successfully", async () => {
    vi.mocked(gateway.aggregator.listAccounts).mockResolvedValue({ accounts: [] });

    const { result } = renderHook(() => useAggregatedAccounts("conn-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.aggregator.listAccounts).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAggregatedAccounts("conn-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useAggregatedTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches transactions successfully", async () => {
    vi.mocked(gateway.aggregator.listTransactions).mockResolvedValue({ transactions: [] });

    const { result } = renderHook(() => useAggregatedTransactions("acct-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when accountId is empty", () => {
    const { result } = renderHook(() => useAggregatedTransactions(""), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.aggregator.listTransactions).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAggregatedTransactions("acct-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateAggregatorConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateAggregatorConnection(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useRefreshAggregatorConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRefreshAggregatorConnection(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useRemoveAggregatorConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRemoveAggregatorConnection(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});
