/**
 * Wire Transfer Types
 *
 * Wire transfer entities, fee schedules, and limits.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// WIRE TRANSFERS
// =============================================================================

export type WireType = "domestic" | "international";
export type WireStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "returned";

export interface WireTransfer {
  id: string;
  type: WireType;
  fromAccountId: string;
  fromAccountMasked: string;
  beneficiaryName: string;
  bankName: string;
  routingNumber?: string;
  accountNumberMasked: string;
  swiftCode?: string;
  iban?: string;
  bankCountry?: string;
  amountCents: number;
  feeCents: number;
  currency: string;
  memo: string | null;
  purpose: string;
  referenceNumber: string;
  status: WireStatus;
  estimatedCompletionDate: string | null;
  completedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WireFeeSchedule {
  domesticFeeCents: number;
  internationalFeeCents: number;
  expeditedDomesticFeeCents: number;
  expeditedInternationalFeeCents: number;
}

export interface WireLimits {
  dailyLimitCents: number;
  perTransactionLimitCents: number;
  usedTodayCents: number;
  remainingDailyCents: number;
}
