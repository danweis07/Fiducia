/**
 * Mock Fraud Graph Adapter
 *
 * Returns synthetic graph-based fraud detection data for sandbox/testing
 * when no Neo4j or other graph database credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  FraudGraphAdapter,
  GraphNode,
  GraphEdge,
  CustomerGraph,
  Community,
  NetworkAnomaly,
  RiskLevel,
  AnalyzeNetworkRequest,
  NetworkAnalysisResult,
  CustomerGraphRequest,
  CustomerGraphResponse,
  CommunityDetectionRequest,
  CommunityDetectionResponse,
  RiskPropagationRequest,
  RiskPropagationResponse,
  IngestTransactionRequest,
  IngestRelationshipRequest,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 800) return 'critical';
  if (score >= 600) return 'high';
  if (score >= 300) return 'medium';
  return 'low';
}

function mockCustomerNodes(): GraphNode[] {
  return [
    { id: 'cust-001', type: 'customer', label: 'Alice Johnson', properties: { memberSince: '2020-01-15' } },
    { id: 'cust-002', type: 'customer', label: 'Bob Smith', properties: { memberSince: '2019-06-20' } },
    { id: 'cust-003', type: 'customer', label: 'Carol Davis', properties: { memberSince: '2021-03-10' } },
    { id: 'cust-004', type: 'customer', label: 'Dan Wilson', properties: { memberSince: '2022-08-01' } },
    { id: 'cust-005', type: 'customer', label: 'Eve Martinez', properties: { memberSince: '2023-01-12' } },
    { id: 'cust-006', type: 'customer', label: 'Frank Lee', properties: { memberSince: '2021-11-30' } },
    { id: 'cust-007', type: 'customer', label: 'Grace Chen', properties: { memberSince: '2020-07-22' } },
    { id: 'cust-008', type: 'customer', label: 'Hank Brown', properties: { memberSince: '2024-02-14' } },
  ];
}

function mockAccountNodes(): GraphNode[] {
  return [
    { id: 'acct-001', type: 'account', label: 'Checking *4521', properties: { accountType: 'checking' } },
    { id: 'acct-002', type: 'account', label: 'Savings *8734', properties: { accountType: 'savings' } },
    { id: 'acct-003', type: 'account', label: 'Checking *1199', properties: { accountType: 'checking' } },
    { id: 'acct-004', type: 'account', label: 'Checking *5567', properties: { accountType: 'checking' } },
    { id: 'acct-005', type: 'account', label: 'Savings *3320', properties: { accountType: 'savings' } },
    { id: 'acct-006', type: 'account', label: 'Checking *7788', properties: { accountType: 'checking' } },
    { id: 'acct-007', type: 'account', label: 'Checking *9012', properties: { accountType: 'checking' } },
    { id: 'acct-008', type: 'account', label: 'Checking *3456', properties: { accountType: 'checking' } },
    { id: 'acct-009', type: 'account', label: 'Savings *6543', properties: { accountType: 'savings' } },
    { id: 'acct-010', type: 'account', label: 'Checking *2200', properties: { accountType: 'checking' } },
    { id: 'acct-011', type: 'account', label: 'Checking *4411', properties: { accountType: 'checking' } },
    { id: 'acct-012', type: 'account', label: 'Savings *5500', properties: { accountType: 'savings' } },
  ];
}

function mockDeviceNodes(): GraphNode[] {
  return [
    { id: 'dev-001', type: 'device', label: 'iPhone 15 Pro', properties: { os: 'iOS 17', fingerprint: 'fp-aaa111' } },
    { id: 'dev-002', type: 'device', label: 'Samsung Galaxy S24', properties: { os: 'Android 14', fingerprint: 'fp-bbb222' } },
    { id: 'dev-003', type: 'device', label: 'Chrome on Windows', properties: { os: 'Windows 11', fingerprint: 'fp-ccc333' } },
    { id: 'dev-shared', type: 'device', label: 'Firefox on Linux', properties: { os: 'Ubuntu 22', fingerprint: 'fp-ddd444' } },
  ];
}

function mockBeneficiaryNodes(): GraphNode[] {
  return [
    { id: 'ben-001', type: 'beneficiary', label: 'Offshore Corp Ltd', properties: { country: 'CY' } },
    { id: 'ben-002', type: 'beneficiary', label: 'Local Charity', properties: { country: 'US' } },
  ];
}

function mockEdges(): GraphEdge[] {
  const now = new Date().toISOString();
  return [
    // Customer -> Account ownership
    { id: 'e-001', sourceId: 'cust-001', targetId: 'acct-001', type: 'has_account', properties: {}, createdAt: '2020-01-15T00:00:00Z' },
    { id: 'e-002', sourceId: 'cust-001', targetId: 'acct-002', type: 'has_account', properties: {}, createdAt: '2020-01-15T00:00:00Z' },
    { id: 'e-003', sourceId: 'cust-002', targetId: 'acct-003', type: 'has_account', properties: {}, createdAt: '2019-06-20T00:00:00Z' },
    { id: 'e-004', sourceId: 'cust-003', targetId: 'acct-004', type: 'has_account', properties: {}, createdAt: '2021-03-10T00:00:00Z' },
    { id: 'e-005', sourceId: 'cust-004', targetId: 'acct-005', type: 'has_account', properties: {}, createdAt: '2022-08-01T00:00:00Z' },
    { id: 'e-006', sourceId: 'cust-005', targetId: 'acct-006', type: 'has_account', properties: {}, createdAt: '2023-01-12T00:00:00Z' },
    { id: 'e-007', sourceId: 'cust-006', targetId: 'acct-007', type: 'has_account', properties: {}, createdAt: '2021-11-30T00:00:00Z' },
    { id: 'e-008', sourceId: 'cust-007', targetId: 'acct-008', type: 'has_account', properties: {}, createdAt: '2020-07-22T00:00:00Z' },
    { id: 'e-009', sourceId: 'cust-008', targetId: 'acct-009', type: 'has_account', properties: {}, createdAt: '2024-02-14T00:00:00Z' },
    // Joint account (cust-001 and cust-002 share acct-010)
    { id: 'e-010', sourceId: 'cust-001', targetId: 'acct-010', type: 'owns_jointly', properties: {}, createdAt: '2020-03-01T00:00:00Z' },
    { id: 'e-011', sourceId: 'cust-002', targetId: 'acct-010', type: 'owns_jointly', properties: {}, createdAt: '2020-03-01T00:00:00Z' },
    // Device usage
    { id: 'e-012', sourceId: 'cust-001', targetId: 'dev-001', type: 'uses_device', properties: {}, createdAt: '2024-01-10T00:00:00Z' },
    { id: 'e-013', sourceId: 'cust-002', targetId: 'dev-002', type: 'uses_device', properties: {}, createdAt: '2024-02-15T00:00:00Z' },
    { id: 'e-014', sourceId: 'cust-003', targetId: 'dev-003', type: 'uses_device', properties: {}, createdAt: '2024-03-20T00:00:00Z' },
    // Shared device — suspicious: cust-005 and cust-006 use the same device
    { id: 'e-015', sourceId: 'cust-005', targetId: 'dev-shared', type: 'uses_device', properties: {}, createdAt: '2024-06-01T00:00:00Z' },
    { id: 'e-016', sourceId: 'cust-006', targetId: 'dev-shared', type: 'uses_device', properties: {}, createdAt: '2024-06-05T00:00:00Z' },
    // Transfer patterns — circular: acct-006 -> acct-007 -> acct-009 -> acct-006
    { id: 'e-017', sourceId: 'acct-006', targetId: 'acct-007', type: 'sends_to', properties: { amountCents: 500000 }, createdAt: now },
    { id: 'e-018', sourceId: 'acct-007', targetId: 'acct-009', type: 'sends_to', properties: { amountCents: 490000 }, createdAt: now },
    { id: 'e-019', sourceId: 'acct-009', targetId: 'acct-006', type: 'sends_to', properties: { amountCents: 480000 }, createdAt: now },
    // Beneficiary relationships
    { id: 'e-020', sourceId: 'cust-005', targetId: 'ben-001', type: 'pays_beneficiary', properties: { frequency: 'weekly' }, createdAt: '2024-05-01T00:00:00Z' },
    { id: 'e-021', sourceId: 'cust-001', targetId: 'ben-002', type: 'pays_beneficiary', properties: { frequency: 'monthly' }, createdAt: '2023-12-01T00:00:00Z' },
  ];
}

function buildGraphForCustomer(customerId: string, depth: number): CustomerGraph {
  const allNodes = [
    ...mockCustomerNodes(),
    ...mockAccountNodes(),
    ...mockDeviceNodes(),
    ...mockBeneficiaryNodes(),
  ];
  const allEdges = mockEdges();

  // BFS from the customer node up to the requested depth
  const visitedNodeIds = new Set<string>([customerId]);
  let frontier = new Set<string>([customerId]);

  for (let d = 0; d < Math.min(depth, 5); d++) {
    const nextFrontier = new Set<string>();
    for (const edge of allEdges) {
      if (frontier.has(edge.sourceId) && !visitedNodeIds.has(edge.targetId)) {
        nextFrontier.add(edge.targetId);
        visitedNodeIds.add(edge.targetId);
      }
      if (frontier.has(edge.targetId) && !visitedNodeIds.has(edge.sourceId)) {
        nextFrontier.add(edge.sourceId);
        visitedNodeIds.add(edge.sourceId);
      }
    }
    frontier = nextFrontier;
  }

  const nodes = allNodes.filter(n => visitedNodeIds.has(n.id));
  const edges = allEdges.filter(e => visitedNodeIds.has(e.sourceId) && visitedNodeIds.has(e.targetId));

  // Suspicious customers get higher risk
  const suspiciousIds = ['cust-005', 'cust-006', 'cust-008'];
  const isSuspicious = suspiciousIds.includes(customerId);
  const riskScore = isSuspicious ? 720 : 150;

  return {
    customerId,
    nodes,
    edges,
    riskScore,
    riskLevel: riskLevelFromScore(riskScore),
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MockFraudGraphAdapter implements FraudGraphAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-fraud-graph',
    name: 'Mock Fraud Graph Adapter',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
      errorMessage: 'Running in sandbox mode',
    };
  }

  async analyzeNetwork(request: AnalyzeNetworkRequest): Promise<NetworkAnalysisResult> {
    const depth = request.depth ?? 2;
    const graph = buildGraphForCustomer(request.customerId, depth);

    const anomalies: NetworkAnomaly[] = [];

    // Check for shared device anomaly
    const deviceEdges = graph.edges.filter(e => e.type === 'uses_device');
    const deviceUsers = new Map<string, string[]>();
    for (const edge of deviceEdges) {
      const users = deviceUsers.get(edge.targetId) ?? [];
      users.push(edge.sourceId);
      deviceUsers.set(edge.targetId, users);
    }
    for (const [deviceId, users] of deviceUsers) {
      if (users.length > 1) {
        anomalies.push({
          type: 'shared_device',
          severity: 'high',
          description: `Multiple customers (${users.length}) share the same device`,
          involvedNodes: [deviceId, ...users],
        });
      }
    }

    // Check for circular payment patterns
    const sendEdges = graph.edges.filter(e => e.type === 'sends_to');
    if (sendEdges.length >= 3) {
      const senders = new Set(sendEdges.map(e => e.sourceId));
      const receivers = new Set(sendEdges.map(e => e.targetId));
      const circular = [...senders].filter(s => receivers.has(s));
      if (circular.length > 0) {
        anomalies.push({
          type: 'circular_payments',
          severity: 'critical',
          description: 'Circular payment pattern detected — funds cycle through multiple accounts',
          involvedNodes: [...new Set([...sendEdges.map(e => e.sourceId), ...sendEdges.map(e => e.targetId)])],
        });
      }
    }

    return {
      customerId: request.customerId,
      graph,
      anomalies,
      analyzedAt: new Date().toISOString(),
    };
  }

  async getCustomerGraph(request: CustomerGraphRequest): Promise<CustomerGraphResponse> {
    const depth = request.depth ?? 2;
    const graph = buildGraphForCustomer(request.customerId, depth);
    return { graph };
  }

  async detectCommunities(request: CommunityDetectionRequest): Promise<CommunityDetectionResponse> {
    const minSize = request.minCommunitySize ?? 3;
    const threshold = request.riskThreshold ?? 0;

    const communities: Community[] = [
      {
        communityId: 'comm-001',
        label: 'Family cluster (low risk)',
        memberCount: 4,
        riskScore: 80,
        riskLevel: 'low',
        members: [
          { id: 'cust-001', type: 'customer', label: 'Alice Johnson', properties: {} },
          { id: 'cust-002', type: 'customer', label: 'Bob Smith', properties: {} },
          { id: 'cust-003', type: 'customer', label: 'Carol Davis', properties: {} },
          { id: 'cust-007', type: 'customer', label: 'Grace Chen', properties: {} },
        ],
      },
      {
        communityId: 'comm-002',
        label: 'Suspicious cluster (high risk)',
        memberCount: 3,
        riskScore: 750,
        riskLevel: 'high',
        members: [
          { id: 'cust-005', type: 'customer', label: 'Eve Martinez', properties: {} },
          { id: 'cust-006', type: 'customer', label: 'Frank Lee', properties: {} },
          { id: 'cust-008', type: 'customer', label: 'Hank Brown', properties: {} },
        ],
      },
    ];

    const filtered = communities.filter(
      c => c.memberCount >= minSize && c.riskScore >= threshold
    );

    return {
      communities: filtered,
      totalCommunities: filtered.length,
      analyzedAt: new Date().toISOString(),
    };
  }

  async propagateRisk(request: RiskPropagationRequest): Promise<RiskPropagationResponse> {
    const _depth = request.propagationDepth ?? 3;

    // Suspicious customers have higher base scores
    const suspiciousIds = ['cust-005', 'cust-006', 'cust-008'];
    const isSuspicious = suspiciousIds.includes(request.customerId);
    const baseRiskScore = isSuspicious ? 650 : 120;

    const contributingFactors: RiskPropagationResponse['contributingFactors'] = [];

    if (isSuspicious) {
      contributingFactors.push(
        {
          nodeId: 'dev-shared',
          nodeType: 'device',
          relationship: 'uses_device',
          riskContribution: 180,
          description: 'Shares a device with another high-risk customer',
        },
        {
          nodeId: 'ben-001',
          nodeType: 'beneficiary',
          relationship: 'pays_beneficiary',
          riskContribution: 120,
          description: 'Regular payments to offshore beneficiary',
        },
      );
    } else {
      contributingFactors.push({
        nodeId: 'cust-002',
        nodeType: 'customer',
        relationship: 'owns_jointly',
        riskContribution: 30,
        description: 'Joint account holder with low-risk customer',
      });
    }

    const totalContribution = contributingFactors.reduce((sum, f) => sum + f.riskContribution, 0);
    const propagatedRiskScore = Math.min(1000, baseRiskScore + totalContribution);

    return {
      customerId: request.customerId,
      baseRiskScore,
      propagatedRiskScore,
      riskLevel: riskLevelFromScore(propagatedRiskScore),
      contributingFactors,
    };
  }

  async ingestTransaction(_request: IngestTransactionRequest): Promise<void> {
    // Mock: no-op — in sandbox mode transactions are not persisted to a graph
  }

  async ingestRelationship(_request: IngestRelationshipRequest): Promise<void> {
    // Mock: no-op — in sandbox mode relationships are not persisted to a graph
  }
}
