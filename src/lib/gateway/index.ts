/**
 * Gateway API Client — Banking Platform
 *
 * Typed frontend client for the gateway edge function.
 * ALL data access from the frontend goes through this module.
 *
 * Usage:
 *   import { gateway } from '@/lib/gateway';
 *   const { accounts } = await gateway.accounts.list();
 */

import { isDemoMode } from '@/lib/demo';
import { getBackend } from '@/lib/backend';
import { callGateway, GatewayApiError } from './client';
import { createAccountsDomain } from './accounts';
import { createPaymentsDomain } from './payments';
import { createCardsDomain } from './cards';
import { createLoansDomain } from './loans';
import { createDepositsDomain } from './deposits';
import { createMemberDomain } from './member';
import { createAdminDomain } from './admin';
import { createFinancialDomain } from './financial';
import { createComplianceDomain } from './compliance';
import { createContentDomain } from './content';
import { createIntegrationsDomain } from './integrations';
import { createMessagingDomain } from './messaging';
import { createAiDomain } from './ai';
import { createBusinessDomain } from './business';
import { createInternationalDomain } from './international';
import { createIncidentsDomain } from './incidents';

// =============================================================================
// GRAPHQL CLIENT
// =============================================================================

interface GraphQLResponse<T = Record<string, unknown>> {
  data?: T | null;
  errors?: { message: string; path?: string[]; extensions?: Record<string, unknown> }[];
  meta?: { requestId?: string; timing?: { durationMs: number } };
}

/**
 * Execute a GraphQL query/mutation against the gateway.
 *
 * The gateway translates GraphQL fields to action calls, so you can
 * batch multiple reads into a single request:
 *
 * ```ts
 * const result = await gateway.graphql<{
 *   accountsList: Account[];
 *   transactionsList: { transactions: Transaction[] };
 * }>(`
 *   query {
 *     accountsList(params: { limit: 10 })
 *     transactionsList(params: { limit: 5 })
 *   }
 * `);
 * ```
 *
 * Field names follow camelCase conversion of action names:
 * - "accounts.list" → accountsList
 * - "cms.content.get" → cmsContentGet
 */
async function graphql<T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphQLResponse<T>> {
  if (isDemoMode()) {
    // In demo mode, extract field names and call demo data for each
    const fieldMatches = query.match(/(\w+)\s*\(/g);
    if (!fieldMatches) return { data: null, errors: [{ message: 'No fields found in query' }] };

    const data: Record<string, unknown> = {};
    for (const match of fieldMatches) {
      const fieldName = match.replace(/\s*\($/, '');
      const action = fieldNameToAction(fieldName);
      if (action) {
        const { getDemoResponse } = await import('../demo-data');
        data[fieldName] = getDemoResponse(action, {});
      }
    }
    return { data: data as T };
  }

  const backend = getBackend();
  const transport = backend.gateway;

  // Use dedicated graphql method if available, otherwise send query as body
  const response = transport.graphql
    ? await transport.graphql(query, variables)
    : await transport.invoke('__graphql__', { query, variables });

  return (response as unknown) as GraphQLResponse<T>;
}

/**
 * Convert a GraphQL field name back to a gateway action.
 * "accountsList" → "accounts.list"
 * "cmsContentCreate" → "cms.content.create"
 *
 * Convention: field names are camelCase concatenations of dotted action names.
 * We split on uppercase boundaries and rejoin with dots.
 */
function fieldNameToAction(fieldName: string): string | null {
  // Split on uppercase letter boundaries: "accountsList" → ["accounts", "List"]
  const parts = fieldName
    .replace(/([A-Z])/g, '.$1')
    .toLowerCase()
    .split('.')
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  return parts.join('.');
}

// =============================================================================
// ASSEMBLE GATEWAY OBJECT
// =============================================================================

export const gateway = {
  ...createAccountsDomain(callGateway),
  ...createPaymentsDomain(callGateway),
  ...createCardsDomain(callGateway),
  ...createLoansDomain(callGateway),
  ...createDepositsDomain(callGateway),
  ...createMemberDomain(callGateway),
  ...createAdminDomain(callGateway),
  ...createFinancialDomain(callGateway),
  ...createComplianceDomain(callGateway),
  ...createContentDomain(callGateway),
  ...createIntegrationsDomain(callGateway),
  ...createMessagingDomain(callGateway),
  ...createAiDomain(callGateway),
  ...createBusinessDomain(callGateway),
  ...createInternationalDomain(callGateway),
  ...createIncidentsDomain(callGateway),

  // Generic request (for actions without typed methods)
  async request<T = Record<string, unknown>>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    return callGateway<T>(action, params);
  },

  /** Execute a GraphQL query/mutation against the gateway */
  graphql: graphql,
};

// =============================================================================
// EXPORTS
// =============================================================================

export { GatewayApiError, graphql };
export type { Pagination, GraphQLResponse };
export type { CallGatewayFn } from './client';
export type { GatewayError } from './client';
