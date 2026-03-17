/**
 * External Accounts Route Handlers
 *
 * Provides gateway actions for Plaid-based external account linking:
 *   - external-accounts.link-token
 *   - external-accounts.exchange
 *   - external-accounts.list
 *   - external-accounts.balances
 *   - external-accounts.transactions
 *
 * Uses the adapter registry to pick plaid-adapter or mock-adapter
 * based on tenant configuration.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { ExternalAccountAdapter } from '../../_shared/adapters/external-accounts/types.ts';

// =============================================================================
// IN-MEMORY TOKEN STORE (placeholder until DB layer)
// =============================================================================

/**
 * Temporary in-memory store for linked account access tokens.
 * In production, access tokens would be encrypted and stored in a
 * `linked_accounts` table with per-user, per-tenant scoping.
 */
const linkedAccountTokens = new Map<string, {
  accessToken: string;
  itemId: string;
  userId: string;
  linkedAt: string;
}>();

// =============================================================================
// HELPERS
// =============================================================================

async function getAdapter(ctx: GatewayContext): Promise<ExternalAccountAdapter> {
  const { adapter } = await resolveAdapter<ExternalAccountAdapter>(
    'external_accounts',
    ctx.firmId,
  );
  return adapter;
}

function requireAuth(ctx: GatewayContext): string {
  if (!ctx.userId) {
    throw new AuthRequiredError();
  }
  return ctx.userId;
}

class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthRequiredError';
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Create a Plaid Link token for the frontend to initiate account linking.
 */
export async function createLinkToken(ctx: GatewayContext): Promise<GatewayResponse> {
  try {
    const userId = requireAuth(ctx);
    const adapter = await getAdapter(ctx);

    const result = await adapter.linkToken({
      userId,
      clientName: (ctx.params.clientName as string) ?? 'Digital Banking',
      products: (ctx.params.products as string[]) ?? ['transactions'],
      countryCodes: (ctx.params.countryCodes as string[]) ?? ['US'],
      language: (ctx.params.language as string) ?? 'en',
    });

    return {
      data: {
        linkToken: result.linkToken,
        expiration: result.expiration,
      },
    };
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return { error: { code: 'UNAUTHORIZED', message: err.message }, status: 401 };
    }
    throw err;
  }
}

/**
 * Exchange a public token from Plaid Link for an access token.
 * Stores the access token reference for subsequent calls.
 */
export async function exchangeToken(ctx: GatewayContext): Promise<GatewayResponse> {
  try {
    const userId = requireAuth(ctx);
    const adapter = await getAdapter(ctx);

    const publicToken = ctx.params.publicToken as string;
    if (!publicToken) {
      return {
        error: { code: 'BAD_REQUEST', message: 'Missing publicToken parameter' },
        status: 400,
      };
    }

    const result = await adapter.exchangeToken({ publicToken });

    // Store access token (in production: encrypt and persist to linked_accounts table)
    const tokenKey = `${userId}:${result.itemId}`;
    linkedAccountTokens.set(tokenKey, {
      accessToken: result.accessToken,
      itemId: result.itemId,
      userId,
      linkedAt: new Date().toISOString(),
    });

    return {
      data: {
        itemId: result.itemId,
        linkedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return { error: { code: 'UNAUTHORIZED', message: err.message }, status: 401 };
    }
    throw err;
  }
}

/**
 * List external accounts linked by the current user.
 */
export async function listExternalAccounts(ctx: GatewayContext): Promise<GatewayResponse> {
  try {
    const userId = requireAuth(ctx);
    const adapter = await getAdapter(ctx);

    // Find all tokens for this user
    const userTokens = Array.from(linkedAccountTokens.entries())
      .filter(([, v]) => v.userId === userId);

    if (userTokens.length === 0) {
      return { data: { accounts: [] } };
    }

    // Fetch accounts from all linked items
    const allAccounts = [];
    for (const [, token] of userTokens) {
      const result = await adapter.getAccounts({ accessToken: token.accessToken });
      allAccounts.push(...result.accounts);
    }

    return { data: { accounts: allAccounts } };
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return { error: { code: 'UNAUTHORIZED', message: err.message }, status: 401 };
    }
    throw err;
  }
}

/**
 * Get balances for a linked external account.
 */
export async function getExternalBalances(ctx: GatewayContext): Promise<GatewayResponse> {
  try {
    const userId = requireAuth(ctx);
    const adapter = await getAdapter(ctx);

    const accountId = ctx.params.accountId as string | undefined;

    // Find user tokens
    const userTokens = Array.from(linkedAccountTokens.entries())
      .filter(([, v]) => v.userId === userId);

    if (userTokens.length === 0) {
      return { data: { balances: [] } };
    }

    const allBalances = [];
    for (const [, token] of userTokens) {
      const result = await adapter.getBalances({
        accessToken: token.accessToken,
        accountIds: accountId ? [accountId] : undefined,
      });
      allBalances.push(...result.balances);
    }

    return { data: { balances: allBalances } };
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return { error: { code: 'UNAUTHORIZED', message: err.message }, status: 401 };
    }
    throw err;
  }
}

/**
 * Get transactions for a linked external account.
 */
export async function getExternalTransactions(ctx: GatewayContext): Promise<GatewayResponse> {
  try {
    const userId = requireAuth(ctx);
    const adapter = await getAdapter(ctx);

    const accountId = ctx.params.accountId as string | undefined;
    const cursor = ctx.params.cursor as string | undefined;
    const count = ctx.params.count as number | undefined;

    // Find user tokens
    const userTokens = Array.from(linkedAccountTokens.entries())
      .filter(([, v]) => v.userId === userId);

    if (userTokens.length === 0) {
      return {
        data: {
          transactions: [],
          nextCursor: '',
          hasMore: false,
        },
      };
    }

    // For simplicity, use the first token (production would match accountId -> itemId)
    const [, token] = userTokens[0];
    const result = await adapter.getTransactions({
      accessToken: token.accessToken,
      cursor,
      count,
    });

    // Filter by accountId if specified
    const transactions = accountId
      ? result.added.filter((t) => t.accountId === accountId)
      : result.added;

    return {
      data: {
        transactions,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    };
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return { error: { code: 'UNAUTHORIZED', message: err.message }, status: 401 };
    }
    throw err;
  }
}
