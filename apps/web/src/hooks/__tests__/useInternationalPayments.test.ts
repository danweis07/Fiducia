import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    internationalPayments: {
      listPayments: vi.fn(),
      getCoverage: vi.fn(),
      getFXQuote: vi.fn(),
      createPayment: vi.fn(),
      listCards: vi.fn(),
      issueCard: vi.fn(),
      listPayouts: vi.fn(),
      createPayout: vi.fn(),
    },
    intlPaymentAliases: {
      listAliases: vi.fn(),
      createAlias: vi.fn(),
      deleteAlias: vi.fn(),
      confirmPayee: vi.fn(),
      send: vi.fn(),
      parseQR: vi.fn(),
      generateQR: vi.fn(),
      listPayments: vi.fn(),
      getLimits: vi.fn(),
    },
    internationalBillPay: {
      searchBillers: vi.fn(),
      listPayments: vi.fn(),
      payBill: vi.fn(),
      getCountries: vi.fn(),
    },
    internationalLoans: {
      listApplications: vi.fn(),
      createApplication: vi.fn(),
    },
    baas: {
      listAccounts: vi.fn(),
      createAccount: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  usePaymentAliases,
  useCreatePaymentAlias,
  useDeletePaymentAlias,
  useConfirmPayee,
  useSendInternationalPayment,
  useParseQR,
  useGenerateQR,
  useInternationalPaymentHistory,
  useInternationalPaymentLimits,
  useInternationalCoverage,
  useFXQuote,
  useInternationalPayments,
  useCreateInternationalPayment,
  useGlobalCards,
  useIssueGlobalCard,
  useInternationalPayouts,
  useCreateInternationalPayout,
  useInternationalBillers,
  useInternationalBillPayments,
  usePayInternationalBill,
  useInternationalBillPayCountries,
  useInternationalLoanApplications,
  useCreateInternationalLoanApplication,
  useBaaSAccounts,
  useCreateBaaSAccount,
  internationalPaymentKeys,
} from "../useInternationalPayments";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("internationalPaymentKeys", () => {
  it("has correct all key", () => {
    expect(internationalPaymentKeys.all).toEqual(["internationalPayments"]);
  });

  it("has correct aliases key", () => {
    expect(internationalPaymentKeys.aliases()).toEqual(["internationalPayments", "aliases"]);
  });

  it("has correct limits key", () => {
    expect(internationalPaymentKeys.limits()).toEqual(["internationalPayments", "limits"]);
  });
});

describe("usePaymentAliases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches aliases successfully", async () => {
    vi.mocked(gateway.intlPaymentAliases.listAliases).mockResolvedValue({ aliases: [] });

    const { result } = renderHook(() => usePaymentAliases(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.intlPaymentAliases.listAliases).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => usePaymentAliases(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreatePaymentAlias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreatePaymentAlias(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useDeletePaymentAlias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useDeletePaymentAlias(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useConfirmPayee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useConfirmPayee(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useSendInternationalPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useSendInternationalPayment(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useParseQR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useParseQR(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useGenerateQR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useGenerateQR(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useInternationalPaymentHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches payment history successfully", async () => {
    vi.mocked(gateway.internationalPayments.listPayments).mockResolvedValue([]);

    const { result } = renderHook(() => useInternationalPaymentHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.internationalPayments.listPayments).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInternationalPaymentHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInternationalPaymentLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches limits successfully", async () => {
    vi.mocked(gateway.intlPaymentAliases.getLimits).mockResolvedValue({
      limits: { dailyLimitCents: 1000000 } as never,
    });

    const { result } = renderHook(() => useInternationalPaymentLimits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("handles error", async () => {
    vi.mocked(gateway.intlPaymentAliases.getLimits).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useInternationalPaymentLimits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useInternationalCoverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches coverage successfully", async () => {
    vi.mocked(gateway.internationalPayments.getCoverage).mockResolvedValue({
      countries: [],
      total: 0,
    });

    const { result } = renderHook(() => useInternationalCoverage(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useFXQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches FX quote successfully", async () => {
    vi.mocked(gateway.internationalPayments.getFXQuote).mockResolvedValue({
      quoteId: "q-1",
      fromCurrency: "USD",
      toCurrency: "EUR",
      exchangeRate: 1.12,
      inverseRate: 0.89,
      fromAmountCents: 10000,
      toAmountCents: 11200,
      feeAmountCents: 100,
      feeCurrency: "USD",
      expiresAt: "2026-01-01T00:00:00Z",
    });

    const { result } = renderHook(() => useFXQuote("USD", "EUR", 10000), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when currencies are empty", () => {
    const { result } = renderHook(() => useFXQuote("", ""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useInternationalPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches payments successfully", async () => {
    vi.mocked(gateway.internationalPayments.listPayments).mockResolvedValue([]);

    const { result } = renderHook(() => useInternationalPayments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateInternationalPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateInternationalPayment(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useGlobalCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches cards successfully", async () => {
    vi.mocked(gateway.internationalPayments.listCards).mockResolvedValue([]);

    const { result } = renderHook(() => useGlobalCards(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useIssueGlobalCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useIssueGlobalCard(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useInternationalPayouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches payouts successfully", async () => {
    vi.mocked(gateway.internationalPayments.listPayouts).mockResolvedValue([]);

    const { result } = renderHook(() => useInternationalPayouts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateInternationalPayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateInternationalPayout(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useInternationalBillers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches billers when query is long enough", async () => {
    vi.mocked(gateway.internationalBillPay.searchBillers).mockResolvedValue({
      billers: [],
      total: 0,
    });

    const { result } = renderHook(() => useInternationalBillers("electric"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when query is too short", () => {
    const { result } = renderHook(() => useInternationalBillers("e"), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useInternationalBillPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches bill payments successfully", async () => {
    vi.mocked(gateway.internationalBillPay.listPayments).mockResolvedValue([]);

    const { result } = renderHook(() => useInternationalBillPayments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePayInternationalBill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => usePayInternationalBill(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useInternationalBillPayCountries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches countries successfully", async () => {
    vi.mocked(gateway.internationalBillPay.getCountries).mockResolvedValue({ countries: [] });

    const { result } = renderHook(() => useInternationalBillPayCountries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useInternationalLoanApplications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches loan applications successfully", async () => {
    vi.mocked(gateway.internationalLoans.listApplications).mockResolvedValue([]);

    const { result } = renderHook(() => useInternationalLoanApplications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateInternationalLoanApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateInternationalLoanApplication(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useBaaSAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches BaaS accounts successfully", async () => {
    vi.mocked(gateway.baas.listAccounts).mockResolvedValue([]);

    const { result } = renderHook(() => useBaaSAccounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCreateBaaSAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateBaaSAccount(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});
