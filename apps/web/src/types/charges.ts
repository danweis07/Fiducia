/**
 * Charges & Fees Types
 *
 * Fee definitions and charge entities.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// CHARGES & FEES
// =============================================================================

export type ChargeType =
  | "monthly_maintenance"
  | "overdraft"
  | "nsf"
  | "wire_fee"
  | "paper_statement"
  | "atm_fee"
  | "early_withdrawal"
  | "late_payment"
  | "account_closure"
  | "foreign_transaction"
  | "stop_payment"
  | "returned_check"
  | "custom";

export type ChargeFrequency = "one_time" | "monthly" | "quarterly" | "annually" | "per_occurrence";

export interface ChargeDefinition {
  id: string;
  name: string;
  description: string | null;
  chargeType: ChargeType;
  appliesTo: string;
  amountCents: number;
  isPercentage: boolean;
  frequency: ChargeFrequency;
  waivable: boolean;
  waiveIfBalanceAboveCents: number | null;
  maxPerDay: number | null;
  isActive: boolean;
}

export type ChargeStatus = "pending" | "applied" | "waived" | "reversed" | "disputed";

export interface Charge {
  id: string;
  accountId: string | null;
  loanId: string | null;
  chargeDefinitionId: string;
  amountCents: number;
  status: ChargeStatus;
  waivedReason: string | null;
  waivedAt: string | null;
  appliedAt: string | null;
  createdAt: string;
}
