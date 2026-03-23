/**
 * Direct Deposit Switching Types
 *
 * Direct deposit switch entities and supported employers.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// DIRECT DEPOSIT SWITCHING
// =============================================================================

export type DirectDepositSwitchStatus =
  | "pending"
  | "awaiting_login"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";
export type AllocationTypeValue = "full" | "partial" | "fixed_amount";

export interface SupportedEmployer {
  id: string;
  name: string;
  logoUrl: string | null;
  payrollProvider: string;
  isSupported: boolean;
}

export interface DirectDepositSwitch {
  id: string;
  accountId: string;
  accountMasked: string;
  employerId: string;
  employerName: string;
  allocationType: AllocationTypeValue;
  allocationAmountCents: number | null;
  allocationPercentage: number | null;
  status: DirectDepositSwitchStatus;
  widgetUrl: string | null;
  providerConfirmationId: string | null;
  completedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}
