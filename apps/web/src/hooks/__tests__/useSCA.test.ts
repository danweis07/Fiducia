import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    intlSca: {
      getConfig: vi.fn(),
      createChallenge: vi.fn(),
      verifyFactor: vi.fn(),
      listTrustedDevices: vi.fn(),
      bindDevice: vi.fn(),
      unbindDevice: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useSCAConfig,
  useCreateSCAChallenge,
  useVerifySCAFactor,
  useSCATrustedDevices,
  useBindSCADevice,
  useUnbindSCADevice,
  scaKeys,
} from "../useSCA";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("scaKeys", () => {
  it("has correct all key", () => {
    expect(scaKeys.all).toEqual(["sca"]);
  });

  it("has correct config key", () => {
    expect(scaKeys.config()).toEqual(["sca", "config"]);
  });

  it("has correct challenges key", () => {
    expect(scaKeys.challenges()).toEqual(["sca", "challenges"]);
  });

  it("has correct devices key", () => {
    expect(scaKeys.devices()).toEqual(["sca", "devices"]);
  });
});

describe("useSCAConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches config successfully", async () => {
    const mockConfig = {
      scaEnabled: true,
      defaultThresholdCents: 10000,
      thresholdCurrency: "USD",
      biometricPreferred: false,
      challengeExpirySeconds: 300,
      maxRetries: 3,
      supportedMethods: ["totp" as const, "pin" as const],
    } satisfies import("@/types").SCAConfig;
    vi.mocked(gateway.intlSca.getConfig).mockResolvedValue({ config: mockConfig });

    const { result } = renderHook(() => useSCAConfig(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.config).toEqual(mockConfig);
  });

  it("handles error", async () => {
    vi.mocked(gateway.intlSca.getConfig).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useSCAConfig(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateSCAChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateSCAChallenge(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useVerifySCAFactor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useVerifySCAFactor(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useSCATrustedDevices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches trusted devices successfully", async () => {
    vi.mocked(gateway.intlSca.listTrustedDevices).mockResolvedValue({ devices: [] });

    const { result } = renderHook(() => useSCATrustedDevices(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.intlSca.listTrustedDevices).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useSCATrustedDevices(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useBindSCADevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useBindSCADevice(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useUnbindSCADevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useUnbindSCADevice(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});
