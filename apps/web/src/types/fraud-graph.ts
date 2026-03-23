/**
 * Fraud Graph Types
 *
 * Frontend type definitions for graph-based fraud detection,
 * relationship mapping, and risk network analysis.
 */

/** Node types in the fraud detection graph */
export type GraphNodeType =
  | "customer"
  | "account"
  | "transaction"
  | "device"
  | "beneficiary"
  | "watchlist_match";

/** Edge types in the fraud detection graph */
export type GraphEdgeType =
  | "has_account"
  | "sends_to"
  | "receives_from"
  | "uses_device"
  | "matches_watchlist"
  | "owns_jointly"
  | "pays_beneficiary";

/** Risk level classification */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/** A node in the fraud graph */
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  properties: Record<string, unknown>;
}

/** An edge (relationship) in the fraud graph */
export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: GraphEdgeType;
  properties: Record<string, unknown>;
  createdAt: string;
}

/** A customer's relationship graph */
export interface CustomerGraph {
  customerId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  riskScore: number;
  riskLevel: RiskLevel;
}

/** A detected anomaly in the relationship network */
export interface NetworkAnomaly {
  type: string;
  severity: RiskLevel;
  description: string;
  involvedNodes: string[];
}

/** Result of network analysis for a customer */
export interface NetworkAnalysisResult {
  customerId: string;
  graph: CustomerGraph;
  anomalies: NetworkAnomaly[];
  analyzedAt: string;
}

/** A detected community (cluster) in the graph */
export interface Community {
  communityId: string;
  label: string;
  memberCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
  members: GraphNode[];
}

/** A factor contributing to propagated risk */
export interface RiskContributor {
  nodeId: string;
  nodeType: GraphNodeType;
  relationship: string;
  riskContribution: number;
  description: string;
}

/** Result of risk propagation analysis */
export interface RiskPropagationResult {
  customerId: string;
  baseRiskScore: number;
  propagatedRiskScore: number;
  riskLevel: RiskLevel;
  contributingFactors: RiskContributor[];
}
