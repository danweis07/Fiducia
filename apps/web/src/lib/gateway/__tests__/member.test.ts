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

describe("MemberDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── auth ────────────────────────────────────────────────────────────────────

  describe("auth", () => {
    it("profile calls auth.profile", async () => {
      const invoke = mockInvoke({ user: {} });
      await gateway.auth.profile();
      expect(invoke).toHaveBeenCalledWith("auth.profile", {});
    });

    it("updateProfile calls auth.updateProfile", async () => {
      const invoke = mockInvoke({ user: {} });
      const updates = { firstName: "Jane", lastName: "Doe" };
      await gateway.auth.updateProfile(updates);
      expect(invoke).toHaveBeenCalledWith("auth.updateProfile", updates);
    });
  });

  // ── member ──────────────────────────────────────────────────────────────────

  describe("member", () => {
    it("addresses calls member.addresses", async () => {
      const invoke = mockInvoke({ addresses: [] });
      await gateway.member.addresses();
      expect(invoke).toHaveBeenCalledWith("member.addresses", {});
    });

    it("updateAddress calls member.updateAddress", async () => {
      const invoke = mockInvoke({ address: {} });
      const updates = { line1: "123 Main St", city: "Anytown" };
      await gateway.member.updateAddress("addr1", updates);
      expect(invoke).toHaveBeenCalledWith("member.updateAddress", { id: "addr1", ...updates });
    });

    it("documents calls member.documents", async () => {
      const invoke = mockInvoke({ documents: [] });
      await gateway.member.documents();
      expect(invoke).toHaveBeenCalledWith("member.documents", {});
    });

    it("identifiers calls member.identifiers", async () => {
      const invoke = mockInvoke({ identifiers: [] });
      await gateway.member.identifiers();
      expect(invoke).toHaveBeenCalledWith("member.identifiers", {});
    });
  });

  // ── sessions ────────────────────────────────────────────────────────────────

  describe("sessions", () => {
    it("list calls sessions.list", async () => {
      const invoke = mockInvoke({ sessions: [] });
      await gateway.sessions.list();
      expect(invoke).toHaveBeenCalledWith("sessions.list", {});
    });

    it("revoke calls sessions.revoke", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.sessions.revoke("sess1");
      expect(invoke).toHaveBeenCalledWith("sessions.revoke", { sessionId: "sess1" });
    });

    it("revokeAll calls sessions.revokeAll", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.sessions.revokeAll("current-sess");
      expect(invoke).toHaveBeenCalledWith("sessions.revokeAll", {
        excludeCurrent: true,
        currentSessionId: "current-sess",
      });
    });

    it("activity calls sessions.activity", async () => {
      const invoke = mockInvoke({ activeSessions: 2, sessions: [] });
      await gateway.sessions.activity();
      expect(invoke).toHaveBeenCalledWith("sessions.activity", {});
    });
  });

  // ── devices ─────────────────────────────────────────────────────────────────

  describe("devices", () => {
    it("list calls devices.list", async () => {
      const invoke = mockInvoke({ devices: [] });
      await gateway.devices.list();
      expect(invoke).toHaveBeenCalledWith("devices.list", {});
    });

    it("get calls devices.get", async () => {
      const invoke = mockInvoke({ device: {} });
      await gateway.devices.get("dev1");
      expect(invoke).toHaveBeenCalledWith("devices.get", { deviceId: "dev1" });
    });

    it("rename calls devices.rename", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.devices.rename("dev1", "My Phone");
      expect(invoke).toHaveBeenCalledWith("devices.rename", { deviceId: "dev1", name: "My Phone" });
    });

    it("remove calls devices.remove", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.devices.remove("dev1");
      expect(invoke).toHaveBeenCalledWith("devices.remove", { deviceId: "dev1" });
    });

    it("activity calls devices.activity", async () => {
      const invoke = mockInvoke({ activity: [] });
      await gateway.devices.activity("dev1", { limit: 20 });
      expect(invoke).toHaveBeenCalledWith("devices.activity", { deviceId: "dev1", limit: 20 });
    });

    it("trust calls devices.trust", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.devices.trust("dev1");
      expect(invoke).toHaveBeenCalledWith("devices.trust", { deviceId: "dev1" });
    });

    it("untrust calls devices.untrust", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.devices.untrust("dev1");
      expect(invoke).toHaveBeenCalledWith("devices.untrust", { deviceId: "dev1" });
    });
  });

  // ── notifications ───────────────────────────────────────────────────────────

  describe("notifications", () => {
    it("list calls notifications.list", async () => {
      const invoke = mockInvoke({ notifications: [] });
      await gateway.notifications.list({ unreadOnly: true, limit: 20 });
      expect(invoke).toHaveBeenCalledWith("notifications.list", { unreadOnly: true, limit: 20 });
    });

    it("markRead calls notifications.markRead", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.notifications.markRead("n1");
      expect(invoke).toHaveBeenCalledWith("notifications.markRead", { id: "n1" });
    });

    it("markAllRead calls notifications.markAllRead", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.notifications.markAllRead();
      expect(invoke).toHaveBeenCalledWith("notifications.markAllRead", {});
    });

    it("unreadCount calls notifications.unreadCount", async () => {
      const invoke = mockInvoke({ count: 3 });
      await gateway.notifications.unreadCount();
      expect(invoke).toHaveBeenCalledWith("notifications.unreadCount", {});
    });
  });

  // ── notificationPreferences ─────────────────────────────────────────────────

  describe("notificationPreferences", () => {
    it("get calls notifications.preferences.get", async () => {
      const invoke = mockInvoke({ preferences: { channels: {}, categories: {} } });
      await gateway.notificationPreferences.get();
      expect(invoke).toHaveBeenCalledWith("notifications.preferences.get", {});
    });

    it("update calls notifications.preferences.update", async () => {
      const invoke = mockInvoke({ preferences: { channels: {}, categories: {} } });
      const params = { channels: { email: true, push: false } };
      await gateway.notificationPreferences.update(params);
      expect(invoke).toHaveBeenCalledWith("notifications.preferences.update", params);
    });

    it("test calls notifications.test", async () => {
      const invoke = mockInvoke({ sent: true, channel: "email", message: "Test sent" });
      await gateway.notificationPreferences.test("email");
      expect(invoke).toHaveBeenCalledWith("notifications.test", { channel: "email" });
    });
  });
});
