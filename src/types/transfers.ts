/**
 * Transfer & Beneficiary Types
 *
 * Money movement entities between accounts.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// TRANSFERS
// =============================================================================

export type TransferStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TransferType = 'internal' | 'external' | 'wire' | 'p2p';

/** Settlement speed for a transfer — determines which payment rail is used */
export type TransferSettlement = 'standard' | 'same_day_ach' | 'rtp' | 'fednow' | 'instant';

export interface Transfer {
  id: string;
  tenantId: string;
  userId: string;
  fromAccountId: string;
  toAccountId: string | null;       // Null for external
  toBeneficiaryId: string | null;   // For external transfers
  type: TransferType;
  amountCents: number;
  memo: string | null;
  status: TransferStatus;
  /** Settlement speed — null means standard/default */
  settlement: TransferSettlement | null;
  scheduledDate: string | null;
  recurringRule: RecurringRule | null;
  processedAt: string | null;
  /** Estimated completion time (ISO-8601), provided by the payment rail */
  estimatedCompletionAt: string | null;
  createdAt: string;
}

export interface RecurringRule {
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  endDate: string | null;
  nextExecutionDate: string;
}

// =============================================================================
// BENEFICIARIES
// =============================================================================

export type BeneficiaryType = 'internal' | 'external' | 'wire';

/** @classification restricted — contains account routing info */
export interface Beneficiary {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  nickname: string | null;
  accountNumberMasked: string;      // Always masked
  routingNumber: string | null;
  bankName: string | null;
  type: BeneficiaryType;
  isVerified: boolean;
  createdAt: string;
}
