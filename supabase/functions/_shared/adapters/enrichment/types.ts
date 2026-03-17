/**
 * Transaction Enrichment Adapter — Types
 *
 * Defines the interface for transaction enrichment providers (e.g. MX Platform).
 * Any adapter that enriches raw banking transactions with merchant data,
 * categories, and recurring flags must implement TransactionEnrichmentAdapter.
 */

// =============================================================================
// RAW TRANSACTION (input from core banking)
// =============================================================================

export interface RawTransaction {
  /** Original transaction description from the bank feed */
  description: string;
  /** Transaction amount in cents (negative = debit, positive = credit) */
  amount: number;
  /** ISO 8601 date string */
  date: string;
  /** Optional transaction ID from the source system */
  id?: string;
  /** Optional account ID the transaction belongs to */
  accountId?: string;
}

// =============================================================================
// ENRICHED TRANSACTION (output from enrichment)
// =============================================================================

export interface EnrichedTransaction extends RawTransaction {
  /** Cleaned-up merchant/payee name (e.g. "STARBUCKS #1234" → "Starbucks") */
  merchantName: string;
  /** URL to merchant logo image, or null if unavailable */
  merchantLogo: string | null;
  /** Enrichment category (e.g. "Food & Drink", "Shopping", "Gas") */
  category: string;
  /** Whether this transaction appears to be recurring */
  isRecurring: boolean;
  /** MX or adapter-specific category code, if available */
  categoryCode?: string;
  /** Confidence score 0-1 for the enrichment, if available */
  confidence?: number;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface TransactionEnrichmentAdapter {
  /** Unique adapter identifier (e.g. "mx", "mock") */
  readonly name: string;

  /**
   * Enrich a single raw transaction with merchant data and category.
   */
  enrichTransaction(rawTx: RawTransaction): Promise<EnrichedTransaction>;

  /**
   * Batch-enrich multiple transactions. Implementations should optimize
   * for bulk API calls where possible.
   */
  categorizeTransactions(txs: RawTransaction[]): Promise<EnrichedTransaction[]>;
}
