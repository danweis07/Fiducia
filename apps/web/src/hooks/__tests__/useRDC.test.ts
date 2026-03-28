import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    rdc: {
      deposit: vi.fn(),
      status: vi.fn(),
      history: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/useAccounts", () => ({
  accountKeys: { all: ["accounts"] as const },
}));

vi.mock("@/hooks/useTransactions", () => ({
  transactionKeys: { all: ["transactions"] as const },
}));

import { useSubmitDeposit, useDepositStatus, useDepositHistory, rdcKeys } from "../useRDC";
import { gateway } from "@/lib/gateway";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("rdcKeys", () => {
  it("has correct all key", () => {
    expect(rdcKeys.all).toEqual(["rdc"]);
  });

  it("has correct status key", () => {
    expect(rdcKeys.status("dep-1")).toEqual(["rdc", "status", "dep-1"]);
  });

  it("has correct history key", () => {
    expect(rdcKeys.history({ accountId: "a1" })).toEqual(["rdc", "history", { accountId: "a1" }]);
  });
});

describe("useSubmitDeposit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits a deposit", async () => {
    vi.mocked(gateway.rdc.deposit).mockResolvedValue({
      deposit: {
        id: "dep-1",
        status: "reviewing",
        amountCents: 50000,
        accountId: "acct-1",
      } as never,
    });

    const { result } = renderHook(() => useSubmitDeposit(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        accountId: "acct-1",
        amountCents: 50000,
        frontImageBase64: "base64front",
        backImageBase64: "base64back",
        checkNumber: "1001",
      });
    });

    expect(gateway.rdc.deposit).toHaveBeenCalledWith({
      accountId: "acct-1",
      amountCents: 50000,
      frontImageBase64: "base64front",
      backImageBase64: "base64back",
      checkNumber: "1001",
    });
  });

  it("submits deposit without check number", async () => {
    vi.mocked(gateway.rdc.deposit).mockResolvedValue({
      deposit: { id: "dep-2", status: "reviewing" } as never,
    });

    const { result } = renderHook(() => useSubmitDeposit(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        accountId: "acct-1",
        amountCents: 25000,
        frontImageBase64: "img1",
        backImageBase64: "img2",
      });
    });

    expect(gateway.rdc.deposit).toHaveBeenCalledWith(
      expect.not.objectContaining({ checkNumber: expect.anything() }),
    );
  });

  it("handles submission failure", async () => {
    vi.mocked(gateway.rdc.deposit).mockRejectedValue(new Error("Image quality too low"));

    const { result } = renderHook(() => useSubmitDeposit(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          accountId: "acct-1",
          amountCents: 50000,
          frontImageBase64: "blurry",
          backImageBase64: "blurry",
        });
      }),
    ).rejects.toThrow("Image quality too low");
  });

  it("handles duplicate check rejection", async () => {
    vi.mocked(gateway.rdc.deposit).mockRejectedValue(new Error("Duplicate check detected"));

    const { result } = renderHook(() => useSubmitDeposit(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          accountId: "acct-1",
          amountCents: 50000,
          frontImageBase64: "img",
          backImageBase64: "img",
          checkNumber: "1001",
        });
      }),
    ).rejects.toThrow("Duplicate check detected");
  });

  it("handles amount limit exceeded", async () => {
    vi.mocked(gateway.rdc.deposit).mockRejectedValue(new Error("Deposit exceeds daily limit"));

    const { result } = renderHook(() => useSubmitDeposit(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          accountId: "acct-1",
          amountCents: 10000000,
          frontImageBase64: "img",
          backImageBase64: "img",
        });
      }),
    ).rejects.toThrow("Deposit exceeds daily limit");
  });
});

describe("useDepositStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches deposit status", async () => {
    vi.mocked(gateway.rdc.status).mockResolvedValue({
      deposit: { id: "dep-1", status: "accepted", amountCents: 50000 } as never,
    });

    const { result } = renderHook(() => useDepositStatus("dep-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.deposit.status).toBe("approved");
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useDepositStatus(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(gateway.rdc.status).not.toHaveBeenCalled();
  });

  it("returns processing status", async () => {
    vi.mocked(gateway.rdc.status).mockResolvedValue({
      deposit: { id: "dep-2", status: "reviewing" } as never,
    });

    const { result } = renderHook(() => useDepositStatus("dep-2"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.deposit.status).toBe("processing");
  });

  it("returns rejected status", async () => {
    vi.mocked(gateway.rdc.status).mockResolvedValue({
      deposit: { id: "dep-3", status: "rejected" } as never,
    });

    const { result } = renderHook(() => useDepositStatus("dep-3"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.deposit.status).toBe("rejected");
  });

  it("handles error", async () => {
    vi.mocked(gateway.rdc.status).mockRejectedValue(new Error("Deposit not found"));

    const { result } = renderHook(() => useDepositStatus("bad-id"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useDepositHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches deposit history", async () => {
    vi.mocked(gateway.rdc.history).mockResolvedValue({
      deposits: [
        { id: "dep-1", status: "accepted", amountCents: 50000, createdAt: "2026-03-10" } as never,
        { id: "dep-2", status: "rejected", amountCents: 25000, createdAt: "2026-03-08" } as never,
      ],
    });

    const { result } = renderHook(() => useDepositHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.deposits).toHaveLength(2);
  });

  it("filters by account", async () => {
    vi.mocked(gateway.rdc.history).mockResolvedValue({ deposits: [] });

    const { result } = renderHook(() => useDepositHistory({ accountId: "acct-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.rdc.history).toHaveBeenCalledWith({ accountId: "acct-1" });
  });

  it("passes limit param", async () => {
    vi.mocked(gateway.rdc.history).mockResolvedValue({ deposits: [] });

    const { result } = renderHook(() => useDepositHistory({ limit: 5 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.rdc.history).toHaveBeenCalledWith({ limit: 5 });
  });

  it("handles empty history", async () => {
    vi.mocked(gateway.rdc.history).mockResolvedValue({ deposits: [] });

    const { result } = renderHook(() => useDepositHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.deposits).toHaveLength(0);
  });

  it("handles error", async () => {
    vi.mocked(gateway.rdc.history).mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useDepositHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
