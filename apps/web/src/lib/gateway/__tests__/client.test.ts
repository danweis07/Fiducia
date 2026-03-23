import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/demo", () => ({
  isDemoMode: vi.fn(() => false),
}));

const mockInvoke = vi.fn();
vi.mock("@/lib/backend", () => ({
  getBackend: vi.fn(() => ({
    gateway: { invoke: mockInvoke },
  })),
}));

import { callGateway, GatewayApiError, resetCircuitBreakers } from "../client";
import { isDemoMode } from "@/lib/demo";

describe("callGateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCircuitBreakers();
    (isDemoMode as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it("returns data on success", async () => {
    mockInvoke.mockResolvedValue({
      data: { accounts: [{ id: "a-1" }] },
    });

    const result = await callGateway<{ accounts: { id: string }[] }>("accounts.list");
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0].id).toBe("a-1");
  });

  it("throws GatewayApiError on error response", async () => {
    mockInvoke.mockResolvedValue({
      error: { code: "NOT_FOUND", message: "Account not found" },
    });

    await expect(callGateway("accounts.get", { id: "bad" })).rejects.toThrow(GatewayApiError);
  });

  it("attaches pagination metadata", async () => {
    mockInvoke.mockResolvedValue({
      data: { transactions: [] },
      meta: { pagination: { total: 100, limit: 20, offset: 0, hasMore: true } },
    });

    const result = await callGateway<Record<string, unknown>>("transactions.list");
    expect(result._pagination).toEqual({
      total: 100,
      limit: 20,
      offset: 0,
      hasMore: true,
    });
  });

  it("records failure for circuit breaker on error", async () => {
    mockInvoke.mockResolvedValue({
      error: { code: "INTERNAL", message: "Server error" },
    });

    // 5 failures (default threshold) should open the circuit
    for (let i = 0; i < 5; i++) {
      try {
        await callGateway("accounts.list");
      } catch {
        // expected
      }
    }

    // 6th call should be rejected by circuit breaker
    await expect(callGateway("accounts.list")).rejects.toThrow(/Circuit breaker/);
  });

  it("records success for circuit breaker on success", async () => {
    mockInvoke.mockResolvedValue({ data: {} });
    await callGateway("accounts.list");
    // Should not throw (circuit stays closed)
    await callGateway("accounts.list");
  });

  it("uses demo data in demo mode", async () => {
    (isDemoMode as ReturnType<typeof vi.fn>).mockReturnValue(true);

    // callGateway will dynamically import demo-data, which won't exist in test
    // but we can verify it doesn't call the real backend
    try {
      await callGateway("accounts.list");
    } catch {
      // Expected — demo-data module may not resolve in test
    }
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe("GatewayApiError", () => {
  it("has correct properties", () => {
    const err = new GatewayApiError({ code: "NOT_FOUND", message: "Not found" }, 404);
    expect(err.name).toBe("GatewayApiError");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
  });

  it("is instance of Error", () => {
    const err = new GatewayApiError({ code: "ERR", message: "msg" });
    expect(err).toBeInstanceOf(Error);
  });
});
