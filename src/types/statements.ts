/**
 * Account Statement Types
 *
 * Statement entities and configuration.
 * All monetary values are stored as integer cents.
 */

import type { Transaction } from './transactions';

// =============================================================================
// ACCOUNT STATEMENTS
// =============================================================================

/** How the core banking system delivers statement data */
export type StatementFormat = 'pdf' | 'data' | 'hybrid';

export type StatementDeliveryMethod = 'portal' | 'email' | 'mail';

/** Tenant-level statement configuration — driven by core banking integration */
export interface StatementConfig {
  /** Which formats the core banking system supports */
  supportedFormats: StatementFormat[];
  /** Default format for statement rendering */
  defaultFormat: StatementFormat;
  /** How many months of statements to retain */
  retentionMonths: number;
  /** How statements are delivered to members */
  deliveryMethods: StatementDeliveryMethod[];
  /** Day of month the statement cycle closes */
  cycleDayOfMonth: number;
  /** Whether check images are included in statements */
  includeImages: boolean;
  /** Whether e-statements are available (vs paper only) */
  eStatementsEnabled: boolean;
}

/** An individual account statement */
export interface AccountStatement {
  id: string;
  accountId: string;
  tenantId: string;
  /** Statement period label (e.g. "February 2026") */
  periodLabel: string;
  /** Period start date (ISO 8601) */
  periodStart: string;
  /** Period end date (ISO 8601) */
  periodEnd: string;
  /** Format of this statement */
  format: StatementFormat;
  /** Opening balance in cents */
  openingBalanceCents: number;
  /** Closing balance in cents */
  closingBalanceCents: number;
  /** Total credits during period in cents */
  totalCreditsCents: number;
  /** Total debits during period in cents */
  totalDebitsCents: number;
  /** Number of transactions in the period */
  transactionCount: number;
  /** For PDF format: download URL (pre-signed, time-limited) */
  downloadUrl: string | null;
  /** When the statement was generated */
  generatedAt: string;
}

/** Statement detail — includes transaction data for 'data' and 'hybrid' formats */
export interface StatementDetail extends AccountStatement {
  /** Transactions for the period (only for 'data' and 'hybrid' formats) */
  transactions?: Transaction[];
  /** Interest earned during the period in cents */
  interestEarnedCents: number;
  /** Fees charged during the period in cents */
  feesChargedCents: number;
  /** Average daily balance in cents */
  averageDailyBalanceCents: number;
  /** Days in the statement period */
  daysInPeriod: number;
}
