import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/backend", () => ({
  getBackend: vi.fn().mockReturnValue({
    gateway: { invoke: vi.fn() },
  }),
}));
vi.mock("@/lib/demo", () => ({
  isDemoMode: vi.fn().mockReturnValue(false),
}));

import { gateway } from "../../gateway";
import { getBackend } from "@/lib/backend";

function mockInvoke(data: unknown) {
  const backend = getBackend();
  vi.mocked(backend.gateway.invoke).mockResolvedValue({ data, error: undefined, meta: {} });
  return vi.mocked(backend.gateway.invoke);
}

describe("DepositsDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── rdc ─────────────────────────────────────────────────────────────────────

  describe("rdc", () => {
    it("deposit calls rdc.deposit", async () => {
      const invoke = mockInvoke({ deposit: {} });
      const input = {
        accountId: "a1",
        amountCents: 50000,
        frontImageBase64: "front",
        backImageBase64: "back",
      };
      await gateway.rdc.deposit(input);
      expect(invoke).toHaveBeenCalledWith("rdc.deposit", input);
    });

    it("status calls rdc.status", async () => {
      const invoke = mockInvoke({ deposit: {} });
      await gateway.rdc.status("dep1");
      expect(invoke).toHaveBeenCalledWith("rdc.status", { id: "dep1" });
    });

    it("history calls rdc.history", async () => {
      const invoke = mockInvoke({ deposits: [] });
      await gateway.rdc.history({ accountId: "a1", limit: 10 });
      expect(invoke).toHaveBeenCalledWith("rdc.history", { accountId: "a1", limit: 10 });
    });
  });

  // ── statements ──────────────────────────────────────────────────────────────

  describe("statements", () => {
    it("list calls statements.list", async () => {
      const invoke = mockInvoke({ statements: [] });
      await gateway.statements.list({ accountId: "a1", limit: 12 });
      expect(invoke).toHaveBeenCalledWith("statements.list", { accountId: "a1", limit: 12 });
    });

    it("get calls statements.get", async () => {
      const invoke = mockInvoke({ statement: {} });
      await gateway.statements.get("s1");
      expect(invoke).toHaveBeenCalledWith("statements.get", { id: "s1" });
    });

    it("config calls statements.config", async () => {
      const invoke = mockInvoke({ config: {} });
      await gateway.statements.config();
      expect(invoke).toHaveBeenCalledWith("statements.config", {});
    });

    it("download calls statements.download", async () => {
      const invoke = mockInvoke({ downloadUrl: "https://download.url", expiresAt: "" });
      await gateway.statements.download("s1");
      expect(invoke).toHaveBeenCalledWith("statements.download", { id: "s1" });
    });
  });

  // ── checks ──────────────────────────────────────────────────────────────────

  describe("checks", () => {
    it("styles calls checks.styles", async () => {
      const invoke = mockInvoke({ styles: [] });
      await gateway.checks.styles({ category: "personal" });
      expect(invoke).toHaveBeenCalledWith("checks.styles", { category: "personal" });
    });

    it("config calls checks.config", async () => {
      const invoke = mockInvoke({ quantities: [], shippingOptions: [], pricingTiers: [] });
      await gateway.checks.config();
      expect(invoke).toHaveBeenCalledWith("checks.config", {});
    });

    it("createOrder calls checks.order.create", async () => {
      const invoke = mockInvoke({ order: {} });
      const params = {
        accountId: "a1",
        styleId: "s1",
        quantity: 100,
        shippingMethod: "standard" as const,
      };
      await gateway.checks.createOrder(params);
      expect(invoke).toHaveBeenCalledWith("checks.order.create", params);
    });

    it("listOrders calls checks.orders.list", async () => {
      const invoke = mockInvoke({ orders: [] });
      await gateway.checks.listOrders({ status: "shipped" as never });
      expect(invoke).toHaveBeenCalledWith("checks.orders.list", { status: "shipped" });
    });

    it("getOrder calls checks.order.get", async () => {
      const invoke = mockInvoke({ order: {} });
      await gateway.checks.getOrder("o1");
      expect(invoke).toHaveBeenCalledWith("checks.order.get", { orderId: "o1" });
    });

    it("cancelOrder calls checks.order.cancel", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.checks.cancelOrder("o1");
      expect(invoke).toHaveBeenCalledWith("checks.order.cancel", { orderId: "o1" });
    });
  });

  // ── directDeposit ───────────────────────────────────────────────────────────

  describe("directDeposit", () => {
    it("employers calls directDeposit.employers", async () => {
      const invoke = mockInvoke({ employers: [] });
      await gateway.directDeposit.employers({ query: "Acme" });
      expect(invoke).toHaveBeenCalledWith("directDeposit.employers", { query: "Acme" });
    });

    it("initiate calls directDeposit.initiate", async () => {
      const invoke = mockInvoke({ switch: {}, widgetUrl: "", linkToken: "" });
      const params = { accountId: "a1", employerId: "emp1", allocationType: "full" as never };
      await gateway.directDeposit.initiate(params);
      expect(invoke).toHaveBeenCalledWith("directDeposit.initiate", params);
    });

    it("status calls directDeposit.status", async () => {
      const invoke = mockInvoke({ switch: {} });
      await gateway.directDeposit.status("sw1");
      expect(invoke).toHaveBeenCalledWith("directDeposit.status", { switchId: "sw1" });
    });

    it("list calls directDeposit.list", async () => {
      const invoke = mockInvoke({ switches: [] });
      await gateway.directDeposit.list({ limit: 10 });
      expect(invoke).toHaveBeenCalledWith("directDeposit.list", { limit: 10 });
    });

    it("cancel calls directDeposit.cancel", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.directDeposit.cancel("sw1");
      expect(invoke).toHaveBeenCalledWith("directDeposit.cancel", { switchId: "sw1" });
    });

    it("confirm calls directDeposit.confirm", async () => {
      const invoke = mockInvoke({ switch: {} });
      await gateway.directDeposit.confirm("sw1", "conf123");
      expect(invoke).toHaveBeenCalledWith("directDeposit.confirm", {
        switchId: "sw1",
        providerConfirmationId: "conf123",
      });
    });
  });
});
