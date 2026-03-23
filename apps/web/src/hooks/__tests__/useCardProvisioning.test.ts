import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    cardProvisioning: {
      config: vi.fn(),
      checkEligibility: vi.fn(),
      initiate: vi.fn(),
      complete: vi.fn(),
      credentials: vi.fn(),
      requestDigitalOnly: vi.fn(),
      requestPhysical: vi.fn(),
      reportAndReplace: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useProvisioningConfig,
  useProvisioningEligibility,
  useInitiateProvisioning,
  useCompleteProvisioning,
  useCardCredentials,
  useRequestDigitalOnlyCard,
  useRequestPhysicalCard,
  useReportAndReplaceCard,
  cardProvisioningKeys,
} from "../useCardProvisioning";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("cardProvisioningKeys", () => {
  it("has correct all key", () => {
    expect(cardProvisioningKeys.all).toEqual(["cardProvisioning"]);
  });

  it("has correct config key", () => {
    expect(cardProvisioningKeys.config()).toEqual(["cardProvisioning", "config"]);
  });

  it("has correct eligibility key", () => {
    expect(cardProvisioningKeys.eligibility("card-1", "apple_pay" as unknown)).toEqual([
      "cardProvisioning",
      "eligibility",
      "card-1",
      "apple_pay",
    ]);
  });
});

describe("useProvisioningConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches config successfully", async () => {
    vi.mocked(gateway.cardProvisioning.config).mockResolvedValue({ enabled: true });

    const { result } = renderHook(() => useProvisioningConfig(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ enabled: true });
  });

  it("handles error", async () => {
    vi.mocked(gateway.cardProvisioning.config).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useProvisioningConfig(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useProvisioningEligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches eligibility successfully", async () => {
    vi.mocked(gateway.cardProvisioning.checkEligibility).mockResolvedValue({ eligible: true });

    const { result } = renderHook(
      () => useProvisioningEligibility("card-1", "apple_pay" as unknown),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when cardId is empty", () => {
    const { result } = renderHook(() => useProvisioningEligibility("", "apple_pay" as unknown), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.cardProvisioning.checkEligibility).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(
      () => useProvisioningEligibility("card-1", "apple_pay" as unknown),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInitiateProvisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useInitiateProvisioning(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useCompleteProvisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCompleteProvisioning(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useCardCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCardCredentials(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useRequestDigitalOnlyCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRequestDigitalOnlyCard(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useRequestPhysicalCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useRequestPhysicalCard(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useReportAndReplaceCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useReportAndReplaceCard(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});
