/**
 * Audit Log Types
 *
 * Audit trail entities for compliance and security.
 */

// =============================================================================
// AUDIT LOG
// =============================================================================

export type AuditAction =
  | "account.view"
  | "account.create"
  | "transaction.view"
  | "transfer.create"
  | "transfer.approve"
  | "transfer.cancel"
  | "bill.create"
  | "bill.pay"
  | "bill.cancel"
  | "card.lock"
  | "card.unlock"
  | "card.set_limit"
  | "rdc.submit"
  | "rdc.approve"
  | "rdc.reject"
  | "user.login"
  | "user.logout"
  | "user.mfa_verify"
  | "settings.update"
  | "profile.update"
  | "beneficiary.create"
  | "beneficiary.delete";

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
