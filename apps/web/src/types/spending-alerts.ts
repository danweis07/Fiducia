/**
 * Spending Alert Types
 *
 * Alert rules and triggered events.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// SPENDING ALERTS
// =============================================================================

export type SpendingAlertType =
  | "balance_below"
  | "balance_above"
  | "transaction_above"
  | "daily_spending_above"
  | "category_spending"
  | "large_withdrawal"
  | "international_transaction";

export interface SpendingAlertRule {
  id: string;
  name: string;
  alertType: SpendingAlertType;
  accountId: string | null;
  accountMasked: string | null;
  thresholdCents: number | null;
  categoryId: string | null;
  categoryName: string | null;
  channels: ("push" | "email" | "sms")[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SpendingAlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  alertType: SpendingAlertType;
  message: string;
  amountCents: number | null;
  triggeredAt: string;
  acknowledged: boolean;
}
