import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    ekyc: {
      listProviders: vi.fn(),
      initiate: vi.fn(),
      getStatus: vi.fn(),
      startLiveness: vi.fn(),
      completeLiveness: vi.fn(),
      listVerifications: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useEKYCProviders,
  useInitiateEKYC,
  useEKYCStatus,
  useStartLiveness,
  useCompleteLiveness,
  useEKYCVerifications,
  ekycKeys,
} from "../useEKYC";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("ekycKeys", () => {
  it("has correct all key", () => {
    expect(ekycKeys.all).toEqual(["ekyc"]);
  });

  it("has correct providers key", () => {
    expect(ekycKeys.providers("US")).toEqual(["ekyc", "providers", "US"]);
  });

  it("has correct verifications key", () => {
    expect(ekycKeys.verifications("pending")).toEqual(["ekyc", "verifications", "pending"]);
  });

  it("has correct verification key", () => {
    expect(ekycKeys.verification("v-1")).toEqual(["ekyc", "verification", "v-1"]);
  });
});

describe("useEKYCProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches providers successfully", async () => {
    vi.mocked(gateway.ekyc.listProviders).mockResolvedValue({ providers: [] });

    const { result } = renderHook(() => useEKYCProviders(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.ekyc.listProviders).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useEKYCProviders(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInitiateEKYC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useInitiateEKYC(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useEKYCStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches verification status successfully", async () => {
    vi.mocked(gateway.ekyc.getStatus).mockResolvedValue({
      verification: { status: "completed" },
    } as never);

    const { result } = renderHook(() => useEKYCStatus("v-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when verificationId is empty", () => {
    const { result } = renderHook(() => useEKYCStatus(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.ekyc.getStatus).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useEKYCStatus("v-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useStartLiveness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useStartLiveness(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useCompleteLiveness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCompleteLiveness(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useEKYCVerifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches verifications successfully", async () => {
    vi.mocked(gateway.ekyc.listVerifications).mockResolvedValue({ verifications: [] });

    const { result } = renderHook(() => useEKYCVerifications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.ekyc.listVerifications).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useEKYCVerifications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
