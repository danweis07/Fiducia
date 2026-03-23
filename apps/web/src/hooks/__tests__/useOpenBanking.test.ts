import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    openBanking: {
      listConsents: vi.fn(),
      getConsent: vi.fn(),
      listAccessLogs: vi.fn(),
      getConsentSummary: vi.fn(),
      grantConsent: vi.fn(),
      revokeConsent: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useOpenBankingConsents,
  useOpenBankingConsent,
  useOpenBankingAccessLogs,
  useOpenBankingConsentSummary,
  useGrantConsent,
  useRevokeConsent,
  openBankingKeys,
} from "../useOpenBanking";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("openBankingKeys", () => {
  it("has correct all key", () => {
    expect(openBankingKeys.all).toEqual(["openBanking"]);
  });

  it("has correct consents key", () => {
    expect(openBankingKeys.consents("active" as unknown)).toEqual([
      "openBanking",
      "consents",
      "active",
    ]);
  });

  it("has correct consent key", () => {
    expect(openBankingKeys.consent("c-1")).toEqual(["openBanking", "consents", "c-1"]);
  });

  it("has correct accessLogs key", () => {
    expect(openBankingKeys.accessLogs("c-1")).toEqual(["openBanking", "accessLogs", "c-1"]);
  });

  it("has correct summary key", () => {
    expect(openBankingKeys.summary()).toEqual(["openBanking", "summary"]);
  });
});

describe("useOpenBankingConsents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches consents successfully", async () => {
    vi.mocked(gateway.openBanking.listConsents).mockResolvedValue({ consents: [] });

    const { result } = renderHook(() => useOpenBankingConsents(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.openBanking.listConsents).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useOpenBankingConsents(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useOpenBankingConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches consent by id", async () => {
    vi.mocked(gateway.openBanking.getConsent).mockResolvedValue({ id: "c-1", status: "active" });

    const { result } = renderHook(() => useOpenBankingConsent("c-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when consentId is empty", () => {
    const { result } = renderHook(() => useOpenBankingConsent(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.openBanking.getConsent).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useOpenBankingConsent("c-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useOpenBankingAccessLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches access logs successfully", async () => {
    vi.mocked(gateway.openBanking.listAccessLogs).mockResolvedValue({ logs: [] });

    const { result } = renderHook(() => useOpenBankingAccessLogs("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.openBanking.listAccessLogs).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useOpenBankingAccessLogs("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useOpenBankingConsentSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches consent summary successfully", async () => {
    vi.mocked(gateway.openBanking.getConsentSummary).mockResolvedValue({ totalActive: 5 });

    const { result } = renderHook(() => useOpenBankingConsentSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.openBanking.getConsentSummary).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useOpenBankingConsentSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useGrantConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useGrantConsent(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useRevokeConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRevokeConsent(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});
