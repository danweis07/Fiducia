import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    beneficiaries: {
      list: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import { useBeneficiaries, beneficiaryKeys } from "../useBeneficiaries";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("beneficiaryKeys", () => {
  it("has correct all key", () => {
    expect(beneficiaryKeys.all).toEqual(["beneficiaries"]);
  });

  it("has correct list key", () => {
    expect(beneficiaryKeys.list()).toEqual(["beneficiaries", "list"]);
  });
});

describe("useBeneficiaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches beneficiaries successfully", async () => {
    const mockData = [
      { id: "ben-1", name: "John Doe", accountNumberMasked: "****1234" },
      { id: "ben-2", name: "Jane Smith", accountNumberMasked: "****5678" },
    ];
    vi.mocked(gateway.beneficiaries.list).mockResolvedValue({ beneficiaries: mockData as never[] });

    const { result } = renderHook(() => useBeneficiaries(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.beneficiaries).toHaveLength(2);
    expect(gateway.beneficiaries.list).toHaveBeenCalledTimes(1);
  });

  it("handles error", async () => {
    vi.mocked(gateway.beneficiaries.list).mockRejectedValue(new Error("Failed"));

    const { result } = renderHook(() => useBeneficiaries(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed");
  });

  it("starts in loading state", () => {
    vi.mocked(gateway.beneficiaries.list).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useBeneficiaries(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});
