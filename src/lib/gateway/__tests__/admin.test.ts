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

describe("AdminDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── adminUsers ──

  describe("adminUsers", () => {
    it("list calls admin.users.list", async () => {
      const invoke = mockInvoke({ users: [] });
      await gateway.adminUsers.list({ status: "active", limit: 10 });
      expect(invoke).toHaveBeenCalledWith("admin.users.list", { status: "active", limit: 10 });
    });
  });

  // ── adminAccounts ──

  describe("adminAccounts", () => {
    it("list calls admin.accounts.list", async () => {
      const invoke = mockInvoke({ accounts: [] });
      await gateway.adminAccounts.list({ type: "checking" });
      expect(invoke).toHaveBeenCalledWith("admin.accounts.list", { type: "checking" });
    });

    it("aggregates calls admin.accounts.aggregates", async () => {
      const invoke = mockInvoke({ aggregates: {} });
      await gateway.adminAccounts.aggregates();
      expect(invoke).toHaveBeenCalledWith("admin.accounts.aggregates", {});
    });
  });

  // ── adminIntegrations ──

  describe("adminIntegrations", () => {
    it("list calls admin.integrations.list", async () => {
      const invoke = mockInvoke({ integrations: [] });
      await gateway.adminIntegrations.list();
      expect(invoke).toHaveBeenCalledWith("admin.integrations.list", {});
    });
  });

  // ── adminAudit ──

  describe("adminAudit", () => {
    it("log calls admin.audit.log", async () => {
      const invoke = mockInvoke({ entries: [] });
      await gateway.adminAudit.log({ action: "login", limit: 5 });
      expect(invoke).toHaveBeenCalledWith("admin.audit.log", { action: "login", limit: 5 });
    });
  });

  // ── adminUserActions ──

  describe("adminUserActions", () => {
    it("suspend calls admin.users.suspend", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.adminUserActions.suspend("u1");
      expect(invoke).toHaveBeenCalledWith("admin.users.suspend", { userId: "u1" });
    });

    it("activate calls admin.users.activate", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.adminUserActions.activate("u2");
      expect(invoke).toHaveBeenCalledWith("admin.users.activate", { userId: "u2" });
    });

    it("resetPassword calls admin.users.resetPassword", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.adminUserActions.resetPassword("u3");
      expect(invoke).toHaveBeenCalledWith("admin.users.resetPassword", { userId: "u3" });
    });

    it("invite calls admin.users.invite", async () => {
      const invoke = mockInvoke({
        invitation: {
          id: "inv1",
          email: "a@b.com",
          role: "admin",
          token: "t",
          expiresAt: "2026-01-01",
        },
      });
      await gateway.adminUserActions.invite({ email: "a@b.com", role: "admin" });
      expect(invoke).toHaveBeenCalledWith("admin.users.invite", {
        email: "a@b.com",
        role: "admin",
      });
    });
  });

  // ── adminBranding ──

  describe("adminBranding", () => {
    it("update calls admin.branding.update", async () => {
      const invoke = mockInvoke({ branding: {} });
      await gateway.adminBranding.update({ primaryColor: "#000" });
      expect(invoke).toHaveBeenCalledWith("admin.branding.update", { primaryColor: "#000" });
    });
  });

  // ── adminCDP ──

  describe("adminCDP", () => {
    it("getConfig calls admin.cdp.config.get", async () => {
      const invoke = mockInvoke({ config: {} });
      await gateway.adminCDP.getConfig();
      expect(invoke).toHaveBeenCalledWith("admin.cdp.config.get", {});
    });

    it("updateConfig calls admin.cdp.config.update", async () => {
      const invoke = mockInvoke({ config: {} });
      await gateway.adminCDP.updateConfig({ enabled: true });
      expect(invoke).toHaveBeenCalledWith("admin.cdp.config.update", { enabled: true });
    });

    it("listDestinations calls admin.cdp.destinations.list", async () => {
      const invoke = mockInvoke({ destinations: [] });
      await gateway.adminCDP.listDestinations();
      expect(invoke).toHaveBeenCalledWith("admin.cdp.destinations.list", {});
    });

    it("createDestination calls admin.cdp.destinations.create", async () => {
      const invoke = mockInvoke({ destination: {} });
      const params = { name: "GA", type: "analytics", category: "web" };
      await gateway.adminCDP.createDestination(params);
      expect(invoke).toHaveBeenCalledWith("admin.cdp.destinations.create", params);
    });

    it("updateDestination calls admin.cdp.destinations.update", async () => {
      const invoke = mockInvoke({ destination: {} });
      await gateway.adminCDP.updateDestination({ id: "d1", enabled: false });
      expect(invoke).toHaveBeenCalledWith("admin.cdp.destinations.update", {
        id: "d1",
        enabled: false,
      });
    });

    it("deleteDestination calls admin.cdp.destinations.delete", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.adminCDP.deleteDestination("d1");
      expect(invoke).toHaveBeenCalledWith("admin.cdp.destinations.delete", { id: "d1" });
    });

    it("listRecentEvents calls admin.cdp.events.recent", async () => {
      const invoke = mockInvoke({ events: [] });
      await gateway.adminCDP.listRecentEvents({ limit: 20 });
      expect(invoke).toHaveBeenCalledWith("admin.cdp.events.recent", { limit: 20 });
    });

    it("getEventSummary calls admin.cdp.events.summary", async () => {
      const invoke = mockInvoke({ summary: {} });
      await gateway.adminCDP.getEventSummary("7d");
      expect(invoke).toHaveBeenCalledWith("admin.cdp.events.summary", { range: "7d" });
    });
  });

  // ── sso ──

  describe("sso", () => {
    it("list calls sso.providers.list", async () => {
      const invoke = mockInvoke({ providers: [] });
      await gateway.sso.list();
      expect(invoke).toHaveBeenCalledWith("sso.providers.list", {});
    });

    it("get calls sso.providers.get", async () => {
      const invoke = mockInvoke({ provider: {} });
      await gateway.sso.get("p1");
      expect(invoke).toHaveBeenCalledWith("sso.providers.get", { id: "p1" });
    });

    it("create calls sso.providers.create", async () => {
      const invoke = mockInvoke({ provider: {} });
      const config = { type: "saml", metadataUrl: "https://example.com" };
      await gateway.sso.create(config);
      expect(invoke).toHaveBeenCalledWith("sso.providers.create", config);
    });

    it("update calls sso.providers.update", async () => {
      const invoke = mockInvoke({ provider: {} });
      await gateway.sso.update("p1", { name: "Updated" });
      expect(invoke).toHaveBeenCalledWith("sso.providers.update", { id: "p1", name: "Updated" });
    });

    it("delete calls sso.providers.delete", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.sso.delete("p1");
      expect(invoke).toHaveBeenCalledWith("sso.providers.delete", { id: "p1" });
    });

    it("test calls sso.providers.test", async () => {
      const invoke = mockInvoke({ status: "ok" });
      await gateway.sso.test("p1", "saml");
      expect(invoke).toHaveBeenCalledWith("sso.providers.test", { id: "p1", providerType: "saml" });
    });
  });

  // ── adminAutonomous.serviceAccounts ──

  describe("adminAutonomous.serviceAccounts", () => {
    it("list calls admin.autonomous.serviceAccounts.list", async () => {
      const invoke = mockInvoke({ serviceAccounts: [], total: 0 });
      await gateway.adminAutonomous.serviceAccounts.list({ status: "active" });
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.serviceAccounts.list", {
        status: "active",
      });
    });

    it("create calls admin.autonomous.serviceAccounts.create", async () => {
      const invoke = mockInvoke({ serviceAccount: {}, warning: "" });
      const params = { name: "Bot", allowedActions: ["read"] };
      await gateway.adminAutonomous.serviceAccounts.create(params);
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.serviceAccounts.create", params);
    });

    it("update calls admin.autonomous.serviceAccounts.update", async () => {
      const invoke = mockInvoke({ serviceAccount: {} });
      await gateway.adminAutonomous.serviceAccounts.update("sa1", { status: "disabled" });
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.serviceAccounts.update", {
        accountId: "sa1",
        status: "disabled",
      });
    });

    it("revoke calls admin.autonomous.serviceAccounts.revoke", async () => {
      const invoke = mockInvoke({ revoked: true });
      await gateway.adminAutonomous.serviceAccounts.revoke("sa1");
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.serviceAccounts.revoke", {
        accountId: "sa1",
      });
    });
  });

  // ── adminAutonomous.policies ──

  describe("adminAutonomous.policies", () => {
    it("list calls admin.autonomous.policies.list", async () => {
      const invoke = mockInvoke({ policies: [] });
      await gateway.adminAutonomous.policies.list();
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.policies.list", {});
    });

    it("upsert calls admin.autonomous.policies.upsert", async () => {
      const invoke = mockInvoke({ policy: {} });
      const params = { action: "transfer", approval: "auto" };
      await gateway.adminAutonomous.policies.upsert(params);
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.policies.upsert", params);
    });

    it("delete calls admin.autonomous.policies.delete", async () => {
      const invoke = mockInvoke({ deleted: true });
      await gateway.adminAutonomous.policies.delete("pol1");
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.policies.delete", { policyId: "pol1" });
    });
  });

  // ── adminAutonomous.executions ──

  describe("adminAutonomous.executions", () => {
    it("list calls admin.autonomous.executions.list", async () => {
      const invoke = mockInvoke({ executions: [], total: 0 });
      await gateway.adminAutonomous.executions.list({ status: "pending" });
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.executions.list", {
        status: "pending",
      });
    });

    it("approve calls admin.autonomous.executions.approve", async () => {
      const invoke = mockInvoke({ execution: {} });
      await gateway.adminAutonomous.executions.approve("ex1");
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.executions.approve", {
        executionId: "ex1",
      });
    });

    it("reject calls admin.autonomous.executions.reject", async () => {
      const invoke = mockInvoke({ rejected: true });
      await gateway.adminAutonomous.executions.reject("ex1", "bad");
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.executions.reject", {
        executionId: "ex1",
        reason: "bad",
      });
    });
  });

  // ── adminAutonomous top-level ──

  describe("adminAutonomous", () => {
    it("stats calls admin.autonomous.stats", async () => {
      const invoke = mockInvoke({ autonomousEnabled: true });
      await gateway.adminAutonomous.stats();
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.stats", {});
    });

    it("events.list calls admin.autonomous.events.list", async () => {
      const invoke = mockInvoke({ events: [], total: 0 });
      await gateway.adminAutonomous.events.list({ source: "webhook" });
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.events.list", { source: "webhook" });
    });

    it("toggle calls admin.autonomous.toggle", async () => {
      const invoke = mockInvoke({ autonomousEnabled: false });
      await gateway.adminAutonomous.toggle(false);
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.toggle", { enabled: false });
    });

    it("trigger calls admin.autonomous.trigger", async () => {
      const invoke = mockInvoke({
        totalEventsProcessed: 5,
        totalRulesMatched: 2,
        totalActionsExecuted: 1,
        totalErrors: 0,
      });
      await gateway.adminAutonomous.trigger(10);
      expect(invoke).toHaveBeenCalledWith("admin.autonomous.trigger", { batchSize: 10 });
    });
  });
});
