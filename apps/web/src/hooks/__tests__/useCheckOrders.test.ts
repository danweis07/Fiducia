import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/gateway", () => ({
  gateway: {
    checks: {
      styles: vi.fn(),
      config: vi.fn(),
      listOrders: vi.fn(),
      getOrder: vi.fn(),
      createOrder: vi.fn(),
      cancelOrder: vi.fn(),
    },
  },
}));

import { gateway } from "@/lib/gateway";
import {
  checkOrderKeys,
  useCheckStyles,
  useCheckOrderConfig,
  useCheckOrders,
  useCheckOrder,
  useCreateCheckOrder,
  useCancelCheckOrder,
} from "../useCheckOrders";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("checkOrderKeys", () => {
  it("has correct keys", () => {
    expect(checkOrderKeys.all).toEqual(["check-orders"]);
    expect(checkOrderKeys.config()).toEqual(["check-orders", "config"]);
    expect(checkOrderKeys.order("ord-1")).toEqual(["check-orders", "order", "ord-1"]);
  });
});

describe("useCheckStyles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches check styles", async () => {
    vi.mocked(gateway.checks.styles).mockResolvedValue({
      styles: [
        {
          id: "s-1",
          name: "Classic",
          description: "Classic check style",
          imageUrl: "/classic.png",
          category: "standard" as const,
          pricePerBoxCents: 2000,
          isAvailable: true,
        },
      ],
    });
    const { result } = renderHook(() => useCheckStyles(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCheckOrderConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches config", async () => {
    vi.mocked(gateway.checks.config).mockResolvedValue({
      quantities: [50, 100, 200],
      shippingOptions: [{ method: "standard", label: "Standard", costCents: 0 }],
      pricingTiers: [{ quantity: 50, boxCount: 1 }],
    });
    const { result } = renderHook(() => useCheckOrderConfig(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCheckOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches order history", async () => {
    vi.mocked(gateway.checks.listOrders).mockResolvedValue({ orders: [] });
    const { result } = renderHook(() => useCheckOrders(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCheckOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches single order", async () => {
    vi.mocked(gateway.checks.getOrder).mockResolvedValue({
      order: { id: "ord-1", status: "shipped" },
    } as never);
    const { result } = renderHook(() => useCheckOrder("ord-1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("does not fetch without orderId", () => {
    const { result } = renderHook(() => useCheckOrder(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useCreateCheckOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an order", async () => {
    vi.mocked(gateway.checks.createOrder).mockResolvedValue({ order: { id: "ord-new" } } as never);
    const { result } = renderHook(() => useCreateCheckOrder(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({
        accountId: "acct-1",
        styleId: "s-1",
        quantity: 100,
        shippingMethod: "standard",
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCancelCheckOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancels an order", async () => {
    vi.mocked(gateway.checks.cancelOrder).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useCancelCheckOrder(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate("ord-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
