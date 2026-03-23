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

describe("BusinessDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── invoiceProcessor ────────────────────────────────────────────────────────

  describe("invoiceProcessor", () => {
    it("analyze calls invoices.analyze", async () => {
      const invoke = mockInvoke({ invoice: {}, matchedPayees: [] });
      const params = { fileBase64: "abc", fileName: "inv.pdf", mimeType: "application/pdf" };
      await gateway.invoiceProcessor.analyze(params);
      expect(invoke).toHaveBeenCalledWith("invoices.analyze", params);
    });

    it("confirm calls invoices.confirm", async () => {
      const invoke = mockInvoke({ invoice: {} });
      const params = { invoiceId: "i1", accountId: "a1", scheduledDate: "2025-03-01" };
      await gateway.invoiceProcessor.confirm(params);
      expect(invoke).toHaveBeenCalledWith("invoices.confirm", params);
    });

    it("list calls invoices.list", async () => {
      const invoke = mockInvoke({ invoices: [] });
      await gateway.invoiceProcessor.list({ status: "pending" });
      expect(invoke).toHaveBeenCalledWith("invoices.list", { status: "pending" });
    });

    it("get calls invoices.get", async () => {
      const invoke = mockInvoke({ invoice: {} });
      await gateway.invoiceProcessor.get("i1");
      expect(invoke).toHaveBeenCalledWith("invoices.get", { invoiceId: "i1" });
    });

    it("cancel calls invoices.cancel", async () => {
      const invoke = mockInvoke({ invoice: {} });
      await gateway.invoiceProcessor.cancel("i1");
      expect(invoke).toHaveBeenCalledWith("invoices.cancel", { invoiceId: "i1" });
    });
  });

  // ── cashSweeps ──────────────────────────────────────────────────────────────

  describe("cashSweeps", () => {
    it("listRules calls sweeps.rules.list", async () => {
      const invoke = mockInvoke({ rules: [] });
      await gateway.cashSweeps.listRules({ status: "active" });
      expect(invoke).toHaveBeenCalledWith("sweeps.rules.list", { status: "active" });
    });

    it("createRule calls sweeps.rules.create", async () => {
      const invoke = mockInvoke({ rule: {} });
      const params = {
        name: "Sweep",
        sourceAccountId: "a1",
        destinationAccountId: "a2",
        thresholdCents: 100000,
        direction: "sweep_out" as const,
        frequency: "daily" as const,
      };
      await gateway.cashSweeps.createRule(params);
      expect(invoke).toHaveBeenCalledWith("sweeps.rules.create", params);
    });

    it("updateRule calls sweeps.rules.update", async () => {
      const invoke = mockInvoke({ rule: {} });
      const params = { ruleId: "r1", thresholdCents: 50000 };
      await gateway.cashSweeps.updateRule(params);
      expect(invoke).toHaveBeenCalledWith("sweeps.rules.update", params);
    });

    it("deleteRule calls sweeps.rules.delete", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.cashSweeps.deleteRule("r1");
      expect(invoke).toHaveBeenCalledWith("sweeps.rules.delete", { ruleId: "r1" });
    });

    it("toggleRule calls sweeps.rules.toggle", async () => {
      const invoke = mockInvoke({ rule: {} });
      await gateway.cashSweeps.toggleRule("r1", "paused");
      expect(invoke).toHaveBeenCalledWith("sweeps.rules.toggle", {
        ruleId: "r1",
        status: "paused",
      });
    });

    it("listExecutions calls sweeps.executions.list", async () => {
      const invoke = mockInvoke({ executions: [] });
      await gateway.cashSweeps.listExecutions({ ruleId: "r1" });
      expect(invoke).toHaveBeenCalledWith("sweeps.executions.list", { ruleId: "r1" });
    });

    it("getSummary calls sweeps.summary", async () => {
      const invoke = mockInvoke({ summary: {} });
      await gateway.cashSweeps.getSummary();
      expect(invoke).toHaveBeenCalledWith("sweeps.summary", {});
    });
  });

  // ── approvals ───────────────────────────────────────────────────────────────

  describe("approvals", () => {
    it("listRequests calls approvals.requests.list", async () => {
      const invoke = mockInvoke({ requests: [] });
      await gateway.approvals.listRequests({ status: "pending" });
      expect(invoke).toHaveBeenCalledWith("approvals.requests.list", { status: "pending" });
    });

    it("getRequest calls approvals.requests.get", async () => {
      const invoke = mockInvoke({ request: {} });
      await gateway.approvals.getRequest("req1");
      expect(invoke).toHaveBeenCalledWith("approvals.requests.get", { requestId: "req1" });
    });

    it("approve calls approvals.requests.approve", async () => {
      const invoke = mockInvoke({ request: {} });
      await gateway.approvals.approve({ requestId: "req1", mfaToken: "tok" });
      expect(invoke).toHaveBeenCalledWith("approvals.requests.approve", {
        requestId: "req1",
        mfaToken: "tok",
      });
    });

    it("deny calls approvals.requests.deny", async () => {
      const invoke = mockInvoke({ request: {} });
      await gateway.approvals.deny({ requestId: "req1", reason: "nope" });
      expect(invoke).toHaveBeenCalledWith("approvals.requests.deny", {
        requestId: "req1",
        reason: "nope",
      });
    });

    it("cancel calls approvals.requests.cancel", async () => {
      const invoke = mockInvoke({ request: {} });
      await gateway.approvals.cancel("req1");
      expect(invoke).toHaveBeenCalledWith("approvals.requests.cancel", { requestId: "req1" });
    });

    it("listPolicies calls approvals.policies.list", async () => {
      const invoke = mockInvoke({ policies: [] });
      await gateway.approvals.listPolicies();
      expect(invoke).toHaveBeenCalledWith("approvals.policies.list", {});
    });

    it("createPolicy calls approvals.policies.create", async () => {
      const invoke = mockInvoke({ policy: {} });
      const params = {
        name: "High Value",
        actionType: "transfer",
        thresholdCents: 500000,
        approverRoles: ["admin"],
        autoExpireMinutes: 60,
        notifyChannels: ["email"],
      };
      await gateway.approvals.createPolicy(params);
      expect(invoke).toHaveBeenCalledWith("approvals.policies.create", params);
    });

    it("updatePolicy calls approvals.policies.update", async () => {
      const invoke = mockInvoke({ policy: {} });
      const params = { policyId: "pol1", thresholdCents: 100000 };
      await gateway.approvals.updatePolicy(params);
      expect(invoke).toHaveBeenCalledWith("approvals.policies.update", params);
    });

    it("deletePolicy calls approvals.policies.delete", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.approvals.deletePolicy("pol1");
      expect(invoke).toHaveBeenCalledWith("approvals.policies.delete", { policyId: "pol1" });
    });

    it("getSummary calls approvals.summary", async () => {
      const invoke = mockInvoke({ summary: {} });
      await gateway.approvals.getSummary();
      expect(invoke).toHaveBeenCalledWith("approvals.summary", {});
    });
  });

  // ── treasury ────────────────────────────────────────────────────────────────

  describe("treasury", () => {
    it("listVaults calls treasury.vaults.list", async () => {
      const invoke = mockInvoke({ vaults: [] });
      await gateway.treasury.listVaults();
      expect(invoke).toHaveBeenCalledWith("treasury.vaults.list", {});
    });

    it("createVault calls treasury.vaults.create", async () => {
      const invoke = mockInvoke({ vault: {} });
      const params = { name: "Reserve", linkedAccountId: "a1", providerName: "sweep" };
      await gateway.treasury.createVault(params);
      expect(invoke).toHaveBeenCalledWith("treasury.vaults.create", params);
    });

    it("closeVault calls treasury.vaults.close", async () => {
      const invoke = mockInvoke({ vault: {} });
      await gateway.treasury.closeVault("v1");
      expect(invoke).toHaveBeenCalledWith("treasury.vaults.close", { vaultId: "v1" });
    });

    it("getSummary calls treasury.summary", async () => {
      const invoke = mockInvoke({ summary: {} });
      await gateway.treasury.getSummary();
      expect(invoke).toHaveBeenCalledWith("treasury.summary", {});
    });
  });

  // ── aggregator ──────────────────────────────────────────────────────────────

  describe("aggregator", () => {
    it("searchInstitutions calls aggregator.institutions.search", async () => {
      const invoke = mockInvoke({ institutions: [], totalCount: 0 });
      await gateway.aggregator.searchInstitutions({ query: "Chase" });
      expect(invoke).toHaveBeenCalledWith("aggregator.institutions.search", { query: "Chase" });
    });

    it("createConnection calls aggregator.connections.create", async () => {
      const invoke = mockInvoke({
        connectionId: "c1",
        connectUrl: "https://connect",
        expiresAt: "",
      });
      const params = { institutionId: "inst1", redirectUrl: "https://redirect" };
      await gateway.aggregator.createConnection(params);
      expect(invoke).toHaveBeenCalledWith("aggregator.connections.create", params);
    });

    it("handleCallback calls aggregator.connections.callback", async () => {
      const invoke = mockInvoke({
        connectionId: "c1",
        status: "active",
        institutionName: "Chase",
        accountCount: 3,
      });
      const params = { connectionId: "c1", callbackParams: { code: "abc" } };
      await gateway.aggregator.handleCallback(params);
      expect(invoke).toHaveBeenCalledWith("aggregator.connections.callback", params);
    });

    it("listConnections calls aggregator.connections.list", async () => {
      const invoke = mockInvoke({ connections: [] });
      await gateway.aggregator.listConnections();
      expect(invoke).toHaveBeenCalledWith("aggregator.connections.list", {});
    });

    it("refreshConnection calls aggregator.connections.refresh", async () => {
      const invoke = mockInvoke({ connectionId: "c1", status: "active", lastSyncedAt: "" });
      await gateway.aggregator.refreshConnection("c1");
      expect(invoke).toHaveBeenCalledWith("aggregator.connections.refresh", { connectionId: "c1" });
    });

    it("removeConnection calls aggregator.connections.remove", async () => {
      const invoke = mockInvoke({ connectionId: "c1", removed: true });
      await gateway.aggregator.removeConnection("c1");
      expect(invoke).toHaveBeenCalledWith("aggregator.connections.remove", { connectionId: "c1" });
    });

    it("listAccounts calls aggregator.accounts.list", async () => {
      const invoke = mockInvoke({ accounts: [] });
      await gateway.aggregator.listAccounts("c1");
      expect(invoke).toHaveBeenCalledWith("aggregator.accounts.list", { connectionId: "c1" });
    });

    it("listTransactions calls aggregator.transactions.list", async () => {
      const invoke = mockInvoke({ transactions: [], totalCount: 0, hasMore: false });
      const params = { accountId: "a1", fromDate: "2025-01-01", limit: 50 };
      await gateway.aggregator.listTransactions(params);
      expect(invoke).toHaveBeenCalledWith("aggregator.transactions.list", params);
    });
  });
});
