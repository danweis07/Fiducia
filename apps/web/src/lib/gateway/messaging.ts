/**
 * Gateway Domain — Messaging, Disputes, Vault, Travel Notices, Joint Accounts
 */

import type { CallGatewayFn, Pagination } from "./client";
import type {
  MessageThread,
  Message,
  MessageDepartment,
  Dispute,
  DisputeTimelineEvent,
  DisputeDocument,
  VaultDocument,
  VaultDocumentCategory,
  VaultSummary,
  TravelNotice,
  JointAccountOwner,
  JointAccountInvitation,
  JointOwnerPermission,
  JointOwnerRelationship,
} from "@/types";

export function createMessagingDomain(callGateway: CallGatewayFn) {
  return {
    messaging: {
      async listThreads(params: { limit?: number; offset?: number; status?: string } = {}) {
        return callGateway<{ threads: MessageThread[]; _pagination?: Pagination }>(
          "messaging.threads.list",
          params,
        );
      },
      async getThread(threadId: string) {
        return callGateway<{ thread: MessageThread; messages: Message[] }>(
          "messaging.threads.get",
          { threadId },
        );
      },
      async createThread(params: {
        subject: string;
        body: string;
        departmentId?: string;
        priority?: "normal" | "urgent";
      }) {
        return callGateway<{ thread: MessageThread }>("messaging.threads.create", params);
      },
      async reply(params: { threadId: string; body: string; attachmentIds?: string[] }) {
        return callGateway<{ message: Message }>("messaging.threads.reply", params);
      },
      async markRead(threadId: string) {
        return callGateway<{ success: boolean }>("messaging.threads.markRead", { threadId });
      },
      async archive(threadId: string) {
        return callGateway<{ success: boolean }>("messaging.threads.archive", { threadId });
      },
      async listDepartments() {
        return callGateway<{ departments: MessageDepartment[] }>("messaging.departments.list", {});
      },
      async unreadCount() {
        return callGateway<{ count: number }>("messaging.unreadCount", {});
      },
    },

    disputes: {
      async file(params: {
        transactionId: string;
        reason: string;
        description: string;
        contactPhone?: string;
        contactEmail?: string;
      }) {
        return callGateway<{ dispute: Dispute }>("disputes.file", params);
      },

      async list(params: { status?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ disputes: Dispute[]; _pagination?: Pagination }>(
          "disputes.list",
          params,
        );
      },

      async get(disputeId: string) {
        return callGateway<{
          dispute: Dispute;
          timeline: DisputeTimelineEvent[];
          documents: DisputeDocument[];
        }>("disputes.get", { disputeId });
      },

      async addDocument(params: {
        disputeId: string;
        documentType: string;
        description: string;
        fileName: string;
      }) {
        return callGateway<{ document: DisputeDocument }>("disputes.addDocument", params);
      },

      async cancel(disputeId: string, reason: string) {
        return callGateway<{ success: boolean }>("disputes.cancel", { disputeId, reason });
      },

      async timeline(disputeId: string) {
        return callGateway<{ events: DisputeTimelineEvent[] }>("disputes.timeline", { disputeId });
      },
    },

    vault: {
      async list(
        params: { limit?: number; offset?: number; category?: VaultDocumentCategory } = {},
      ) {
        return callGateway<{ documents: VaultDocument[] }>("vault.documents.list", params);
      },
      async upload(params: {
        name: string;
        category: VaultDocumentCategory;
        description?: string;
        tags?: string[];
        mimeType?: string;
        fileSizeBytes?: number;
      }) {
        return callGateway<{ document: VaultDocument; uploadUrl: string | null }>(
          "vault.documents.upload",
          params,
        );
      },
      async get(documentId: string) {
        return callGateway<{ document: VaultDocument }>("vault.documents.get", { documentId });
      },
      async update(params: {
        documentId: string;
        name?: string;
        category?: VaultDocumentCategory;
        description?: string;
        tags?: string[];
      }) {
        return callGateway<{ document: VaultDocument }>("vault.documents.update", params);
      },
      async delete(documentId: string) {
        return callGateway<{ success: boolean }>("vault.documents.delete", { documentId });
      },
      async summary() {
        return callGateway<{ summary: VaultSummary }>("vault.summary", {});
      },
      async search(params: { query?: string; category?: VaultDocumentCategory; tags?: string[] }) {
        return callGateway<{ documents: VaultDocument[] }>("vault.documents.search", params);
      },
    },

    travelNotices: {
      async create(params: {
        cardId: string;
        destinations: { country: string; region?: string }[];
        startDate: string;
        endDate: string;
        contactPhone?: string;
      }) {
        return callGateway<{ notice: TravelNotice }>("cardServices.travelNotice.create", params);
      },
      async list(params: { filter?: "active" | "expired"; limit?: number; offset?: number } = {}) {
        return callGateway<{ notices: TravelNotice[] }>("cardServices.travelNotice.list", params);
      },
      async cancel(noticeId: string) {
        return callGateway<{ success: boolean }>("cardServices.travelNotice.cancel", { noticeId });
      },
    },

    jointAccounts: {
      async listOwners(accountId: string, params: { limit?: number; offset?: number } = {}) {
        return callGateway<{ owners: JointAccountOwner[]; _pagination?: Pagination }>(
          "jointAccounts.owners.list",
          { accountId, ...params },
        );
      },
      async addOwner(params: {
        accountId: string;
        email: string;
        firstName: string;
        lastName: string;
        relationship: JointOwnerRelationship;
        permissions: JointOwnerPermission;
      }) {
        return callGateway<{ invitation: JointAccountInvitation }>(
          "jointAccounts.owners.add",
          params,
        );
      },
      async removeOwner(accountId: string, ownerId: string) {
        return callGateway<{ success: boolean }>("jointAccounts.owners.remove", {
          accountId,
          ownerId,
        });
      },
      async updatePermissions(
        accountId: string,
        ownerId: string,
        permissions: JointOwnerPermission,
      ) {
        return callGateway<{ owner: JointAccountOwner }>("jointAccounts.owners.updatePermissions", {
          accountId,
          ownerId,
          permissions,
        });
      },
      async listInvitations(params: { limit?: number; offset?: number } = {}) {
        return callGateway<{
          invitations: (JointAccountInvitation & { direction: "sent" | "received" })[];
          _pagination?: Pagination;
        }>("jointAccounts.invitations.list", params);
      },
      async acceptInvitation(invitationId: string) {
        return callGateway<{ success: boolean; invitationId: string }>(
          "jointAccounts.invitations.accept",
          { invitationId },
        );
      },
      async declineInvitation(invitationId: string) {
        return callGateway<{ success: boolean; invitationId: string }>(
          "jointAccounts.invitations.decline",
          { invitationId },
        );
      },
      async summary() {
        return callGateway<{
          summary: {
            primaryAccountCount: number;
            jointAccountCount: number;
            totalAccountCount: number;
            pendingInvitationCount: number;
          };
        }>("jointAccounts.summary", {});
      },
    },
  };
}
