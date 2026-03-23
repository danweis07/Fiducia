import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    loanProducts: { list: vi.fn() },
    loanOrigination: {
      getApplication: vi.fn(),
      createApplication: vi.fn(),
      createDocument: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useLoanProducts,
  useGetLoanApplication,
  useCreateLoanApplication,
  useUploadLoanDocument,
  loanOriginationKeys,
} from "../useLoanOrigination";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("loanOriginationKeys", () => {
  it("has correct all key", () => {
    expect(loanOriginationKeys.all).toEqual(["loan-origination"]);
  });

  it("has correct products key", () => {
    expect(loanOriginationKeys.products()).toEqual(["loan-origination", "products"]);
  });

  it("has correct application key", () => {
    expect(loanOriginationKeys.application("app-1")).toEqual([
      "loan-origination",
      "application",
      "app-1",
    ]);
  });
});

describe("useLoanProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches loan products successfully", async () => {
    vi.mocked(gateway.loanProducts.list).mockResolvedValue({
      products: [{ id: "p1", name: "Auto Loan" }],
    });

    const { result } = renderHook(() => useLoanProducts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.products).toHaveLength(1);
  });

  it("handles error", async () => {
    vi.mocked(gateway.loanProducts.list).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useLoanProducts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useGetLoanApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches application by id", async () => {
    vi.mocked(gateway.loanOrigination.getApplication).mockResolvedValue({
      applicationId: "app-1",
      status: "submitted",
    });

    const { result } = renderHook(() => useGetLoanApplication("app-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch when id is undefined", () => {
    const { result } = renderHook(() => useGetLoanApplication(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error", async () => {
    vi.mocked(gateway.loanOrigination.getApplication).mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useGetLoanApplication("app-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateLoanApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useCreateLoanApplication(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});

describe("useUploadLoanDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides mutate function", () => {
    const { result } = renderHook(() => useUploadLoanDocument(), { wrapper: createWrapper() });
    expect(result.current.mutate).toBeDefined();
  });
});
