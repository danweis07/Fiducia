/**
 * Account Types
 *
 * Banking account entities, products, and related types.
 * All monetary values are stored as integer cents.
 */

import type { KYCStatus } from "./compliance";

// =============================================================================
// BANKING USER (extends Supabase auth.users)
// =============================================================================

export type { KYCStatus };

/** @classification restricted — contains PII fields */
export interface BankingUser {
  id: string;
  tenantId: string;
  email: string; // @classification restricted
  firstName: string; // @classification restricted
  lastName: string; // @classification restricted
  phone: string | null; // @classification restricted
  dateOfBirth: string | null; // @classification restricted
  kycStatus: KYCStatus;
  mfaEnabled: boolean;
  preferredLanguage: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// ACCOUNTS
// =============================================================================

export type AccountType =
  | "checking"
  | "savings"
  | "money_market"
  | "cd"
  | "fixed_deposit"
  | "recurring_deposit"
  | "share"
  | "loan";
export type AccountStatus = "active" | "frozen" | "closed" | "pending";

/** @classification confidential — balances are sensitive */
export interface Account {
  id: string;
  tenantId: string;
  userId: string;
  type: AccountType;
  nickname: string | null;
  accountNumberMasked: string; // Always masked: "****1234"
  routingNumber: string;
  currency: string; // ISO 4217 (default 'USD')
  iban: string | null; // EU/UK/international
  bic: string | null; // SWIFT/BIC
  sortCode: string | null; // UK sort code
  balanceCents: number; // Integer cents (minor currency units)
  availableBalanceCents: number; // Integer cents (minor currency units)
  status: AccountStatus;
  interestRateBps: number; // Basis points (e.g., 425 = 4.25%)
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// ACCOUNT PRODUCTS
// =============================================================================

export type InterestCompounding = "daily" | "monthly" | "quarterly" | "annually";
export type InterestPosting = "monthly" | "quarterly" | "annually";
export type InterestCalculation = "daily_balance" | "average_daily_balance" | "minimum_balance";

export interface AccountProduct {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  type: AccountType;
  interestRateBps: number;
  interestCompounding: InterestCompounding;
  interestPosting: InterestPosting;
  interestCalculation: InterestCalculation;
  minimumOpeningBalanceCents: number;
  minimumBalanceCents: number;
  maximumBalanceCents: number | null;
  withdrawalLimitPerMonth: number | null;
  termMonths: number | null;
  earlyWithdrawalPenaltyBps: number | null;
  autoRenew: boolean;
  isActive: boolean;
}

// =============================================================================
// CD MATURITY
// =============================================================================

export type MaturityAction =
  | "renew_same_term"
  | "renew_new_term"
  | "transfer_to_savings"
  | "transfer_to_checking"
  | "notify_only";

export interface CDMaturity {
  accountId: string;
  maturityDate: string | null;
  maturityAction: MaturityAction | null;
  maturityTransferAccountId: string | null;
  originalTermMonths: number | null;
  penaltyWithdrawnCents: number;
  productId: string | null;
}
