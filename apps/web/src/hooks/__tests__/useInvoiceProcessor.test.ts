import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    invoiceProcessor: {
      list: vi.fn(),
      get: vi.fn(),
      analyze: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useInvoices,
  useInvoice,
  useAnalyzeInvoice,
  useConfirmInvoice,
  useCancelInvoice,
} from "../useInvoiceProcessor";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useInvoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches invoices successfully", async () => {
    vi.mocked(gateway.invoiceProcessor.list).mockResolvedValue({ invoices: [] });

    const { result } = renderHook(() => useInvoices(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.invoiceProcessor.list).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInvoices(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single invoice", async () => {
    vi.mocked(gateway.invoiceProcessor.get).mockResolvedValue({ id: "inv-1", status: "pending" });

    const { result } = renderHook(() => useInvoice("inv-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useInvoice(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.invoiceProcessor.get).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInvoice("inv-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useAnalyzeInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useAnalyzeInvoice(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useConfirmInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useConfirmInvoice(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useCancelInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCancelInvoice(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});
