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

describe("IntegrationsDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── externalAccounts ────────────────────────────────────────────────────────

  describe("externalAccounts", () => {
    it("linkToken calls external-accounts.link-token", async () => {
      const invoke = mockInvoke({ linkToken: "lt-123", expiration: "" });
      await gateway.externalAccounts.linkToken({ clientName: "MyApp" });
      expect(invoke).toHaveBeenCalledWith("external-accounts.link-token", { clientName: "MyApp" });
    });

    it("exchange calls external-accounts.exchange", async () => {
      const invoke = mockInvoke({ itemId: "item1", linkedAt: "" });
      await gateway.externalAccounts.exchange("public-tok");
      expect(invoke).toHaveBeenCalledWith("external-accounts.exchange", {
        publicToken: "public-tok",
      });
    });

    it("list calls external-accounts.list", async () => {
      const invoke = mockInvoke({ accounts: [] });
      await gateway.externalAccounts.list();
      expect(invoke).toHaveBeenCalledWith("external-accounts.list", {});
    });

    it("balances calls external-accounts.balances", async () => {
      const invoke = mockInvoke({ balances: [] });
      await gateway.externalAccounts.balances("acc1");
      expect(invoke).toHaveBeenCalledWith("external-accounts.balances", { accountId: "acc1" });
    });

    it("transactions calls external-accounts.transactions", async () => {
      const invoke = mockInvoke({ transactions: [], nextCursor: "", hasMore: false });
      await gateway.externalAccounts.transactions({ accountId: "acc1", count: 25 });
      expect(invoke).toHaveBeenCalledWith("external-accounts.transactions", {
        accountId: "acc1",
        count: 25,
      });
    });
  });

  // ── locations ───────────────────────────────────────────────────────────────

  describe("locations", () => {
    it("search calls locations.search", async () => {
      const invoke = mockInvoke({ locations: [] });
      const params = { latitude: 40.7128, longitude: -74.006, radiusMiles: 10 };
      await gateway.locations.search(params);
      expect(invoke).toHaveBeenCalledWith("locations.search", params);
    });
  });

  // ── config ──────────────────────────────────────────────────────────────────

  describe("config", () => {
    it("capabilities calls config.capabilities", async () => {
      const invoke = mockInvoke({ capabilities: {} });
      await gateway.config.capabilities();
      expect(invoke).toHaveBeenCalledWith("config.capabilities", {});
    });

    it("theme calls config.theme", async () => {
      const invoke = mockInvoke({ theme: {} });
      await gateway.config.theme();
      expect(invoke).toHaveBeenCalledWith("config.theme", {});
    });
  });

  // ── passwordPolicy ──────────────────────────────────────────────────────────

  describe("passwordPolicy", () => {
    it("get calls passwordPolicy.get", async () => {
      const invoke = mockInvoke({ policy: {} });
      await gateway.passwordPolicy.get();
      expect(invoke).toHaveBeenCalledWith("passwordPolicy.get", {});
    });

    it("update calls passwordPolicy.update", async () => {
      const invoke = mockInvoke({ policy: {} });
      const updates = { passwordMinLength: 12, requireUppercase: true };
      await gateway.passwordPolicy.update(updates);
      expect(invoke).toHaveBeenCalledWith("passwordPolicy.update", updates);
    });
  });

  // ── accountProducts ─────────────────────────────────────────────────────────

  describe("accountProducts", () => {
    it("list calls accountProducts.list", async () => {
      const invoke = mockInvoke({ products: [] });
      await gateway.accountProducts.list({ type: "savings" });
      expect(invoke).toHaveBeenCalledWith("accountProducts.list", { type: "savings" });
    });

    it("get calls accountProducts.get", async () => {
      const invoke = mockInvoke({ product: {} });
      await gateway.accountProducts.get("prod1");
      expect(invoke).toHaveBeenCalledWith("accountProducts.get", { id: "prod1" });
    });
  });

  // ── cd ──────────────────────────────────────────────────────────────────────

  describe("cd", () => {
    it("maturity calls cd.maturity", async () => {
      const invoke = mockInvoke({ maturity: {} });
      await gateway.cd.maturity("a1");
      expect(invoke).toHaveBeenCalledWith("cd.maturity", { accountId: "a1" });
    });

    it("updateMaturityAction calls cd.updateMaturityAction", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.cd.updateMaturityAction("a1", "renew", "a2");
      expect(invoke).toHaveBeenCalledWith("cd.updateMaturityAction", {
        accountId: "a1",
        maturityAction: "renew",
        maturityTransferAccountId: "a2",
      });
    });
  });

  // ── charges ─────────────────────────────────────────────────────────────────

  describe("charges", () => {
    it("definitions calls charges.definitions", async () => {
      const invoke = mockInvoke({ chargeDefinitions: [] });
      await gateway.charges.definitions({ appliesTo: "checking" });
      expect(invoke).toHaveBeenCalledWith("charges.definitions", { appliesTo: "checking" });
    });

    it("list calls charges.list", async () => {
      const invoke = mockInvoke({ charges: [] });
      await gateway.charges.list({ accountId: "a1", status: "pending" });
      expect(invoke).toHaveBeenCalledWith("charges.list", { accountId: "a1", status: "pending" });
    });
  });

  // ── standingInstructions ────────────────────────────────────────────────────

  describe("standingInstructions", () => {
    it("list calls standingInstructions.list", async () => {
      const invoke = mockInvoke({ instructions: [] });
      await gateway.standingInstructions.list({ status: "active" });
      expect(invoke).toHaveBeenCalledWith("standingInstructions.list", { status: "active" });
    });

    it("create calls standingInstructions.create", async () => {
      const invoke = mockInvoke({ instruction: {} });
      const input = {
        fromAccountId: "a1",
        toAccountId: "a2",
        transferType: "internal",
        amountCents: 10000,
        name: "Monthly savings",
        frequency: "monthly",
        startDate: "2025-04-01",
      };
      await gateway.standingInstructions.create(input);
      expect(invoke).toHaveBeenCalledWith("standingInstructions.create", input);
    });

    it("update calls standingInstructions.update", async () => {
      const invoke = mockInvoke({ instruction: {} });
      await gateway.standingInstructions.update("si1", { amountCents: 20000, name: "Updated" });
      expect(invoke).toHaveBeenCalledWith("standingInstructions.update", {
        id: "si1",
        amountCents: 20000,
        name: "Updated",
      });
    });
  });

  // ── accountOpening ──────────────────────────────────────────────────────────

  describe("accountOpening", () => {
    it("config calls account-opening.config", async () => {
      const invoke = mockInvoke({ products: [], allowedFundingMethods: [], minimumAge: 18 });
      await gateway.accountOpening.config();
      expect(invoke).toHaveBeenCalledWith("account-opening.config", {});
    });

    it("create calls account-opening.create", async () => {
      const invoke = mockInvoke({ id: "app1", status: "created" });
      const applicant = { firstName: "Jane", lastName: "Doe", email: "jane@example.com" };
      await gateway.accountOpening.create(applicant);
      expect(invoke).toHaveBeenCalledWith("account-opening.create", applicant);
    });

    it("get calls account-opening.get", async () => {
      const invoke = mockInvoke({ id: "app1", status: "pending" });
      await gateway.accountOpening.get("app1");
      expect(invoke).toHaveBeenCalledWith("account-opening.get", { applicationId: "app1" });
    });

    it("selectProducts calls account-opening.selectProducts", async () => {
      const invoke = mockInvoke({ id: "app1", status: "products_selected", selectedProducts: [] });
      await gateway.accountOpening.selectProducts("app1", ["prod1", "prod2"]);
      expect(invoke).toHaveBeenCalledWith("account-opening.selectProducts", {
        applicationId: "app1",
        productIds: ["prod1", "prod2"],
      });
    });

    it("submitFunding calls account-opening.submitFunding", async () => {
      const invoke = mockInvoke({ id: "app1", status: "funding_submitted" });
      const funding = { method: "transfer", amountCents: 50000 };
      await gateway.accountOpening.submitFunding("app1", funding);
      expect(invoke).toHaveBeenCalledWith("account-opening.submitFunding", {
        applicationId: "app1",
        ...funding,
      });
    });

    it("complete calls account-opening.complete", async () => {
      const invoke = mockInvoke({ id: "app1", status: "completed", createdAccounts: [] });
      await gateway.accountOpening.complete("app1");
      expect(invoke).toHaveBeenCalledWith("account-opening.complete", { applicationId: "app1" });
    });

    it("cancel calls account-opening.cancel", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.accountOpening.cancel("app1");
      expect(invoke).toHaveBeenCalledWith("account-opening.cancel", { applicationId: "app1" });
    });
  });
});
