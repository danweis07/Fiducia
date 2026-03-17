/**
 * Transaction Dispute Types (Reg E)
 *
 * Dispute entities, timeline events, and documents.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// TRANSACTION DISPUTES (REG E)
// =============================================================================

export type DisputeReason = 'unauthorized' | 'duplicate' | 'incorrect_amount' | 'merchandise_not_received' | 'service_not_rendered' | 'other';
export type DisputeStatus = 'pending' | 'under_review' | 'provisional_credit_issued' | 'resolved_favor_customer' | 'resolved_favor_merchant' | 'cancelled';

export interface Dispute {
  id: string;
  transactionId: string;
  transactionAmountCents: number;
  transactionDate: string;
  merchantName: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  provisionalCreditAmountCents: number | null;
  provisionalCreditDate: string | null;
  provisionalCreditDeadline: string;
  investigationDeadline: string;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeTimelineEvent {
  id: string;
  disputeId: string;
  eventType: string;
  description: string;
  createdAt: string;
  createdBy: string | null;
}

export interface DisputeDocument {
  id: string;
  disputeId: string;
  documentType: string;
  description: string;
  fileName: string;
  uploadedBy: string;
  createdAt: string;
}
