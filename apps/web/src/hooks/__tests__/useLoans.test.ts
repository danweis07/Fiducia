import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    loans: {
      list: vi.fn(),
      get: vi.fn(),
      schedule: vi.fn(),
      payments: vi.fn(),
      makePayment: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/useAccounts", () => ({
  accountKeys: { all: ["accounts"] as const },
}));

import {
  useLoans,
  useLoan,
  useLoanSchedule,
  useLoanPayments,
  useMakeLoanPayment,
  loanKeys,
} from "../useLoans";
import { gateway } from "@/lib/gateway";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockLoans = [
  {
    id: "loan-1",
    productName: "auto",
    loanNumberMasked: "****5678",
    outstandingBalanceCents: 2450000,
    principalCents: 2500000,
    interestRateBps: 549,
    status: "active",
  },
  {
    id: "loan-2",
    productName: "mortgage",
    loanNumberMasked: "****9012",
    outstandingBalanceCents: 28500000,
    principalCents: 30000000,
    interestRateBps: 625,
    status: "active",
  },
] as unknown as import("@/types").Loan[];

describe("loanKeys", () => {
  it("has correct all key", () => {
    expect(loanKeys.all).toEqual(["loans"]);
  });

  it("has correct detail key", () => {
    expect(loanKeys.detail("loan-1")).toEqual(["loans", "loan-1"]);
  });

  it("has correct schedule key", () => {
    expect(loanKeys.schedule("loan-1")).toEqual(["loans", "loan-1", "schedule"]);
  });

  it("has correct payments key", () => {
    expect(loanKeys.payments("loan-1")).toEqual(["loans", "loan-1", "payments"]);
  });

  it("has correct list key with params", () => {
    expect(loanKeys.list({ status: "active" })).toEqual(["loans", "list", { status: "active" }]);
  });
});

