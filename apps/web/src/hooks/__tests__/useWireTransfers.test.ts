import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    wires: {
      list: vi.fn(),
      get: vi.fn(),
      createDomestic: vi.fn(),
      createInternational: vi.fn(),
      cancel: vi.fn(),
      fees: vi.fn(),
      limits: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  wireKeys,
  useWires,
  useWire,
  useCreateDomesticWire,
  useCreateInternationalWire,
  useCancelWire,
  useWireFees,
  useWireLimits,
} from "../useWireTransfers";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("wireKeys", () => {
  it("has correct all key", () => {
    expect(wireKeys.all).toEqual(["wires"]);
  });

  it("has correct list key", () => {
    expect(wireKeys.list({ status: "pending" })).toEqual(["wires", "list", { status: "pending" }]);
  });

  it("has correct detail key", () => {
    expect(wireKeys.detail("w-1")).toEqual(["wires", "w-1"]);
  });

  it("has correct fees key", () => {
    expect(wireKeys.fees()).toEqual(["wires", "fees"]);
  });

  it("has correct limits key", () => {
    expect(wireKeys.limits()).toEqual(["wires", "limits"]);
  });
});

describe("useWires", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches wire list successfully", async () => {
    const mockWires = [
      { id: "w-1", amountCents: 50000, status: "pending" },
    ] as unknown as import("@/types").WireTransfer[];
    vi.mocked(gateway.wires.list).mockResolvedValue({ wires: mockWires });

    const { result } = renderHook(() => useWires({ status: "pending" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.wires).toHaveLength(1);
    expect(gateway.wires.list).toHaveBeenCalledWith({ status: "pending" });
  });
});

describe("useWire", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches single wire by id", async () => {
    const mockWire = { id: "w-1", amountCents: 50000 } as unknown as import("@/types").WireTransfer;
    vi.mocked(gateway.wires.get).mockResolvedValue({ wire: mockWire });

    const { result } = renderHook(() => useWire("w-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.wires.get).toHaveBeenCalledWith("w-1");
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useWire(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(gateway.wires.get).not.toHaveBeenCalled();
  });
});

describe("useCreateDomesticWire", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway.wires.createDomestic on mutate", async () => {
    const mockWire = { id: "w-2" } as unknown as import("@/types").WireTransfer;
    vi.mocked(gateway.wires.createDomestic).mockResolvedValue({ wire: mockWire });

    const { result } = renderHook(() => useCreateDomesticWire(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        fromAccountId: "acct-1",
        beneficiaryName: "John Doe",
        bankName: "Test Bank",
        routingNumber: "021000021",
        accountNumber: "****5678",
        amountCents: 100000,
        purpose: "payment",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.wires.createDomestic).toHaveBeenCalledTimes(1);
  });
});

describe("useCreateInternationalWire", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway.wires.createInternational on mutate", async () => {
    const mockWire = { id: "w-3" } as unknown as import("@/types").WireTransfer;
    vi.mocked(gateway.wires.createInternational).mockResolvedValue({ wire: mockWire });

    const { result } = renderHook(() => useCreateInternationalWire(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        fromAccountId: "acct-1",
        beneficiaryName: "Jane Doe",
        swiftCode: "CHASUS33",
        iban: "GB29NWBK60161331926819",
        bankName: "Int Bank",
        bankCountry: "GB",
        amountCents: 200000,
        currency: "GBP",
        purpose: "invoice",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.wires.createInternational).toHaveBeenCalledTimes(1);
  });
});

describe("useCancelWire", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls gateway.wires.cancel on mutate", async () => {
    vi.mocked(gateway.wires.cancel).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCancelWire(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate("w-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.wires.cancel).toHaveBeenCalledWith("w-1");
  });
});

describe("useWireFees", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches wire fee schedule", async () => {
    const mockFees = {
      domesticFeeCents: 2500,
      internationalFeeCents: 4500,
      expeditedDomesticFeeCents: 5000,
      expeditedInternationalFeeCents: 7500,
    } satisfies import("@/types").WireFeeSchedule;
    vi.mocked(gateway.wires.fees).mockResolvedValue({ fees: mockFees });

    const { result } = renderHook(() => useWireFees(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.fees).toEqual(mockFees);
  });
});

describe("useWireLimits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches wire limits", async () => {
    const mockLimits = {
      dailyLimitCents: 10000000,
      perTransactionLimitCents: 5000000,
      usedTodayCents: 0,
      remainingDailyCents: 10000000,
    } satisfies import("@/types").WireLimits;
    vi.mocked(gateway.wires.limits).mockResolvedValue({ limits: mockLimits });

    const { result } = renderHook(() => useWireLimits(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.limits).toEqual(mockLimits);
  });
});
