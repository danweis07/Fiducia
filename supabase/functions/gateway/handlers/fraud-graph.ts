/**
 * Fraud Graph Gateway Handlers
 *
 * Exposes graph-based fraud detection, network analysis, community detection,
 * risk propagation, and graph ingestion via the gateway RPC interface.
 *
 * Actions:
 *   - fraud.graph.analyze       — Analyze a customer's network for anomalies
 *   - fraud.graph.network       — Retrieve a customer's relationship graph
 *   - fraud.graph.communities   — Detect communities / fraud rings
 *   - fraud.graph.risk          — Propagate risk across a customer's network
 *   - fraud.graph.ingestTransaction   — Ingest a transaction into the graph
 *   - fraud.graph.ingestRelationship  — Ingest a relationship edge into the graph
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import type { FraudGraphAdapter } from '../../_shared/adapters/fraud-graph/types.ts';
import type { GraphEdgeType } from '../../_shared/adapters/fraud-graph/types.ts';
import { MockFraudGraphAdapter } from '../../_shared/adapters/fraud-graph/mock-adapter.ts';

// =============================================================================
// ADAPTER REGISTRY
// =============================================================================

async function getFraudGraphAdapter(): Promise<FraudGraphAdapter> {
  const provider = Deno.env.get('FRAUD_GRAPH_PROVIDER') ?? 'mock';

  switch (provider) {
    case 'neo4j': {
      const mod = await import('../../_shared/adapters/fraud-graph/neo4j-adapter.ts');
      return new mod.Neo4jFraudGraphAdapter();
    }
    default:
      return new MockFraudGraphAdapter();
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * fraud.graph.analyze — Analyze a customer's network for fraud patterns
 *
 * Required: customerId
 * Optional: depth (1-5, default 2), includeTransactions (boolean)
 */
export async function analyzeNetwork(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const customerId = params.customerId as string | undefined;

  if (!customerId) {
    return {
      error: { code: 'BAD_REQUEST', message: 'customerId is required' },
      status: 400,
    };
  }

  const depth = params.depth as number | undefined;
  if (depth !== undefined && (depth < 1 || depth > 5)) {
    return {
      error: { code: 'BAD_REQUEST', message: 'depth must be between 1 and 5' },
      status: 400,
    };
  }

  const adapter = await getFraudGraphAdapter();
  const result = await adapter.analyzeNetwork({
    tenantId: ctx.firmId ?? '',
    customerId,
    depth,
    includeTransactions: params.includeTransactions as boolean | undefined,
  });

  return {
    data: {
      customerId: result.customerId,
      graph: result.graph,
      anomalies: result.anomalies,
      analyzedAt: result.analyzedAt,
    },
  };
}

/**
 * fraud.graph.network — Retrieve a customer's relationship graph
 *
 * Required: customerId
 * Optional: depth (1-5, default 2)
 */
export async function getCustomerGraph(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const customerId = params.customerId as string | undefined;

  if (!customerId) {
    return {
      error: { code: 'BAD_REQUEST', message: 'customerId is required' },
      status: 400,
    };
  }

  const depth = params.depth as number | undefined;
  if (depth !== undefined && (depth < 1 || depth > 5)) {
    return {
      error: { code: 'BAD_REQUEST', message: 'depth must be between 1 and 5' },
      status: 400,
    };
  }

  const adapter = await getFraudGraphAdapter();
  const result = await adapter.getCustomerGraph({
    tenantId: ctx.firmId ?? '',
    customerId,
    depth,
  });

  return { data: { graph: result.graph } };
}

/**
 * fraud.graph.communities — Detect communities / fraud rings
 *
 * Optional: minCommunitySize (default 3), riskThreshold (0-1000)
 */
export async function detectCommunities(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  const adapter = await getFraudGraphAdapter();
  const result = await adapter.detectCommunities({
    tenantId: ctx.firmId ?? '',
    minCommunitySize: params.minCommunitySize as number | undefined,
    riskThreshold: params.riskThreshold as number | undefined,
  });

  return {
    data: {
      communities: result.communities,
      totalCommunities: result.totalCommunities,
      analyzedAt: result.analyzedAt,
    },
  };
}

/**
 * fraud.graph.risk — Propagate risk scores across a customer's network
 *
 * Required: customerId
 * Optional: propagationDepth (default 3)
 */
export async function propagateRisk(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const customerId = params.customerId as string | undefined;

  if (!customerId) {
    return {
      error: { code: 'BAD_REQUEST', message: 'customerId is required' },
      status: 400,
    };
  }

  const adapter = await getFraudGraphAdapter();
  const result = await adapter.propagateRisk({
    tenantId: ctx.firmId ?? '',
    customerId,
    propagationDepth: params.propagationDepth as number | undefined,
  });

  return {
    data: {
      customerId: result.customerId,
      baseRiskScore: result.baseRiskScore,
      propagatedRiskScore: result.propagatedRiskScore,
      riskLevel: result.riskLevel,
      contributingFactors: result.contributingFactors,
    },
  };
}

/**
 * fraud.graph.ingestTransaction — Ingest a transaction into the fraud graph
 *
 * Required: transactionId, sourceAccountId, targetAccountId, amountCents, timestamp
 * Optional: metadata
 */
export async function ingestTransaction(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  const requiredFields = ['transactionId', 'sourceAccountId', 'targetAccountId', 'amountCents', 'timestamp'] as const;
  for (const field of requiredFields) {
    if (params[field] === undefined || params[field] === null) {
      return {
        error: { code: 'BAD_REQUEST', message: `${field} is required` },
        status: 400,
      };
    }
  }

  const adapter = await getFraudGraphAdapter();
  await adapter.ingestTransaction({
    tenantId: ctx.firmId ?? '',
    transactionId: params.transactionId as string,
    sourceAccountId: params.sourceAccountId as string,
    targetAccountId: params.targetAccountId as string,
    amountCents: params.amountCents as number,
    timestamp: params.timestamp as string,
    metadata: params.metadata as Record<string, unknown> | undefined,
  });

  return { data: { success: true } };
}

/**
 * fraud.graph.ingestRelationship — Ingest a relationship edge into the fraud graph
 *
 * Required: sourceId, targetId, edgeType
 * Optional: properties
 */
export async function ingestRelationship(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  const requiredFields = ['sourceId', 'targetId', 'edgeType'] as const;
  for (const field of requiredFields) {
    if (!params[field]) {
      return {
        error: { code: 'BAD_REQUEST', message: `${field} is required` },
        status: 400,
      };
    }
  }

  const validEdgeTypes = [
    'has_account', 'sends_to', 'receives_from', 'uses_device',
    'matches_watchlist', 'owns_jointly', 'pays_beneficiary',
  ];
  const edgeType = params.edgeType as string;
  if (!validEdgeTypes.includes(edgeType)) {
    return {
      error: {
        code: 'BAD_REQUEST',
        message: `Invalid edgeType "${edgeType}". Must be one of: ${validEdgeTypes.join(', ')}`,
      },
      status: 400,
    };
  }

  const adapter = await getFraudGraphAdapter();
  await adapter.ingestRelationship({
    tenantId: ctx.firmId ?? '',
    sourceId: params.sourceId as string,
    targetId: params.targetId as string,
    edgeType: edgeType as GraphEdgeType,
    properties: params.properties as Record<string, unknown> | undefined,
  });

  return { data: { success: true } };
}
