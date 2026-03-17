import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    alias: {
      getDirectories: vi.fn(),
      resolve: vi.fn(),
      pay: vi.fn(),
      listInboundR2P: vi.fn(),
      respondToR2P: vi.fn(),
      listOutboundR2P: vi.fn(),
      sendR2P: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useAliasDirectories,
  useResolveAlias,
  usePayByAlias,
  useInboundR2P,
  useRespondToR2P,
  useOutboundR2P,
  useSendR2P,
  aliasKeys,
} from "../useAliasPayments";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("aliasKeys", () => {
  it("has correct all key", () => {
    expect(aliasKeys.all).toEqual(["alias"]);
  });

  it("has correct directories key", () => {
    expect(aliasKeys.directories()).toEqual(["alias", "directories"]);
  });

  it("has correct r2p key", () => {
    expect(aliasKeys.r2p()).toEqual(["alias", "r2p"]);
  });

  it("has correct r2pInbound key", () => {
    expect(aliasKeys.r2pInbound({ status: "pending" })).toEqual([
      "alias",
      "r2p",
      "inbound",
      { status: "pending" },
    ]);
  });

  it("has correct r2pOutbound key", () => {
    expect(aliasKeys.r2pOutbound()).toEqual(["alias", "r2p", "outbound", undefined]);
  });
});

describe("useAliasDirectories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches directories successfully", async () => {
    vi.mocked(gateway.alias.getDirectories).mockResolvedValue({ directories: [] });

    const { result } = renderHook(() => useAliasDirectories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.alias.getDirectories).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useAliasDirectories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useResolveAlias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useResolveAlias(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("usePayByAlias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => usePayByAlias(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useInboundR2P", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches inbound R2P successfully", async () => {
    vi.mocked(gateway.alias.listInboundR2P).mockResolvedValue({ requests: [] });

    const { result } = renderHook(() => useInboundR2P(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.alias.listInboundR2P).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInboundR2P(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useRespondToR2P", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRespondToR2P(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useOutboundR2P", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches outbound R2P successfully", async () => {
    vi.mocked(gateway.alias.listOutboundR2P).mockResolvedValue({ requests: [] });

    const { result } = renderHook(() => useOutboundR2P(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.alias.listOutboundR2P).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useOutboundR2P(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useSendR2P", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useSendR2P(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});
