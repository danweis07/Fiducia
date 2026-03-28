import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    openFinance: {
      listConnections: vi.fn(),
      createConnection: vi.fn(),
      refreshConnection: vi.fn(),
      removeConnection: vi.fn(),
      listAccounts: vi.fn(),
      getNetWorth: vi.fn(),
      getAlternativeCreditData: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useOpenFinanceConnections,
  useCreateOpenFinanceConnection,
  useRefreshOpenFinanceConnection,
  useRemoveOpenFinanceConnection,
  useOpenFinanceAccounts,
  useOpenFinanceNetWorth,
  useAlternativeCreditData,
  openFinanceKeys,
} from "../useOpenFinance";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("openFinanceKeys", () => {
  it("has correct all key", () => {
    expect(openFinanceKeys.all).toEqual(["openFinance"]);
  });

  it("has correct connections key", () => {
    expect(openFinanceKeys.connections()).toEqual(["openFinance", "connections"]);
  });

  it("has correct accounts key", () => {
    expect(openFinanceKeys.accounts("conn-1")).toEqual(["openFinance", "accounts", "conn-1"]);
  });

  it("has correct netWorth key", () => {
    expect(openFinanceKeys.netWorth()).toEqual(["openFinance", "netWorth"]);
  });

  it("has correct alternativeCredit key", () => {
    expect(openFinanceKeys.alternativeCredit()).toEqual(["openFinance", "alternativeCredit"]);
  });
});

describe("useOpenFinanceConnections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches connections successfully", async () => {
    vi.mocked(gateway.openFinance.listConnections).mockResolvedValue({ connections: [] });

    const { result } = renderHook(() => useOpenFinanceConnections(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.openFinance.listConnections).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useOpenFinanceConnections(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateOpenFinanceConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateOpenFinanceConnection(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useRefreshOpenFinanceConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRefreshOpenFinanceConnection(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useRemoveOpenFinanceConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRemoveOpenFinanceConnection(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useOpenFinanceAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches accounts successfully", async () => {
    vi.mocked(gateway.openFinance.listAccounts).mockResolvedValue({ accounts: [] });

    const { result } = renderHook(() => useOpenFinanceAccounts("conn-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.openFinance.listAccounts).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useOpenFinanceAccounts("conn-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useOpenFinanceNetWorth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches net worth successfully", async () => {
    vi.mocked(gateway.openFinance.getNetWorth).mockResolvedValue({
      netWorth: { totalCents: 500000 },
    } as never);

    const { result } = renderHook(() => useOpenFinanceNetWorth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.openFinance.getNetWorth).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useOpenFinanceNetWorth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useAlternativeCreditData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches alternative credit data successfully", async () => {
    vi.mocked(gateway.openFinance.getAlternativeCreditData).mockResolvedValue({
      creditData: { score: 720 },
    } as never);

    const { result } = renderHook(() => useAlternativeCreditData(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.openFinance.getAlternativeCreditData).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAlternativeCreditData(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
