/**
 * Standing Instruction Types
 *
 * Recurring automatic transfer instructions.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// STANDING INSTRUCTIONS
// =============================================================================

export type StandingInstructionTransferType =
  | "account_to_account"
  | "account_to_beneficiary"
  | "loan_payment";
export type StandingInstructionFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "annually";
export type StandingInstructionStatus = "active" | "paused" | "completed" | "cancelled" | "failed";

export interface StandingInstruction {
  id: string;
  fromAccountId: string;
  toAccountId: string | null;
  toBeneficiaryId: string | null;
  toLoanId: string | null;
  transferType: StandingInstructionTransferType;
  amountCents: number;
  name: string;
  frequency: StandingInstructionFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  nextExecutionDate: string;
  status: StandingInstructionStatus;
  totalExecutions: number;
  lastExecutedAt: string | null;
  lastFailureReason: string | null;
  createdAt: string;
  updatedAt: string;
}
