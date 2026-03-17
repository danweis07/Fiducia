/**
 * Mock Transaction Enrichment Adapter
 *
 * Rule-based enrichment for development, testing, and demo environments.
 * Pattern-matches transaction descriptions against 25+ common merchant
 * patterns to return realistic enrichment data without external API calls.
 */

import type {
  TransactionEnrichmentAdapter,
  RawTransaction,
  EnrichedTransaction,
} from './types.ts';

// =============================================================================
// MERCHANT PATTERN DATABASE
// =============================================================================

interface MerchantPattern {
  /** Regex or substring to match (case-insensitive) */
  pattern: RegExp;
  /** Clean merchant name */
  merchantName: string;
  /** Enrichment category */
  category: string;
  /** Placeholder logo URL */
  merchantLogo: string;
  /** Whether this is typically recurring */
  isRecurring: boolean;
}

const MERCHANT_PATTERNS: MerchantPattern[] = [
  // Shopping
  { pattern: /AMAZON|AMZN/i, merchantName: 'Amazon', category: 'Shopping', merchantLogo: 'https://placehold.co/64x64?text=AMZ', isRecurring: false },
  { pattern: /WALMART|WMT/i, merchantName: 'Walmart', category: 'Shopping', merchantLogo: 'https://placehold.co/64x64?text=WMT', isRecurring: false },
  { pattern: /TARGET/i, merchantName: 'Target', category: 'Shopping', merchantLogo: 'https://placehold.co/64x64?text=TGT', isRecurring: false },
  { pattern: /COSTCO/i, merchantName: 'Costco', category: 'Shopping', merchantLogo: 'https://placehold.co/64x64?text=COST', isRecurring: false },
  { pattern: /BEST\s?BUY/i, merchantName: 'Best Buy', category: 'Electronics', merchantLogo: 'https://placehold.co/64x64?text=BBY', isRecurring: false },

  // Food & Drink
  { pattern: /STARBUCKS|SBUX/i, merchantName: 'Starbucks', category: 'Food & Drink', merchantLogo: 'https://placehold.co/64x64?text=SBUX', isRecurring: false },
  { pattern: /MCDONALD/i, merchantName: "McDonald's", category: 'Food & Drink', merchantLogo: 'https://placehold.co/64x64?text=MCD', isRecurring: false },
  { pattern: /CHIPOTLE/i, merchantName: 'Chipotle', category: 'Food & Drink', merchantLogo: 'https://placehold.co/64x64?text=CMG', isRecurring: false },
  { pattern: /CHICK-?FIL-?A/i, merchantName: 'Chick-fil-A', category: 'Food & Drink', merchantLogo: 'https://placehold.co/64x64?text=CFA', isRecurring: false },
  { pattern: /DUNKIN/i, merchantName: "Dunkin'", category: 'Food & Drink', merchantLogo: 'https://placehold.co/64x64?text=DNKN', isRecurring: false },
  { pattern: /DOORDASH/i, merchantName: 'DoorDash', category: 'Food & Drink', merchantLogo: 'https://placehold.co/64x64?text=DASH', isRecurring: false },
  { pattern: /UBER\s?EATS/i, merchantName: 'Uber Eats', category: 'Food & Drink', merchantLogo: 'https://placehold.co/64x64?text=UEAT', isRecurring: false },
  { pattern: /GRUBHUB/i, merchantName: 'Grubhub', category: 'Food & Drink', merchantLogo: 'https://placehold.co/64x64?text=GRUB', isRecurring: false },

  // Gas & Auto
  { pattern: /SHELL/i, merchantName: 'Shell', category: 'Gas', merchantLogo: 'https://placehold.co/64x64?text=SHEL', isRecurring: false },
  { pattern: /CHEVRON/i, merchantName: 'Chevron', category: 'Gas', merchantLogo: 'https://placehold.co/64x64?text=CVX', isRecurring: false },
  { pattern: /EXXON|MOBIL/i, merchantName: 'ExxonMobil', category: 'Gas', merchantLogo: 'https://placehold.co/64x64?text=XOM', isRecurring: false },
  { pattern: /BP\s|BRITISH\s?PETRO/i, merchantName: 'BP', category: 'Gas', merchantLogo: 'https://placehold.co/64x64?text=BP', isRecurring: false },

  // Transportation
  { pattern: /UBER(?!\s?EATS)/i, merchantName: 'Uber', category: 'Transportation', merchantLogo: 'https://placehold.co/64x64?text=UBER', isRecurring: false },
  { pattern: /LYFT/i, merchantName: 'Lyft', category: 'Transportation', merchantLogo: 'https://placehold.co/64x64?text=LYFT', isRecurring: false },

  // Subscriptions (recurring)
  { pattern: /NETFLIX/i, merchantName: 'Netflix', category: 'Entertainment', merchantLogo: 'https://placehold.co/64x64?text=NFLX', isRecurring: true },
  { pattern: /SPOTIFY/i, merchantName: 'Spotify', category: 'Entertainment', merchantLogo: 'https://placehold.co/64x64?text=SPOT', isRecurring: true },
  { pattern: /APPLE\.COM|APPLE\s?MUSIC|ICLOUD/i, merchantName: 'Apple', category: 'Entertainment', merchantLogo: 'https://placehold.co/64x64?text=AAPL', isRecurring: true },
  { pattern: /HULU/i, merchantName: 'Hulu', category: 'Entertainment', merchantLogo: 'https://placehold.co/64x64?text=HULU', isRecurring: true },
  { pattern: /DISNEY\+|DISNEYPLUS/i, merchantName: 'Disney+', category: 'Entertainment', merchantLogo: 'https://placehold.co/64x64?text=DIS+', isRecurring: true },

  // Utilities & Bills
  { pattern: /AT&?T|ATT\s/i, merchantName: 'AT&T', category: 'Utilities', merchantLogo: 'https://placehold.co/64x64?text=ATT', isRecurring: true },
  { pattern: /VERIZON|VZW/i, merchantName: 'Verizon', category: 'Utilities', merchantLogo: 'https://placehold.co/64x64?text=VZ', isRecurring: true },
  { pattern: /T-?MOBILE|TMOBILE/i, merchantName: 'T-Mobile', category: 'Utilities', merchantLogo: 'https://placehold.co/64x64?text=TMUS', isRecurring: true },
  { pattern: /COMCAST|XFINITY/i, merchantName: 'Xfinity', category: 'Utilities', merchantLogo: 'https://placehold.co/64x64?text=XFIN', isRecurring: true },

  // Groceries
  { pattern: /WHOLE\s?FOODS/i, merchantName: 'Whole Foods', category: 'Groceries', merchantLogo: 'https://placehold.co/64x64?text=WFM', isRecurring: false },
  { pattern: /TRADER\s?JOE/i, merchantName: "Trader Joe's", category: 'Groceries', merchantLogo: 'https://placehold.co/64x64?text=TJ', isRecurring: false },
  { pattern: /KROGER/i, merchantName: 'Kroger', category: 'Groceries', merchantLogo: 'https://placehold.co/64x64?text=KR', isRecurring: false },

  // Health
  { pattern: /CVS/i, merchantName: 'CVS Pharmacy', category: 'Health', merchantLogo: 'https://placehold.co/64x64?text=CVS', isRecurring: false },
  { pattern: /WALGREEN/i, merchantName: 'Walgreens', category: 'Health', merchantLogo: 'https://placehold.co/64x64?text=WBA', isRecurring: false },

  // Travel
  { pattern: /AIRBNB/i, merchantName: 'Airbnb', category: 'Travel', merchantLogo: 'https://placehold.co/64x64?text=ABNB', isRecurring: false },
  { pattern: /UNITED\s?AIR/i, merchantName: 'United Airlines', category: 'Travel', merchantLogo: 'https://placehold.co/64x64?text=UAL', isRecurring: false },
  { pattern: /DELTA\s?AIR/i, merchantName: 'Delta Air Lines', category: 'Travel', merchantLogo: 'https://placehold.co/64x64?text=DAL', isRecurring: false },
];

