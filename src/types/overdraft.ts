/**
 * Overdraft Protection Types
 *
 * Overdraft settings and event entities.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// OVERDRAFT PROTECTION
// =============================================================================

export type OverdraftProtectionType = 'transfer' | 'line_of_credit' | 'courtesy_pay';

export interface OverdraftSettings {
  accountId: string;
  isEnabled: boolean;
  protectionType: OverdraftProtectionType | null;
  linkedAccountId: string | null;
  linkedAccountMasked: string | null;
  courtesyPayLimitCents: number | null;
  optedIntoOverdraftFees: boolean;
  updatedAt: string;
}

export interface OverdraftEvent {
  id: string;
  accountId: string;
  transactionId: string;
  amountCents: number;
  feeCents: number;
  protectionType: OverdraftProtectionType;
  wasProtected: boolean;
  occurredAt: string;
}
