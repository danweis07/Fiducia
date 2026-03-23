/**
 * Stop Payment Types
 *
 * Stop payment entities. All monetary values are stored as integer cents.
 */

// =============================================================================
// STOP PAYMENTS
// =============================================================================

export type StopPaymentStatus = "active" | "expired" | "cancelled" | "matched";

export interface StopPayment {
  id: string;
  accountId: string;
  accountMasked: string;
  checkNumberStart: string;
  checkNumberEnd: string | null;
  payeeName: string | null;
  amountCents: number | null;
  amountRangeLowCents: number | null;
  amountRangeHighCents: number | null;
  reason: string;
  status: StopPaymentStatus;
  feeCents: number;
  duration: "6months" | "12months" | "permanent";
  effectiveDate: string;
  expirationDate: string | null;
  createdAt: string;
  updatedAt: string;
}
