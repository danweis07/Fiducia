// TODO: Provisional integration — not yet validated in production.
/**
 * MX Platform Adapter — Transaction Enrichment
 *
 * Integrates with the MX Platform API to enrich raw banking transactions
 * with merchant data, categories, logos, and recurring detection.
 *
 * MX API docs: https://docs.mx.com/api
 * Base URL (sandbox/integration): https://int-api.mx.com
 * Auth: HTTP Basic with MX_CLIENT_ID:MX_API_KEY
 */

import type {
  TransactionEnrichmentAdapter,
  RawTransaction,
  EnrichedTransaction,
} from './types.ts';

// =============================================================================
// MX API TYPES
// =============================================================================

interface MXEnhanceRequest {
  description: string;
  amount: number;
  extended_transaction_type?: string;
}

interface MXEnhanceResponse {
  transaction: {
    category: string;
    description: string;
    original_description: string;
    merchant_category_code: number | null;
    merchant_guid: string | null;
    merchant_location_guid: string | null;
    type: string;
    is_bill_pay: boolean;
    is_direct_deposit: boolean;
    is_expense: boolean;
    is_fee: boolean;
    is_income: boolean;
    is_international: boolean | null;
    is_overdraft_fee: boolean;
    is_payroll_advance: boolean;
    is_recurring: boolean;
    is_subscription: boolean;
  };
}

interface MXCategoryResponse {
  categories: Array<{
    guid: string;
    name: string;
    parent_guid: string | null;
  }>;
}

// =============================================================================
// ADAPTER IMPLEMENTATION
// =============================================================================

export class MXEnrichmentAdapter implements TransactionEnrichmentAdapter {
  readonly name = 'mx';

  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor() {
    const apiKey = Deno.env.get('MX_API_KEY');
    const clientId = Deno.env.get('MX_CLIENT_ID');

    if (!apiKey || !clientId) {
      throw new Error(
        'MX Platform credentials missing: MX_API_KEY and MX_CLIENT_ID must be set'
      );
    }

    this.baseUrl = 'https://int-api.mx.com';
    // MX uses HTTP Basic: base64(clientId:apiKey)
    this.authHeader = `Basic ${btoa(`${clientId}:${apiKey}`)}`;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC INTERFACE
  // ---------------------------------------------------------------------------

  async enrichTransaction(rawTx: RawTransaction): Promise<EnrichedTransaction> {
    const enhanced = await this.callEnhance(rawTx);
    return this.mapToEnriched(rawTx, enhanced);
  }

  async categorizeTransactions(txs: RawTransaction[]): Promise<EnrichedTransaction[]> {
    // MX enhance endpoint handles one transaction at a time,
    // so we batch with concurrency control to avoid rate limits.
    const BATCH_SIZE = 10;
    const results: EnrichedTransaction[] = [];

    for (let i = 0; i < txs.length; i += BATCH_SIZE) {
      const batch = txs.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((tx) => this.enrichTransaction(tx))
      );
      results.push(...batchResults);
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // MX API CALLS
  // ---------------------------------------------------------------------------

  private async callEnhance(rawTx: RawTransaction): Promise<MXEnhanceResponse> {
    const body: MXEnhanceRequest = {
      description: rawTx.description,
      amount: rawTx.amount / 100, // MX expects dollars, we store cents
    };

    const response = await fetch(`${this.baseUrl}/transactions/enhance`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `MX enhance API error (${response.status}): ${errorText}`
      );
    }

    return response.json() as Promise<MXEnhanceResponse>;
  }

  /**
   * Fetch MX category list. Useful for mapping category codes to names.
   * Cached in production; exposed for potential future use.
   */
  async listCategories(): Promise<MXCategoryResponse> {
    const response = await fetch(`${this.baseUrl}/categories`, {
      method: 'GET',
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `MX categories API error (${response.status}): ${errorText}`
      );
    }

    return response.json() as Promise<MXCategoryResponse>;
  }

  // ---------------------------------------------------------------------------
  // MAPPING
  // ---------------------------------------------------------------------------

  private mapToEnriched(
    rawTx: RawTransaction,
    mxResponse: MXEnhanceResponse
  ): EnrichedTransaction {
    const tx = mxResponse.transaction;

    return {
      ...rawTx,
      merchantName: tx.description || rawTx.description,
      merchantLogo: tx.merchant_guid
        ? `https://content.moneydesktop.com/storage/MD_Assets/merchant/${tx.merchant_guid}.png`
        : null,
      category: tx.category || 'Uncategorized',
      isRecurring: tx.is_recurring || tx.is_subscription,
      categoryCode: tx.merchant_category_code?.toString() ?? undefined,
    };
  }
}
