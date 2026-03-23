/**
 * Transaction Types
 *
 * Financial transaction entities and realtime payment events.
 * All monetary values are stored as integer cents.
 */

import type { TransferType, TransferStatus, TransferSettlement } from "./transfers";

// =============================================================================
// TRANSACTIONS
// =============================================================================

export type TransactionType =
  | "debit"
  | "credit"
  | "transfer"
  | "deposit"
  | "withdrawal"
  | "fee"
  | "interest"
  | "rdc_deposit"
  | "bill_payment"
  | "p2p_send"
  | "p2p_receive";

export type TransactionStatus = "pending" | "posted" | "declined" | "reversed";

export type TransactionCategory =
  | "income"
  | "groceries"
  | "dining"
  | "transportation"
  | "utilities"
  | "housing"
  | "entertainment"
  | "healthcare"
  | "shopping"
  | "education"
  | "travel"
  | "fees"
  | "transfer"
  | "deposit"
  | "other";

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amountCents: number; // Positive = credit, negative = debit
  description: string;
  category: TransactionCategory;
  status: TransactionStatus;
  merchantName: string | null;
  merchantCategory: string | null;
  runningBalanceCents: number;
  postedAt: string | null;
  createdAt: string;

  // --- ISO 20022 Structured Remittance Data (international transactions) ---

  /** Structured remittance information (ISO 20022 rich data) */
  remittanceInfo?: StructuredRemittanceInfo | null;
}

/** ISO 20022 structured remittance information for international transactions */
export interface StructuredRemittanceInfo {
  /** Invoice number or reference */
  invoiceNumber: string | null;
  /** Tax ID of the sender or receiver */
  taxId: string | null;
  /** Purpose of payment code (ISO 20022 ExternalPurpose1Code) */
  purposeCode: string | null;
  /** Purpose of payment description */
  purposeDescription: string | null;
  /** End-to-end reference (unique payment ID across the chain) */
  endToEndReference: string | null;
  /** Creditor reference (structured creditor identification) */
  creditorReference: string | null;
}

// =============================================================================
// REALTIME PAYMENT EVENTS
// =============================================================================

/** Event names published to realtime channels for money movement */
export type PaymentEventName =
  | "transfer.initiated"
  | "transfer.processing"
  | "transfer.completed"
  | "transfer.failed"
  | "transfer.returned"
  | "balance.updated";

/** Payload for transfer status change events delivered via pub/sub */
export interface TransferStatusEvent {
  transferId: string;
  tenantId: string;
  userId: string;
  fromAccountId: string;
  toAccountId: string | null;
  type: TransferType;
  settlement: TransferSettlement | null;
  amountCents: number;
  previousStatus: TransferStatus;
  newStatus: TransferStatus;
  /** Payment rail reference (e.g., FedNow message ID, RTP tracking number) */
  railReference: string | null;
  /** ISO-8601 timestamp of the status change */
  changedAt: string;
}

/** Payload for balance update events delivered via pub/sub */
export interface BalanceUpdateEvent {
  accountId: string;
  tenantId: string;
  userId: string;
  currentBalanceCents: number;
  availableBalanceCents: number;
  /** The transfer or transaction that triggered this update */
  triggeredBy: string | null;
  changedAt: string;
}