describe("useLoans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches loans list", async () => {
    vi.mocked(gateway.loans.list).mockResolvedValue({ loans: mockLoans });

    const { result } = renderHook(() => useLoans(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.loans).toHaveLength(2);
    expect(result.current.data?.loans[0].productName).toBe("auto");
  });

  it("passes status filter", async () => {
    vi.mocked(gateway.loans.list).mockResolvedValue({ loans: [mockLoans[0]] });

    const { result } = renderHook(() => useLoans({ status: "active" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.loans.list).toHaveBeenCalledWith({ status: "active" });
  });

  it("handles empty loans", async () => {
    vi.mocked(gateway.loans.list).mockResolvedValue({ loans: [] });

    const { result } = renderHook(() => useLoans(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.loans).toHaveLength(0);
  });

  it("handles error", async () => {
    vi.mocked(gateway.loans.list).mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useLoans(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("returns different loan types", async () => {
    vi.mocked(gateway.loans.list).mockResolvedValue({ loans: mockLoans });

    const { result } = renderHook(() => useLoans(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const types = result.current.data?.loans.map((l: { productName?: string }) => l.productName);
    expect(types).toContain("auto");
    expect(types).toContain("mortgage");
  });
});

describe("useLoan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single loan", async () => {
    const mockLoan = {
      id: "loan-1",
      productName: "auto",
      outstandingBalanceCents: 2450000,
      status: "active",
    } as unknown as import("@/types").Loan;
    vi.mocked(gateway.loans.get).mockResolvedValue({ loan: mockLoan });

    const { result } = renderHook(() => useLoan("loan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.loans.get).toHaveBeenCalledWith("loan-1");
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useLoan(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(gateway.loans.get).not.toHaveBeenCalled();
  });

  it("handles not found error", async () => {
    vi.mocked(gateway.loans.get).mockRejectedValue(new Error("Loan not found"));

    const { result } = renderHook(() => useLoan("bad-id"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Loan not found");
  });
});

describe("useLoanSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches loan schedule", async () => {
    vi.mocked(gateway.loans.schedule).mockResolvedValue({
      schedule: [
        {
          id: "s-1",
          loanId: "loan-1",
          installmentNumber: 1,
          dueDate: "2026-04-01",
          principalCents: 36000,
          interestCents: 11500,
          feeCents: 0,
          totalCents: 47500,
          paidCents: 0,
          paidAt: null,
          status: "upcoming" as const,
        },
        {
          id: "s-2",
          loanId: "loan-1",
          installmentNumber: 2,
          dueDate: "2026-05-01",
          principalCents: 36200,
          interestCents: 11300,
          feeCents: 0,
          totalCents: 47500,
          paidCents: 0,
          paidAt: null,
          status: "upcoming" as const,
        },
      ] satisfies import("@/types").LoanScheduleItem[],
    });

    const { result } = renderHook(() => useLoanSchedule("loan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.schedule).toHaveLength(2);
    expect(result.current.data?.schedule[0].totalCents).toBe(47500);
  });

  it("does not fetch when loanId is empty", () => {
    const { result } = renderHook(() => useLoanSchedule(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("passes pagination params", async () => {
    vi.mocked(gateway.loans.schedule).mockResolvedValue({ schedule: [] });

    const { result } = renderHook(() => useLoanSchedule("loan-1", { limit: 12 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.loans.schedule).toHaveBeenCalledWith("loan-1", { limit: 12 });
  });

  it("handles error", async () => {
    vi.mocked(gateway.loans.schedule).mockRejectedValue(new Error("Schedule not available"));

    const { result } = renderHook(() => useLoanSchedule("loan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useLoanPayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches loan payments", async () => {
    vi.mocked(gateway.loans.payments).mockResolvedValue({
      payments: [
        { id: "pmt-1", amountCents: 47500, scheduledDate: "2026-03-01", status: "completed" },
        { id: "pmt-2", amountCents: 47500, scheduledDate: "2026-02-01", status: "completed" },
      ] as unknown as import("@/types").LoanPayment[],
    });

    const { result } = renderHook(() => useLoanPayments("loan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.payments).toHaveLength(2);
  });

  it("does not fetch when loanId is empty", () => {
    const { result } = renderHook(() => useLoanPayments(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles empty payments", async () => {
    vi.mocked(gateway.loans.payments).mockResolvedValue({ payments: [] });

    const { result } = renderHook(() => useLoanPayments("loan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.payments).toHaveLength(0);
  });
});

describe("useMakeLoanPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes a loan payment", async () => {
    vi.mocked(gateway.loans.makePayment).mockResolvedValue({
      payment: { id: "pmt-new", amountCents: 47500, status: "completed" },
    } as never);

    const { result } = renderHook(() => useMakeLoanPayment(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        loanId: "loan-1",
        amountCents: 47500,
        fromAccountId: "acct-1",
      });
    });

    expect(gateway.loans.makePayment).toHaveBeenCalledWith({
      loanId: "loan-1",
      amountCents: 47500,
      fromAccountId: "acct-1",
    });
  });

  it("makes payment with extra principal", async () => {
    vi.mocked(gateway.loans.makePayment).mockResolvedValue({
      payment: { id: "pmt-new", amountCents: 57500 },
    } as never);

    const { result } = renderHook(() => useMakeLoanPayment(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        loanId: "loan-1",
        amountCents: 47500,
        fromAccountId: "acct-1",
        extraPrincipalCents: 10000,
      });
    });

    expect(gateway.loans.makePayment).toHaveBeenCalledWith(
      expect.objectContaining({ extraPrincipalCents: 10000 }),
    );
  });

  it("handles payment error", async () => {
    vi.mocked(gateway.loans.makePayment).mockRejectedValue(new Error("Insufficient funds"));

    const { result } = renderHook(() => useMakeLoanPayment(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          loanId: "loan-1",
          amountCents: 9999999,
          fromAccountId: "acct-1",
        });
      }),
    ).rejects.toThrow("Insufficient funds");
  });

  it("handles network error during payment", async () => {
    vi.mocked(gateway.loans.makePayment).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useMakeLoanPayment(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          loanId: "loan-1",
          amountCents: 47500,
          fromAccountId: "acct-1",
        });
      }),
    ).rejects.toThrow("Network error");
  });
});
