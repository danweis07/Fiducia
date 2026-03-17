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

describe("MessagingDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── messaging ───────────────────────────────────────────────────────────────

  describe("messaging", () => {
    it("listThreads calls messaging.threads.list", async () => {
      const invoke = mockInvoke({ threads: [] });
      await gateway.messaging.listThreads({ status: "open", limit: 20 });
      expect(invoke).toHaveBeenCalledWith("messaging.threads.list", { status: "open", limit: 20 });
    });

    it("getThread calls messaging.threads.get", async () => {
      const invoke = mockInvoke({ thread: {}, messages: [] });
      await gateway.messaging.getThread("t1");
      expect(invoke).toHaveBeenCalledWith("messaging.threads.get", { threadId: "t1" });
    });

    it("createThread calls messaging.threads.create", async () => {
      const invoke = mockInvoke({ thread: {} });
      const params = { subject: "Help", body: "I need help", priority: "normal" as const };
      await gateway.messaging.createThread(params);
      expect(invoke).toHaveBeenCalledWith("messaging.threads.create", params);
    });

    it("reply calls messaging.threads.reply", async () => {
      const invoke = mockInvoke({ message: {} });
      const params = { threadId: "t1", body: "Thanks" };
      await gateway.messaging.reply(params);
      expect(invoke).toHaveBeenCalledWith("messaging.threads.reply", params);
    });

    it("markRead calls messaging.threads.markRead", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.messaging.markRead("t1");
      expect(invoke).toHaveBeenCalledWith("messaging.threads.markRead", { threadId: "t1" });
    });

    it("archive calls messaging.threads.archive", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.messaging.archive("t1");
      expect(invoke).toHaveBeenCalledWith("messaging.threads.archive", { threadId: "t1" });
    });

    it("listDepartments calls messaging.departments.list", async () => {
      const invoke = mockInvoke({ departments: [] });
      await gateway.messaging.listDepartments();
      expect(invoke).toHaveBeenCalledWith("messaging.departments.list", {});
    });

    it("unreadCount calls messaging.unreadCount", async () => {
      const invoke = mockInvoke({ count: 5 });
      await gateway.messaging.unreadCount();
      expect(invoke).toHaveBeenCalledWith("messaging.unreadCount", {});
    });
  });

  // ── disputes ────────────────────────────────────────────────────────────────

  describe("disputes", () => {
    it("file calls disputes.file", async () => {
      const invoke = mockInvoke({ dispute: {} });
      const params = { transactionId: "tx1", reason: "fraud", description: "Unauthorized charge" };
      await gateway.disputes.file(params);
      expect(invoke).toHaveBeenCalledWith("disputes.file", params);
    });

    it("list calls disputes.list", async () => {
      const invoke = mockInvoke({ disputes: [] });
      await gateway.disputes.list({ status: "open" });
      expect(invoke).toHaveBeenCalledWith("disputes.list", { status: "open" });
    });

    it("get calls disputes.get", async () => {
      const invoke = mockInvoke({ dispute: {}, timeline: [], documents: [] });
      await gateway.disputes.get("d1");
      expect(invoke).toHaveBeenCalledWith("disputes.get", { disputeId: "d1" });
    });

    it("addDocument calls disputes.addDocument", async () => {
      const invoke = mockInvoke({ document: {} });
      const params = {
        disputeId: "d1",
        documentType: "receipt",
        description: "Receipt",
        fileName: "receipt.pdf",
      };
      await gateway.disputes.addDocument(params);
      expect(invoke).toHaveBeenCalledWith("disputes.addDocument", params);
    });

    it("cancel calls disputes.cancel", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.disputes.cancel("d1", "resolved");
      expect(invoke).toHaveBeenCalledWith("disputes.cancel", {
        disputeId: "d1",
        reason: "resolved",
      });
    });

    it("timeline calls disputes.timeline", async () => {
      const invoke = mockInvoke({ events: [] });
      await gateway.disputes.timeline("d1");
      expect(invoke).toHaveBeenCalledWith("disputes.timeline", { disputeId: "d1" });
    });
  });

  // ── vault ───────────────────────────────────────────────────────────────────

  describe("vault", () => {
    it("list calls vault.documents.list", async () => {
      const invoke = mockInvoke({ documents: [] });
      await gateway.vault.list({ category: "tax" as unknown });
      expect(invoke).toHaveBeenCalledWith("vault.documents.list", { category: "tax" });
    });

    it("upload calls vault.documents.upload", async () => {
      const invoke = mockInvoke({ document: {}, uploadUrl: "https://upload.url" });
      const params = { name: "W2", category: "tax" as unknown };
      await gateway.vault.upload(params);
      expect(invoke).toHaveBeenCalledWith("vault.documents.upload", params);
    });

    it("get calls vault.documents.get", async () => {
      const invoke = mockInvoke({ document: {} });
      await gateway.vault.get("doc1");
      expect(invoke).toHaveBeenCalledWith("vault.documents.get", { documentId: "doc1" });
    });

    it("update calls vault.documents.update", async () => {
      const invoke = mockInvoke({ document: {} });
      const params = { documentId: "doc1", name: "W2 2024" };
      await gateway.vault.update(params);
      expect(invoke).toHaveBeenCalledWith("vault.documents.update", params);
    });

    it("delete calls vault.documents.delete", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.vault.delete("doc1");
      expect(invoke).toHaveBeenCalledWith("vault.documents.delete", { documentId: "doc1" });
    });

    it("summary calls vault.summary", async () => {
      const invoke = mockInvoke({ summary: {} });
      await gateway.vault.summary();
      expect(invoke).toHaveBeenCalledWith("vault.summary", {});
    });

    it("search calls vault.documents.search", async () => {
      const invoke = mockInvoke({ documents: [] });
      const params = { query: "tax", tags: ["2024"] };
      await gateway.vault.search(params);
      expect(invoke).toHaveBeenCalledWith("vault.documents.search", params);
    });
  });

  // ── travelNotices ───────────────────────────────────────────────────────────

  describe("travelNotices", () => {
    it("create calls cardServices.travelNotice.create", async () => {
      const invoke = mockInvoke({ notice: {} });
      const params = {
        cardId: "c1",
        destinations: [{ country: "FR" }],
        startDate: "2025-06-01",
        endDate: "2025-06-15",
      };
      await gateway.travelNotices.create(params);
      expect(invoke).toHaveBeenCalledWith("cardServices.travelNotice.create", params);
    });

    it("list calls cardServices.travelNotice.list", async () => {
      const invoke = mockInvoke({ notices: [] });
      await gateway.travelNotices.list({ filter: "active" });
      expect(invoke).toHaveBeenCalledWith("cardServices.travelNotice.list", { filter: "active" });
    });

    it("cancel calls cardServices.travelNotice.cancel", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.travelNotices.cancel("n1");
      expect(invoke).toHaveBeenCalledWith("cardServices.travelNotice.cancel", { noticeId: "n1" });
    });
  });

  // ── jointAccounts ───────────────────────────────────────────────────────────

  describe("jointAccounts", () => {
    it("listOwners calls jointAccounts.owners.list", async () => {
      const invoke = mockInvoke({ owners: [] });
      await gateway.jointAccounts.listOwners("acc1", { limit: 10 });
      expect(invoke).toHaveBeenCalledWith("jointAccounts.owners.list", {
        accountId: "acc1",
        limit: 10,
      });
    });

    it("addOwner calls jointAccounts.owners.add", async () => {
      const invoke = mockInvoke({ invitation: {} });
      const params = {
        accountId: "acc1",
        email: "a@b.com",
        firstName: "Jane",
        lastName: "Doe",
        relationship: "spouse" as unknown,
        permissions: "full" as unknown,
      };
      await gateway.jointAccounts.addOwner(params);
      expect(invoke).toHaveBeenCalledWith("jointAccounts.owners.add", params);
    });

    it("removeOwner calls jointAccounts.owners.remove", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.jointAccounts.removeOwner("acc1", "o1");
      expect(invoke).toHaveBeenCalledWith("jointAccounts.owners.remove", {
        accountId: "acc1",
        ownerId: "o1",
      });
    });

    it("updatePermissions calls jointAccounts.owners.updatePermissions", async () => {
      const invoke = mockInvoke({ owner: {} });
      await gateway.jointAccounts.updatePermissions("acc1", "o1", "readOnly" as unknown);
      expect(invoke).toHaveBeenCalledWith("jointAccounts.owners.updatePermissions", {
        accountId: "acc1",
        ownerId: "o1",
        permissions: "readOnly",
      });
    });

    it("listInvitations calls jointAccounts.invitations.list", async () => {
      const invoke = mockInvoke({ invitations: [] });
      await gateway.jointAccounts.listInvitations({ limit: 5 });
      expect(invoke).toHaveBeenCalledWith("jointAccounts.invitations.list", { limit: 5 });
    });

    it("acceptInvitation calls jointAccounts.invitations.accept", async () => {
      const invoke = mockInvoke({ success: true, invitationId: "inv1" });
      await gateway.jointAccounts.acceptInvitation("inv1");
      expect(invoke).toHaveBeenCalledWith("jointAccounts.invitations.accept", {
        invitationId: "inv1",
      });
    });

    it("declineInvitation calls jointAccounts.invitations.decline", async () => {
      const invoke = mockInvoke({ success: true, invitationId: "inv1" });
      await gateway.jointAccounts.declineInvitation("inv1");
      expect(invoke).toHaveBeenCalledWith("jointAccounts.invitations.decline", {
        invitationId: "inv1",
      });
    });

    it("summary calls jointAccounts.summary", async () => {
      const invoke = mockInvoke({
        summary: {
          primaryAccountCount: 1,
          jointAccountCount: 2,
          totalAccountCount: 3,
          pendingInvitationCount: 0,
        },
      });
      await gateway.jointAccounts.summary();
      expect(invoke).toHaveBeenCalledWith("jointAccounts.summary", {});
    });
  });
});
