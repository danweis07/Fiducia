/**
 * Gateway Domain — Fraud Graph
 *
 * Client-side hooks for graph-based fraud detection, relationship
 * mapping, and risk network analysis via the fraud-graph adapter.
 */

import type { CallGatewayFn } from './client';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, unknown>;
  createdAt: string;
}

export interface CustomerGraph {
  customerId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface NetworkAnomaly {
  type: string;
  severity: RiskLevel;
  description: string;
  involvedNodes: string[];
}

export interface NetworkAnalysis {
  customerId: string;
  graph: CustomerGraph;
  anomalies: NetworkAnomaly[];
  analyzedAt: string;
}

export interface Community {
  communityId: string;
  label: string;
  memberCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
  members: GraphNode[];
}

export interface RiskPropagation {
  customerId: string;
  baseRiskScore: number;
  propagatedRiskScore: number;
  riskLevel: RiskLevel;
  contributingFactors: Array<{
    nodeId: string;
    nodeType: string;
    relationship: string;
    riskContribution: number;
    description: string;
  }>;
}

export function createFraudGraphDomain(callGateway: CallGatewayFn) {
  return {
    fraudGraph: {
      async analyzeNetwork(params: {
        customerId: string;
        depth?: number;
        includeTransactions?: boolean;
      }) {
        return callGateway<NetworkAnalysis>('fraud.graph.analyze', params);
      },

      async getCustomerGraph(params: {
        customerId: string;
        depth?: number;
      }) {
        return callGateway<{ graph: CustomerGraph }>('fraud.graph.network', params);
      },

      async detectCommunities(params?: {
        minCommunitySize?: number;
        riskThreshold?: number;
      }) {
        return callGateway<{ communities: Community[]; totalCommunities: number; analyzedAt: string }>(
          'fraud.graph.communities',
          params ?? {},
        );
      },

      async propagateRisk(params: {
        customerId: string;
        propagationDepth?: number;
      }) {
        return callGateway<RiskPropagation>('fraud.graph.risk', params);
      },

      async ingestTransaction(params: {
        transactionId: string;
        sourceAccountId: string;
        targetAccountId: string;
        amountCents: number;
        timestamp: string;
        metadata?: Record<string, unknown>;
      }) {
        return callGateway<{ success: boolean }>('fraud.graph.ingestTransaction', params);
      },

      async ingestRelationship(params: {
        sourceId: string;
        targetId: string;
        edgeType: string;
        properties?: Record<string, unknown>;
      }) {
        return callGateway<{ success: boolean }>('fraud.graph.ingestRelationship', params);
      },
    },
  };
}
