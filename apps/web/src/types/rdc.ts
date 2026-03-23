/**
 * Remote Deposit Capture (RDC) Types
 *
 * RDC deposit entities. All monetary values are stored as integer cents.
 */

// =============================================================================
// REMOTE DEPOSIT CAPTURE (RDC)
// =============================================================================

export type RDCStatus = "pending" | "reviewing" | "accepted" | "rejected" | "cleared";

export interface RDCDeposit {
  id: string;
  accountId: string;
  tenantId: string;
  userId: string;
  amountCents: number;
  frontImageUrl: string | null; // Secure storage reference
  backImageUrl: string | null; // Secure storage reference
  status: RDCStatus;
  checkNumber: string | null;
  rejectionReason: string | null;
  clearedAt: string | null;
  createdAt: string;
}
