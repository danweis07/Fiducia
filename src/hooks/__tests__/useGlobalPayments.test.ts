import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    confirmationOfPayee: { verify: vi.fn() },
    sca: {
      initiate: vi.fn(),
      complete: vi.fn(),
      checkExemption: vi.fn(),
    },
    instantPayments: {
      list: vi.fn(),
      get: vi.fn(),
      send: vi.fn(),
      checkReceiver: vi.fn(),
      requestForPayment: vi.fn(),
    },
    globalCompliance: {
      requestDataPortability: vi.fn(),
      getDataResidency: vi.fn(),
      getLoanCoolingOff: vi.fn(),
      exerciseLoanWithdrawal: vi.fn(),
      getInterestWithholding: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useVerifyPayee,
  useInitiateSCA,
  useCompleteSCA,
  useSCAExemptionCheck,
  useInstantPayments,
  useInstantPayment,
  useSendInstantPayment,
  useCheckInstantPaymentReceiver,
  useSendRequestForPayment,
  useDataPortability,
  useDataResidency,
  useLoanCoolingOff,
  useExerciseLoanWithdrawal,
  useInterestWithholding,
} from "../useGlobalPayments";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useVerifyPayee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useVerifyPayee(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useInitiateSCA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useInitiateSCA(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useCompleteSCA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCompleteSCA(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useSCAExemptionCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches exemption check when params provided", async () => {
    vi.mocked(gateway.sca.checkExemption).mockResolvedValue({ exempt: true, reason: "low_value" });

    const { result } = renderHook(
      () => useSCAExemptionCheck({ amountCents: 100, currency: "EUR" } as unknown),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when params is null", () => {
    const { result } = renderHook(() => useSCAExemptionCheck(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.sca.checkExemption).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useSCAExemptionCheck({ amountCents: 100 } as unknown), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInstantPayments (from global)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches payments successfully", async () => {
    vi.mocked(gateway.instantPayments.list).mockResolvedValue({ payments: [] });

    const { result } = renderHook(() => useInstantPayments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.instantPayments.list).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInstantPayments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInstantPayment (from global)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single payment", async () => {
    vi.mocked(gateway.instantPayments.get).mockResolvedValue({ payment: { id: "p-1" } });

    const { result } = renderHook(() => useInstantPayment("p-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useInstantPayment(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useSendInstantPayment (from global)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useSendInstantPayment(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useCheckInstantPaymentReceiver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCheckInstantPaymentReceiver(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useSendRequestForPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useSendRequestForPayment(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useDataPortability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useDataPortability(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useDataResidency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches data residency successfully", async () => {
    vi.mocked(gateway.globalCompliance.getDataResidency).mockResolvedValue({ region: "EU" });

    const { result } = renderHook(() => useDataResidency(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.globalCompliance.getDataResidency).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useDataResidency(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useLoanCoolingOff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches cooling off data", async () => {
    vi.mocked(gateway.globalCompliance.getLoanCoolingOff).mockResolvedValue({ daysRemaining: 5 });

    const { result } = renderHook(() => useLoanCoolingOff("loan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when loanId is empty", () => {
    const { result } = renderHook(() => useLoanCoolingOff(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useExerciseLoanWithdrawal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useExerciseLoanWithdrawal(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useInterestWithholding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches withholding data", async () => {
    vi.mocked(gateway.globalCompliance.getInterestWithholding).mockResolvedValue({ withheld: 100 });

    const { result } = renderHook(() => useInterestWithholding("acct-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when accountId is empty", () => {
    const { result } = renderHook(() => useInterestWithholding(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
