import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    standingInstructions: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  useStandingInstructions,
  useCreateStandingInstruction,
  useUpdateStandingInstruction,
  standingInstructionKeys,
} from "../useStandingInstructions";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("standingInstructionKeys", () => {
  it("has correct all key", () => {
    expect(standingInstructionKeys.all).toEqual(["standingInstructions"]);
  });

  it("has correct list key", () => {
    expect(standingInstructionKeys.list({ status: "active" })).toEqual([
      "standingInstructions",
      "list",
      { status: "active" },
    ]);
  });
});

describe("useStandingInstructions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches standing instructions successfully", async () => {
    const mockData = [
      { id: "si-1", name: "Monthly Savings", amountCents: 50000 },
    ] as unknown as import("@/types").StandingInstruction[];
    vi.mocked(gateway.standingInstructions.list).mockResolvedValue({ instructions: mockData });

    const { result } = renderHook(() => useStandingInstructions({ status: "active" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instructions).toHaveLength(1);
    expect(gateway.standingInstructions.list).toHaveBeenCalledWith({ status: "active" });
  });

  it("handles error", async () => {
    vi.mocked(gateway.standingInstructions.list).mockRejectedValue(new Error("Failed"));

    const { result } = renderHook(() => useStandingInstructions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateStandingInstruction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates standing instruction successfully", async () => {
    vi.mocked(gateway.standingInstructions.create).mockResolvedValue({
      instruction: { id: "si-new" },
    } as never);

    const { result } = renderHook(() => useCreateStandingInstruction(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        fromAccountId: "acct-1",
        toAccountId: "acct-2",
        transferType: "account_transfer" as never,
        amountCents: 10000,
        name: "Weekly Transfer",
        frequency: "weekly" as never,
        startDate: "2026-04-01",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.standingInstructions.create).toHaveBeenCalledTimes(1);
  });
});

describe("useUpdateStandingInstruction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates standing instruction successfully", async () => {
    const mockInstruction = { id: "si-1" } as unknown as import("@/types").StandingInstruction;
    vi.mocked(gateway.standingInstructions.update).mockResolvedValue({
      instruction: mockInstruction,
    });

    const { result } = renderHook(() => useUpdateStandingInstruction(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: "si-1", amountCents: 20000, name: "Updated Transfer" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gateway.standingInstructions.update).toHaveBeenCalledWith("si-1", {
      amountCents: 20000,
      name: "Updated Transfer",
    });
  });
});
