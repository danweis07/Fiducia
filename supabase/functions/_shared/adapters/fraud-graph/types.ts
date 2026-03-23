/**
 * Fraud Graph Adapter Interface
 *
 * Defines the port for graph-based fraud detection, relationship mapping,
 * and risk network analysis:
 *   - Customer relationship graph traversal
 *   - Network anomaly detection (circular payments, shared devices)
 *   - Community detection (fraud ring identification)
 *   - Risk propagation across connected entities
 *   - Transaction and relationship ingestion into the graph
 *
 * Implementations:
 *   - Neo4j (graph database via HTTP API)
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// GRAPH MODEL TYPES
// =============================================================================

/** Node types in the fraud graph */
export type GraphNodeType =
  | 'customer'
  | 'account'
  | 'transaction'
  | 'device'
  | 'beneficiary'
  | 'watchlist_match';

/** Edge types in the fraud graph */
export type GraphEdgeType =
  | 'has_account'
  | 'sends_to'
  | 'receives_from'
  | 'uses_device'
  | 'matches_watchlist'
  | 'owns_jointly'
  | 'pays_beneficiary';

/** Risk level classification (shared with fraud adapter) */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// =============================================================================
// DATA MODELS
// =============================================================================

/** A node in the fraud graph */
export interface GraphNode {
  /** Unique node identifier */
  id: string;
  /** Node type */
  type: GraphNodeType;
  /** Human-readable label */
  label: string;
  /** Arbitrary properties attached to the node */
  properties: Record<string, unknown>;
}

/** An edge (relationship) in the fraud graph */
export interface GraphEdge {
  /** Unique edge identifier */
  id: string;
  /** Source node ID */
  sourceId: string;
  /** Target node ID */
  targetId: string;
  /** Edge type */
  type: GraphEdgeType;
  /** Arbitrary properties attached to the edge */
  properties: Record<string, unknown>;
  /** When this relationship was created */
  createdAt: string;
}

/** A customer's subgraph with risk scoring */
export interface CustomerGraph {
  /** Customer ID at the center of the graph */
  customerId: string;
  /** All nodes in the subgraph */
  nodes: GraphNode[];
  /** All edges in the subgraph */
  edges: GraphEdge[];
  /** Aggregate risk score (0 - 1000, higher = riskier) */
  riskScore: number;
  /** Risk level classification */
  riskLevel: RiskLevel;
}

/** A detected community (cluster) of related entities */
export interface Community {
  /** Community identifier */
  communityId: string;
  /** Human-readable label */
  label: string;
  /** Number of members in the community */
  memberCount: number;
  /** Aggregate risk score (0 - 1000) */
  riskScore: number;
  /** Risk level classification */
  riskLevel: RiskLevel;
  /** Member nodes */
  members: GraphNode[];
}

// =============================================================================
// NETWORK ANALYSIS TYPES
// =============================================================================

/** Types of network anomalies detected */
export type NetworkAnomalyType =
  | 'circular_payments'
  | 'shared_device'
  | 'rapid_beneficiary'
  | 'high_risk_cluster'
  | string;

/** An anomaly detected in the network graph */
export interface NetworkAnomaly {
  /** Anomaly type */
  type: NetworkAnomalyType;
  /** Severity */
  severity: RiskLevel;
  /** Human-readable description */
  description: string;
  /** Node IDs involved in the anomaly */
  involvedNodes: string[];
}

/** A factor contributing to propagated risk */
export interface RiskContributor {
  /** Node ID contributing risk */
  nodeId: string;
  /** Type of the contributing node */
  nodeType: GraphNodeType;
  /** Relationship path description */
  relationship: string;
  /** Numeric risk contribution (0 - 1000) */
  riskContribution: number;
  /** Human-readable description */
  description: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface AnalyzeNetworkRequest {
  tenantId: string;
  /** Customer to analyze */
  customerId: string;
  /** Traversal depth (1-5, default 2) */
  depth?: number;
  /** Whether to include transaction nodes */
  includeTransactions?: boolean;
}

export interface NetworkAnalysisResult {
  /** Customer at the center of the analysis */
  customerId: string;
  /** The customer's subgraph */
  graph: CustomerGraph;
  /** Detected anomalies */
  anomalies: NetworkAnomaly[];
  /** When the analysis was performed */
  analyzedAt: string;
}

export interface CustomerGraphRequest {
  tenantId: string;
  /** Customer ID */
  customerId: string;
  /** Traversal depth (1-5, default 2) */
  depth?: number;
}

export interface CustomerGraphResponse {
  /** The customer's subgraph */
  graph: CustomerGraph;
}

export interface CommunityDetectionRequest {
  tenantId: string;
  /** Minimum community size to return (default 3) */
  minCommunitySize?: number;
  /** Only return communities above this risk score (0 - 1000) */
  riskThreshold?: number;
}

export interface CommunityDetectionResponse {
  /** Detected communities */
  communities: Community[];
  /** Total number of communities found */
  totalCommunities: number;
  /** When the analysis was performed */
  analyzedAt: string;
}

export interface RiskPropagationRequest {
  tenantId: string;
  /** Customer ID to propagate risk for */
  customerId: string;
  /** How many hops to propagate (default 3) */
  propagationDepth?: number;
}

export interface RiskPropagationResponse {
  /** Customer ID */
  customerId: string;
  /** Customer's own risk score */
  baseRiskScore: number;
  /** Risk score after propagation from connected entities */
  propagatedRiskScore: number;
  /** Overall risk level */
  riskLevel: RiskLevel;
  /** Factors contributing to the propagated risk */
  contributingFactors: RiskContributor[];
}

export interface IngestTransactionRequest {
  tenantId: string;
  /** Transaction ID */
  transactionId: string;
  /** Source account ID */
  sourceAccountId: string;
  /** Target account ID */
  targetAccountId: string;
  /** Amount in cents */
  amountCents: number;
  /** Transaction timestamp (ISO 8601) */
  timestamp: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface IngestRelationshipRequest {
  tenantId: string;
  /** Source entity ID */
  sourceId: string;
  /** Target entity ID */
  targetId: string;
  /** Relationship type */
  edgeType: GraphEdgeType;
  /** Additional properties */
  properties?: Record<string, unknown>;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Fraud graph adapter — abstracts graph-based fraud detection and network analysis.
 *
 * Implementations handle provider-specific graph queries (Neo4j, etc.) while
 * exposing a uniform interface for network analysis, community detection,
 * risk propagation, and graph ingestion.
 */
export interface FraudGraphAdapter extends BaseAdapter {
  /** Analyze a customer's network for fraud patterns and anomalies */
  analyzeNetwork(request: AnalyzeNetworkRequest): Promise<NetworkAnalysisResult>;

  /** Retrieve a customer's relationship graph */
  getCustomerGraph(request: CustomerGraphRequest): Promise<CustomerGraphResponse>;

  /** Detect communities (clusters) of related entities, flagging suspicious ones */
  detectCommunities(request: CommunityDetectionRequest): Promise<CommunityDetectionResponse>;

  /** Propagate risk scores across a customer's network connections */
  propagateRisk(request: RiskPropagationRequest): Promise<RiskPropagationResponse>;

  /** Ingest a transaction into the fraud graph */
  ingestTransaction(request: IngestTransactionRequest): Promise<void>;

  /** Ingest a relationship edge into the fraud graph */
  ingestRelationship(request: IngestRelationshipRequest): Promise<void>;
}
