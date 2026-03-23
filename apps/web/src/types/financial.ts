/**
 * Financial Data & Card Offers Types
 *
 * Additional financial types not covered in banking.ts.
 * All monetary values are integer cents.
 *
 * Note: SpendingCategory, SpendingByCategory, SpendingSummary, MonthlyTrend,
 * BudgetItem, NetWorthSnapshot, RecurringTransaction, OfferStatus, OfferType,
 * MerchantOffer, OfferRedemption, OfferSummary, BillerInfo, BillerEnrollmentField,
 * BillPayPayee, BillPayPayment, and EBill are defined in banking.ts.
 */

// =============================================================================
// BUDGET (legacy alias)
// =============================================================================

export interface Budget {
  budgetId: string;
  category: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  percentUsed: number;
  isOverBudget: boolean;
  projectedCents: number;
}

// =============================================================================
// ENRICHED TRANSACTION
// =============================================================================

export interface EnrichedTransaction {
  transactionId: string;
  cleanDescription: string;
  rawDescription: string;
  merchant?: {
    name: string;
    logoUrl?: string;
    websiteUrl?: string;
    category: string;
    location?: string;
  };
  category: string;
  amountCents: number;
  date: string;
  isRecurring: boolean;
  transactionType: string;
}
