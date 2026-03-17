import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    cashSweeps: {
      listRules: vi.fn(),
      createRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      toggleRule: vi.fn(),
      listExecutions: vi.fn(),
      getSummary: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useSweepRules,
  useCreateSweepRule,
  useUpdateSweepRule,
  useDeleteSweepRule,
  useToggleSweepRule,
  useSweepExecutions,
  useSweepSummary,
} from "../useCashSweeps";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useSweepRules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches sweep rules successfully", async () => {
    vi.mocked(gateway.cashSweeps.listRules).mockResolvedValue({ rules: [] });

    const { result } = renderHook(() => useSweepRules(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.cashSweeps.listRules).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useSweepRules(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateSweepRule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateSweepRule(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useUpdateSweepRule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useUpdateSweepRule(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useDeleteSweepRule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useDeleteSweepRule(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useToggleSweepRule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useToggleSweepRule(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useSweepExecutions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches executions successfully", async () => {
    vi.mocked(gateway.cashSweeps.listExecutions).mockResolvedValue({ executions: [] });

    const { result } = renderHook(() => useSweepExecutions("rule-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.cashSweeps.listExecutions).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useSweepExecutions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useSweepSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches summary successfully", async () => {
    vi.mocked(gateway.cashSweeps.getSummary).mockResolvedValue({ totalSweptCents: 500000 });

    const { result } = renderHook(() => useSweepSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.cashSweeps.getSummary).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useSweepSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
