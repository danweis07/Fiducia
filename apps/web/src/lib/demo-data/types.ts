/**
 * Shared types, constants, and helpers used across all demo data domain files.
 */

import { DEMO_USER } from "../demo";

// =============================================================================
// SHARED IDS — consistent across related entities
// =============================================================================

export const TENANT_ID = "demo-tenant";
export const CHECKING_ID = "acct-demo-checking-001";
export const SAVINGS_ID = "acct-demo-savings-002";
export const CD_ID = "acct-demo-cd-003";
export const LOAN_AUTO_ID = "loan-demo-auto-001";
export const LOAN_MORTGAGE_ID = "loan-demo-mortgage-002";
export const CARD_DEBIT_ID = "card-demo-debit-001";
export const CARD_CREDIT_ID = "card-demo-credit-002";
export const BENEFICIARY_1_ID = "bene-demo-001";
export const BENEFICIARY_2_ID = "bene-demo-002";

export { DEMO_USER };

// =============================================================================
// HANDLER TYPE
// =============================================================================

export type ActionHandler = (params: Record<string, unknown>) => unknown;

// =============================================================================
// HELPER — attach _pagination to list responses
// =============================================================================

export function withPagination<T extends object>(data: T, total: number): T {
  return Object.assign(data, {
    _pagination: { total, limit: 50, offset: 0, hasMore: false },
  });
}

export function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
}

/** Alias for isoDate — used in AI demo data for readability. */
export const pastDate = isoDate;
