import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    vault: {
      list: vi.fn(),
      upload: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      summary: vi.fn(),
      search: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useVaultDocuments,
  useUploadDocument,
  useVaultDocument,
  useDeleteVaultDocument,
  useVaultSummary,
  useSearchVaultDocuments,
} from "../useDocumentVault";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("useVaultDocuments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches documents", async () => {
    vi.mocked(gateway.vault.list).mockResolvedValue({ documents: [] });
    const { result } = renderHook(() => useVaultDocuments(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useVaultDocument", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches single document", async () => {
    vi.mocked(gateway.vault.get).mockResolvedValue({
      document: { id: "doc-1", name: "Statement" },
    } as never);
    const { result } = renderHook(() => useVaultDocument("doc-1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch without id", () => {
    const { result } = renderHook(() => useVaultDocument(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUploadDocument", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads a document", async () => {
    vi.mocked(gateway.vault.upload).mockResolvedValue({
      document: { id: "doc-new" } as never,
      uploadUrl: null,
    });
    const { result } = renderHook(() => useUploadDocument(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({
        name: "Tax Return",
        category: "tax" as unknown as import("@/types").VaultDocumentCategory,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteVaultDocument", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a document", async () => {
    vi.mocked(gateway.vault.delete).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useDeleteVaultDocument(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate("doc-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useVaultSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches summary", async () => {
    vi.mocked(gateway.vault.summary).mockResolvedValue({
      summary: { totalDocuments: 12, totalSizeBytes: 50000 } as never,
    });
    const { result } = renderHook(() => useVaultSummary(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useSearchVaultDocuments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("searches documents with query", async () => {
    vi.mocked(gateway.vault.search).mockResolvedValue({ documents: [] });
    const { result } = renderHook(() => useSearchVaultDocuments({ query: "tax" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not search without params", () => {
    const { result } = renderHook(() => useSearchVaultDocuments({ query: "" }), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
