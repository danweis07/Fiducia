import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    accountOpening: {
      config: vi.fn().mockResolvedValue({
        products: [
          {
            id: "prod-checking",
            type: "checking",
            name: "Free Checking",
            apyBps: 10,
            minOpeningDepositCents: 2500,
            monthlyFeeCents: 0,
            isAvailable: true,
          },
          {
            id: "prod-savings",
            type: "savings",
            name: "High-Yield Savings",
            apyBps: 425,
            minOpeningDepositCents: 10000,
            monthlyFeeCents: 0,
            isAvailable: true,
          },
        ],
        allowedFundingMethods: ["ach_transfer", "debit_card"],
        minimumAge: 18,
        maxApplicationsPerDay: 5,
        applicationExpiryHours: 72,
        allowJointApplications: false,
        requiredDisclosures: ["Privacy Policy", "Account Agreement"],
      }),
      create: vi.fn().mockResolvedValue({
        id: "app-001",
        tenantId: "tenant-1",
        status: "kyc_approved",
        applicant: {
          firstNameInitial: "J",
          lastNameMasked: "D***",
          emailMasked: "j***e@example.com",
          ssnMasked: "***-**-1234",
        },
        selectedProducts: [],
        createdAt: "2026-03-14T10:00:00Z",
        updatedAt: "2026-03-14T10:00:00Z",
        expiresAt: "2026-03-17T10:00:00Z",
      }),
      get: vi.fn().mockResolvedValue({
        id: "app-001",
        status: "kyc_approved",
      }),
      selectProducts: vi.fn().mockResolvedValue({
        id: "app-001",
        status: "products_selected",
      }),
      submitFunding: vi.fn().mockResolvedValue({
        id: "app-001",
        status: "funded",
      }),
      complete: vi.fn().mockResolvedValue({
        id: "app-001",
        status: "completed",
        createdAccounts: [
          { accountId: "acct-new", accountNumberMasked: "****9876", type: "checking" },
        ],
      }),
      cancel: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

import {
  useAccountOpeningConfig,
  useGetApplication,
  useCreateApplication,
  useSelectProducts,
  useCompleteApplication,
  useCancelApplication,
} from "../useAccountOpening";
import { gateway } from "@/lib/gateway";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useAccountOpeningConfig", () => {
  it("should fetch available products", async () => {
    const { result } = renderHook(() => useAccountOpeningConfig(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.products).toHaveLength(2);
    expect(result.current.data?.products[0].type).toBe("checking");
  });
});

describe("useGetApplication", () => {
  it("should fetch application by ID", async () => {
    const { result } = renderHook(() => useGetApplication("app-001"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("app-001");
  });

  it("should not fetch when ID is undefined", () => {
    const { result } = renderHook(() => useGetApplication(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useCreateApplication", () => {
  it("should create application", async () => {
    const { result } = renderHook(() => useCreateApplication(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ firstName: "John", lastName: "Doe" });
    });
    expect(gateway.accountOpening.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "John" }),
    );
  });
});

describe("useSelectProducts", () => {
  it("should select products for application", async () => {
    const { result } = renderHook(() => useSelectProducts(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ applicationId: "app-001", productIds: ["prod-checking"] });
    });
    expect(gateway.accountOpening.selectProducts).toHaveBeenCalledWith("app-001", [
      "prod-checking",
    ]);
  });
});

describe("useCompleteApplication", () => {
  it("should complete application", async () => {
    const { result } = renderHook(() => useCompleteApplication(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync("app-001");
    });
    expect(gateway.accountOpening.complete).toHaveBeenCalledWith("app-001");
  });
});

describe("useCancelApplication", () => {
  it("should cancel application", async () => {
    const { result } = renderHook(() => useCancelApplication(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync("app-001");
    });
    expect(gateway.accountOpening.cancel).toHaveBeenCalledWith("app-001");
  });
});
