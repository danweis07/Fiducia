/**
 * Transaction Enrichment Handlers
 *
 * Gateway handlers for enriching banking transactions with merchant data,
 * categories, logos, and recurring detection via MX Platform or mock adapter.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import type {
  TransactionEnrichmentAdapter,
  RawTransaction,
} from '../../_shared/adapters/enrichment/types.ts';
import { MXEnrichmentAdapter } from '../../_shared/adapters/enrichment/mx-adapter.ts';
import { MockEnrichmentAdapter } from '../../_shared/adapters/enrichment/mock-adapter.ts';

// =============================================================================
// ADAPTER REGISTRY
// =============================================================================

function getEnrichmentAdapter(): TransactionEnrichmentAdapter {
  const useMock = Deno.env.get('USE_MOCK_ENRICHMENT') === 'true'
    || !Deno.env.get('MX_API_KEY');

  if (useMock) {
    return new MockEnrichmentAdapter();
  }

  return new MXEnrichmentAdapter();
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * enrichment.enhance — Enrich a single transaction
 *
 * Params:
 *   - description: string (required)
 *   - amount: number (cents, required)
 *   - date: string (ISO 8601, required)
 *   - id?: string
 *   - accountId?: string
 */
export async function enhanceTransaction(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  const rawTx: RawTransaction = {
    description: params.description as string,
    amount: params.amount as number,
    date: params.date as string,
    id: params.id as string | undefined,
    accountId: params.accountId as string | undefined,
  };

  if (!rawTx.description || rawTx.amount == null || !rawTx.date) {
    return {
      error: { code: 'BAD_REQUEST', message: 'description, amount, and date are required' },
      status: 400,
    };
  }

  const adapter = getEnrichmentAdapter();
  const enriched = await adapter.enrichTransaction(rawTx);

  return {
    data: {
      transaction: enriched,
      adapter: adapter.name,
    },
  };
}

/**
 * enrichment.batch — Batch enrich multiple transactions
 *
 * Params:
 *   - transactions: RawTransaction[] (required, max 100)
 */
export async function batchEnrichTransactions(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const transactions = params.transactions as RawTransaction[] | undefined;

  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return {
      error: { code: 'BAD_REQUEST', message: 'transactions array is required and must not be empty' },
      status: 400,
    };
  }

  if (transactions.length > 100) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Maximum 100 transactions per batch' },
      status: 400,
    };
  }

  // Validate each transaction has required fields
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx.description || tx.amount == null || !tx.date) {
      return {
        error: {
          code: 'BAD_REQUEST',
          message: `Transaction at index ${i} missing required fields (description, amount, date)`,
        },
        status: 400,
      };
    }
  }

  const adapter = getEnrichmentAdapter();
  const enriched = await adapter.categorizeTransactions(transactions);

  return {
    data: {
      transactions: enriched,
      count: enriched.length,
      adapter: adapter.name,
    },
  };
}