// =============================================================================
// ADAPTER IMPLEMENTATION
// =============================================================================

export class MockEnrichmentAdapter implements TransactionEnrichmentAdapter {
  readonly name = 'mock';

  async enrichTransaction(rawTx: RawTransaction): Promise<EnrichedTransaction> {
    const match = this.findMatch(rawTx.description);

    return {
      ...rawTx,
      merchantName: match?.merchantName ?? this.cleanDescription(rawTx.description),
      merchantLogo: match?.merchantLogo ?? null,
      category: match?.category ?? this.inferCategory(rawTx),
      isRecurring: match?.isRecurring ?? false,
      confidence: match ? 0.95 : 0.4,
    };
  }

  async categorizeTransactions(txs: RawTransaction[]): Promise<EnrichedTransaction[]> {
    return Promise.all(txs.map((tx) => this.enrichTransaction(tx)));
  }

  // ---------------------------------------------------------------------------
  // MATCHING LOGIC
  // ---------------------------------------------------------------------------

  private findMatch(description: string): MerchantPattern | undefined {
    return MERCHANT_PATTERNS.find((p) => p.pattern.test(description));
  }

  /**
   * Clean a raw bank description into a more readable name.
   * Removes common prefixes, trailing numbers, and extra whitespace.
   */
  private cleanDescription(description: string): string {
    return description
      .replace(/^(POS|DEBIT|CREDIT|ACH|CHECKCARD|PURCHASE)\s+/i, '')
      .replace(/\s+#?\d{4,}$/g, '') // trailing store/ref numbers
      .replace(/\s{2,}/g, ' ')
      .trim()
      .split(' ')
      .map((word) =>
        word.length > 2
          ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          : word.toUpperCase()
      )
      .join(' ');
  }

  /**
   * Fallback category inference based on amount patterns.
   */
  private inferCategory(tx: RawTransaction): string {
    const absAmount = Math.abs(tx.amount);

    // Positive amounts are typically income
    if (tx.amount > 0) {
      if (absAmount > 100000) return 'Income'; // > $1,000
      return 'Transfer';
    }

    // Small debits are often food/drink
    if (absAmount < 2000) return 'Food & Drink'; // < $20
    if (absAmount < 10000) return 'Shopping'; // < $100

    return 'Uncategorized';
  }
}
