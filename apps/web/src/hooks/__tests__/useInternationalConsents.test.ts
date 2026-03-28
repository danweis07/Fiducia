import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    internationalConsents: {
      list: vi.fn(),
      accessLogs: vi.fn(),
      summary: vi.fn(),
      revoke: vi.fn(),
      revokeScope: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useInternationalConsents,
  useInternationalConsentAccessLogs,
  useInternationalConsentSummary,
  useRevokeInternationalConsent,
  useRevokeInternationalConsentScope,
  internationalConsentKeys,
} from "../useInternationalConsents";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("internationalConsentKeys", () => {
  it("has correct all key", () => {
    expect(internationalConsentKeys.all).toEqual(["internationalConsents"]);
  });

  it("has correct consents key", () => {
    expect(
      internationalConsentKeys.consents("active" as import("@/types").InternationalConsentStatus),
    ).toEqual(["internationalConsents", "consents", "active"]);
  });

  it("has correct accessLogs key", () => {
    expect(internationalConsentKeys.accessLogs("c-1")).toEqual([
      "internationalConsents",
      "accessLogs",
      "c-1",
    ]);
  });

  it("has correct summary key", () => {
    expect(internationalConsentKeys.summary()).toEqual(["internationalConsents", "summary"]);
  });
});

describe("useInternationalConsents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches consents successfully", async () => {
    vi.mocked(gateway.internationalConsents.list).mockResolvedValue({ consents: [] });

    const { result } = renderHook(() => useInternationalConsents(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.internationalConsents.list).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInternationalConsents(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInternationalConsentAccessLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches access logs successfully", async () => {
    vi.mocked(gateway.internationalConsents.accessLogs).mockResolvedValue({ accessLogs: [] });

    const { result } = renderHook(() => useInternationalConsentAccessLogs("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.internationalConsents.accessLogs).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInternationalConsentAccessLogs("c-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInternationalConsentSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches summary successfully", async () => {
    vi.mocked(gateway.internationalConsents.summary).mockResolvedValue({
      summary: { totalActive: 3 },
    } as never);

    const { result } = renderHook(() => useInternationalConsentSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.internationalConsents.summary).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInternationalConsentSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useRevokeInternationalConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRevokeInternationalConsent(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useRevokeInternationalConsentScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRevokeInternationalConsentScope(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});
