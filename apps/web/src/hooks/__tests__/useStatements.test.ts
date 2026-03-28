import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    statements: {
      list: vi.fn(),
      get: vi.fn(),
      config: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  statementKeys,
  useStatements,
  useStatementDetail,
  useStatementConfig,
} from "../useStatements";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("statementKeys", () => {
  it("has correct all key", () => {
    expect(statementKeys.all).toEqual(["statements"]);
  });

  it("has correct list key", () => {
    expect(statementKeys.list("acct-1")).toEqual(["statements", "list", "acct-1"]);
  });

  it("has correct detail key", () => {
    expect(statementKeys.detail("stmt-1")).toEqual(["statements", "detail", "stmt-1"]);
  });

  it("has correct config key", () => {
    expect(statementKeys.config()).toEqual(["statements", "config"]);
  });
});

describe("useStatements", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches statements for an account", async () => {
    const mockStatements = [
      { id: "stmt-1", period: "2026-01", accountId: "acct-1" },
    ] as unknown as import("@/types").AccountStatement[];
    vi.mocked(gateway.statements.list).mockResolvedValue({ statements: mockStatements });

    const { result } = renderHook(() => useStatements("acct-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.statements.list).toHaveBeenCalledWith({ accountId: "acct-1" });
  });

  it("does not fetch when accountId is empty", () => {
    const { result } = renderHook(() => useStatements(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(gateway.statements.list).not.toHaveBeenCalled();
  });
});

describe("useStatementDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches statement detail by id", async () => {
    const mockDetail = {
      id: "stmt-1",
      transactions: [],
    } as unknown as import("@/types").StatementDetail;
    vi.mocked(gateway.statements.get).mockResolvedValue({ statement: mockDetail });

    const { result } = renderHook(() => useStatementDetail("stmt-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.statements.get).toHaveBeenCalledWith("stmt-1");
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useStatementDetail(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useStatementConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches statement config", async () => {
    const mockConfig = { config: { deliveryMethod: "electronic", retentionMonths: 84 } } as never;
    vi.mocked(gateway.statements.config).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useStatementConfig(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockConfig);
  });
});
