import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    directDeposit: {
      employers: vi.fn(),
      status: vi.fn(),
      list: vi.fn(),
      initiate: vi.fn(),
      cancel: vi.fn(),
      confirm: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  directDepositKeys,
  useEmployers,
  useSwitchStatus,
  useInitiateSwitch,
  useCancelSwitch,
  useConfirmSwitch,
} from "../useDirectDeposit";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("directDepositKeys", () => {
  it("has correct keys", () => {
    expect(directDepositKeys.all).toEqual(["direct-deposit"]);
    expect(directDepositKeys.employers()).toEqual(["direct-deposit", "employers", undefined]);
    expect(directDepositKeys.switches()).toEqual(["direct-deposit", "switches", undefined]);
    expect(directDepositKeys.status("s-1")).toEqual(["direct-deposit", "status", "s-1"]);
  });
});

describe("useEmployers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches employers", async () => {
    const data = { employers: [{ id: "e-1", name: "Acme Corp" }] };
    vi.mocked(gateway.directDeposit.employers).mockResolvedValue(data);
    const { result } = renderHook(() => useEmployers(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.employers).toHaveLength(1);
  });

  it("passes search params", async () => {
    vi.mocked(gateway.directDeposit.employers).mockResolvedValue({ employers: [] });
    renderHook(() => useEmployers({ query: "Acme", limit: 10 }), { wrapper: createWrapper() });
    await waitFor(() =>
      expect(gateway.directDeposit.employers).toHaveBeenCalledWith({ query: "Acme", limit: 10 }),
    );
  });
});

describe("useSwitchStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches status for switch", async () => {
    vi.mocked(gateway.directDeposit.status).mockResolvedValue({
      switch: { id: "s-1", status: "completed" },
    });
    const { result } = renderHook(() => useSwitchStatus("s-1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch without switchId", () => {
    const { result } = renderHook(() => useSwitchStatus(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useInitiateSwitch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initiates a switch", async () => {
    vi.mocked(gateway.directDeposit.initiate).mockResolvedValue({ switchId: "s-new" });
    const { result } = renderHook(() => useInitiateSwitch(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({
        accountId: "acct-1",
        employerId: "e-1",
        allocationType: "full" as Record<string, unknown>,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCancelSwitch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels a switch", async () => {
    vi.mocked(gateway.directDeposit.cancel).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useCancelSwitch(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate("s-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useConfirmSwitch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("confirms a switch", async () => {
    vi.mocked(gateway.directDeposit.confirm).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useConfirmSwitch(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ switchId: "s-1", providerConfirmationId: "conf-1" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
