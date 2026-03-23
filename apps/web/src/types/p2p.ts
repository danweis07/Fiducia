/**
 * P2P Transfer Types (Zelle)
 *
 * P2P enrollment, transactions, and limits.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// P2P TRANSFERS (ZELLE)
// =============================================================================

export type P2PTransactionType = "send" | "receive" | "request";
export type P2PTransactionStatus = "pending" | "completed" | "failed" | "cancelled" | "expired";

export interface P2PEnrollment {
  id: string;
  accountId: string;
  accountMasked: string;
  enrollmentType: "email" | "phone";
  enrollmentValue: string;
  isActive: boolean;
  enrolledAt: string;
}

export interface P2PTransaction {
  id: string;
  type: P2PTransactionType;
  senderName: string;
  recipientName: string;
  recipientType: "email" | "phone" | "token";
  recipientValue: string;
  amountCents: number;
  memo: string | null;
  status: P2PTransactionStatus;
  completedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface P2PLimits {
  dailySendLimitCents: number;
  monthlySendLimitCents: number;
  perTransactionLimitCents: number;
  usedTodayCents: number;
  usedThisMonthCents: number;
}
