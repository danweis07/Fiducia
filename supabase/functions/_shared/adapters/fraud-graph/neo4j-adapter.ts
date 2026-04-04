/**
 * Neo4j Fraud Graph Adapter
 *
 * Connects to a Neo4j graph database via its HTTP transaction API to perform
 * graph-based fraud detection, network analysis, community detection, and
 * risk propagation.
 *
 * Environment variables:
 *   - NEO4J_URI: Neo4j HTTP endpoint (e.g. https://neo4j.example.com:7474)
 *   - NEO4J_USER: Neo4j username (default: neo4j)
 *   - NEO4J_PASSWORD: Neo4j password
 *
 * TODO: This adapter is provisional — Cypher queries and response mappings
 * should be validated against a real Neo4j instance before production use.
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
  RiskContributor,
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
  GraphNodeType,
} from './types.ts';

// =============================================================================
// HELPERS
// =============================================================================

interface Neo4jStatement {
  statement: string;
  parameters: Record<string, unknown>;
}

interface Neo4jResult {
  columns: string[];
  data: Array<{ row: unknown[]; meta: unknown[] }>;
}

interface Neo4jResponse {
  results: Neo4jResult[];
  errors: Array<{ code: string; message: string }>;
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 800) return 'critical';
  if (score >= 600) return 'high';
  if (score >= 300) return 'medium';
  return 'low';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class Neo4jFraudGraphAdapter implements FraudGraphAdapter {
  readonly config: AdapterConfig = {
    id: 'neo4j-fraud-graph',
    name: 'Neo4j Fraud Graph Adapter',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private get uri(): string {
    const uri = Deno.env.get('NEO4J_URI') ?? 'http://localhost:7474';
    if (!uri.startsWith('http://localhost') && !uri.startsWith('https://') && !uri.startsWith('bolt+s://') && !uri.startsWith('neo4j+s://')) {
      console.warn('[Neo4j] WARNING: Using unencrypted connection to non-localhost host. Use HTTPS or bolt+s:// in production.');
    }
    return uri;
  }

  private get user(): string {
    return Deno.env.get('NEO4J_USER') ?? 'neo4j';
  }

  private get password(): string {
    return Deno.env.get('NEO4J_PASSWORD') ?? '';
  }

  private get authHeader(): string {
    const encoded = btoa(`${this.user}:${this.password}`);
    return `Basic ${encoded}`;
  }

  private get commitUrl(): string {
    return `${this.uri}/db/neo4j/tx/commit`;
  }

  // ---------------------------------------------------------------------------
  // HTTP TRANSPORT
  // ---------------------------------------------------------------------------

  private async execute(statements: Neo4jStatement[]): Promise<Neo4jResponse> {
    const response = await fetch(this.commitUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ statements }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Neo4j HTTP error ${response.status}: ${body}`);
    }

    const result = (await response.json()) as Neo4jResponse;

    if (result.errors.length > 0) {
      const messages = result.errors.map(e => `${e.code}: ${e.message}`).join('; ');
      throw new Error(`Neo4j query error: ${messages}`);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // HEALTH CHECK
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    try {
      await this.execute([{ statement: 'RETURN 1 AS ok', parameters: {} }]);
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // ANALYZE NETWORK
  // ---------------------------------------------------------------------------

  async analyzeNetwork(request: AnalyzeNetworkRequest): Promise<NetworkAnalysisResult> {
    const depth = Math.min(request.depth ?? 2, 5);

    const graphResponse = await this.getCustomerGraph({
      tenantId: request.tenantId,
      customerId: request.customerId,
      depth,
    });

    const { graph } = graphResponse;

    // Detect anomalies via separate Cypher queries
    const anomalies: NetworkAnomaly[] = [];

    // Circular payment detection
    const circularResult = await this.execute([{
      statement: `
        MATCH (a:Account)-[:SENDS_TO]->(b:Account)-[:SENDS_TO]->(c:Account)-[:SENDS_TO]->(a)
        WHERE EXISTS {
          MATCH (cust:Customer {id: $customerId, tenantId: $tenantId})-[:HAS_ACCOUNT]->(a)
        }
        RETURN DISTINCT a.id AS aid, b.id AS bid, c.id AS cid
        LIMIT 10
      `,
      parameters: { customerId: request.customerId, tenantId: request.tenantId },
    }]);

    if (circularResult.results[0]?.data.length > 0) {
      const involvedNodes = new Set<string>();
      for (const row of circularResult.results[0].data) {
        involvedNodes.add(row.row[0] as string);
        involvedNodes.add(row.row[1] as string);
        involvedNodes.add(row.row[2] as string);
      }
      anomalies.push({
        type: 'circular_payments',
        severity: 'critical',
        description: 'Circular payment pattern detected — funds cycle through multiple accounts',
        involvedNodes: [...involvedNodes],
      });
    }

    // Shared device detection
    const sharedDeviceResult = await this.execute([{
      statement: `
        MATCH (c1:Customer {id: $customerId, tenantId: $tenantId})-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(c2:Customer)
        WHERE c1 <> c2
        RETURN d.id AS deviceId, collect(DISTINCT c2.id) AS otherCustomers
      `,
      parameters: { customerId: request.customerId, tenantId: request.tenantId },
    }]);

    for (const row of sharedDeviceResult.results[0]?.data ?? []) {
      const deviceId = row.row[0] as string;
      const otherCustomers = row.row[1] as string[];
      anomalies.push({
        type: 'shared_device',
        severity: 'high',
        description: `Device shared with ${otherCustomers.length} other customer(s)`,
        involvedNodes: [deviceId, request.customerId, ...otherCustomers],
      });
    }

    return {
      customerId: request.customerId,
      graph,
      anomalies,
      analyzedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // GET CUSTOMER GRAPH
  // ---------------------------------------------------------------------------

  async getCustomerGraph(request: CustomerGraphRequest): Promise<CustomerGraphResponse> {
    const depth = Math.min(request.depth ?? 2, 5);

    const result = await this.execute([{
      statement: `
        MATCH path = (c:Customer {id: $customerId, tenantId: $tenantId})-[*1..${depth}]-(related)
        WITH nodes(path) AS ns, relationships(path) AS rs
        UNWIND ns AS n
        WITH DISTINCT n, rs
        RETURN
          n.id AS nodeId,
          labels(n)[0] AS nodeType,
          COALESCE(n.label, n.name, n.id) AS label,
          properties(n) AS props
      `,
      parameters: { customerId: request.customerId, tenantId: request.tenantId },
    }, {
      statement: `
        MATCH path = (c:Customer {id: $customerId, tenantId: $tenantId})-[*1..${depth}]-(related)
        WITH relationships(path) AS rs
        UNWIND rs AS r
        WITH DISTINCT r
        RETURN
          elementId(r) AS edgeId,
          startNode(r).id AS sourceId,
          endNode(r).id AS targetId,
          type(r) AS edgeType,
          properties(r) AS props,
          COALESCE(r.createdAt, '') AS createdAt
      `,
      parameters: { customerId: request.customerId, tenantId: request.tenantId },
    }]);

    const nodes: GraphNode[] = (result.results[0]?.data ?? []).map(row => ({
      id: row.row[0] as string,
      type: this.mapLabelToNodeType(row.row[1] as string),
      label: row.row[2] as string,
      properties: row.row[3] as Record<string, unknown>,
    }));

    const edges: GraphEdge[] = (result.results[1]?.data ?? []).map(row => ({
      id: row.row[0] as string,
      sourceId: row.row[1] as string,
      targetId: row.row[2] as string,
      type: this.mapRelTypeToEdgeType(row.row[3] as string),
      properties: row.row[4] as Record<string, unknown>,
      createdAt: row.row[5] as string,
    }));

    // Compute risk score from graph properties
    const riskScore = await this.computeRiskScore(request.tenantId, request.customerId);

    const graph: CustomerGraph = {
      customerId: request.customerId,
      nodes,
      edges,
      riskScore,
      riskLevel: riskLevelFromScore(riskScore),
    };

    return { graph };
  }

  // ---------------------------------------------------------------------------
  // DETECT COMMUNITIES
  // ---------------------------------------------------------------------------

  async detectCommunities(request: CommunityDetectionRequest): Promise<CommunityDetectionResponse> {
    const minSize = request.minCommunitySize ?? 3;
    const threshold = request.riskThreshold ?? 0;

    // Use connected components via a simplified traversal approach
    const result = await this.execute([{
      statement: `
        MATCH (c:Customer {tenantId: $tenantId})-[*1..3]-(related:Customer {tenantId: $tenantId})
        WITH c, collect(DISTINCT related) AS connected
        WHERE size(connected) + 1 >= $minSize
        WITH c, connected, reduce(s = 0, n IN connected | s + COALESCE(n.riskScore, 0)) AS totalRisk
        WITH c, connected, totalRisk, (totalRisk / (size(connected) + 1)) AS avgRisk
        WHERE avgRisk >= $threshold
        RETURN
          c.id AS centerId,
          [n IN connected | n.id] AS memberIds,
          [n IN connected | COALESCE(n.label, n.name, n.id)] AS memberLabels,
          size(connected) + 1 AS memberCount,
          avgRisk AS riskScore
        ORDER BY riskScore DESC
        LIMIT 50
      `,
      parameters: { tenantId: request.tenantId, minSize, threshold },
    }]);

    const communities: Community[] = (result.results[0]?.data ?? []).map((row, idx) => {
      const centerId = row.row[0] as string;
      const memberIds = row.row[1] as string[];
      const memberLabels = row.row[2] as string[];
      const memberCount = row.row[3] as number;
      const riskScore = row.row[4] as number;

      const members: GraphNode[] = [
        { id: centerId, type: 'customer', label: centerId, properties: {} },
        ...memberIds.map((id, i) => ({
          id,
          type: 'customer' as GraphNodeType,
          label: memberLabels[i] ?? id,
          properties: {},
        })),
      ];

      return {
        communityId: `comm-${idx + 1}`,
        label: riskScore >= 600 ? `High-risk cluster #${idx + 1}` : `Community #${idx + 1}`,
        memberCount,
        riskScore,
        riskLevel: riskLevelFromScore(riskScore),
        members,
      };
    });

    return {
      communities,
      totalCommunities: communities.length,
      analyzedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // RISK PROPAGATION
  // ---------------------------------------------------------------------------

  async propagateRisk(request: RiskPropagationRequest): Promise<RiskPropagationResponse> {
    const propagationDepth = request.propagationDepth ?? 3;

    // Get the customer's own risk score
    const baseResult = await this.execute([{
      statement: `
        MATCH (c:Customer {id: $customerId, tenantId: $tenantId})
        RETURN COALESCE(c.riskScore, 0) AS baseRisk
      `,
      parameters: { customerId: request.customerId, tenantId: request.tenantId },
    }]);

    const baseRiskScore = (baseResult.results[0]?.data[0]?.row[0] as number) ?? 0;

    // Traverse neighbors and aggregate risk contributions
    const neighborResult = await this.execute([{
      statement: `
        MATCH path = (c:Customer {id: $customerId, tenantId: $tenantId})-[r*1..${propagationDepth}]-(neighbor)
        WHERE neighbor <> c AND (neighbor:Customer OR neighbor:Device OR neighbor:Beneficiary)
        WITH neighbor,
             labels(neighbor)[0] AS nodeLabel,
             type(last(relationships(path))) AS relType,
             length(path) AS distance,
             COALESCE(neighbor.riskScore, 0) AS nRisk
        RETURN DISTINCT
          neighbor.id AS nodeId,
          nodeLabel,
          relType,
          distance,
          nRisk,
          COALESCE(neighbor.label, neighbor.name, neighbor.id) AS description
        ORDER BY nRisk DESC
        LIMIT 20
      `,
      parameters: { customerId: request.customerId, tenantId: request.tenantId },
    }]);

    const contributingFactors: RiskContributor[] = [];
    let totalContribution = 0;

    for (const row of neighborResult.results[0]?.data ?? []) {
      const nodeId = row.row[0] as string;
      const nodeLabel = row.row[1] as string;
      const relType = row.row[2] as string;
      const distance = row.row[3] as number;
      const nRisk = row.row[4] as number;
      const description = row.row[5] as string;

      // Decay risk contribution by distance
      const decayFactor = 1 / Math.pow(2, distance - 1);
      const contribution = Math.round(nRisk * decayFactor * 0.3);

      if (contribution > 0) {
        contributingFactors.push({
          nodeId,
          nodeType: this.mapLabelToNodeType(nodeLabel),
          relationship: this.mapRelTypeToEdgeType(relType),
          riskContribution: contribution,
          description: `${description} (${distance} hop${distance > 1 ? 's' : ''} away)`,
        });
        totalContribution += contribution;
      }
    }

    const propagatedRiskScore = Math.min(1000, baseRiskScore + totalContribution);

    return {
      customerId: request.customerId,
      baseRiskScore,
      propagatedRiskScore,
      riskLevel: riskLevelFromScore(propagatedRiskScore),
      contributingFactors,
    };
  }

  // ---------------------------------------------------------------------------
  // INGESTION
  // ---------------------------------------------------------------------------

  async ingestTransaction(request: IngestTransactionRequest): Promise<void> {
    await this.execute([{
      statement: `
        MERGE (src:Account {id: $sourceAccountId, tenantId: $tenantId})
        MERGE (tgt:Account {id: $targetAccountId, tenantId: $tenantId})
        MERGE (tx:Transaction {id: $transactionId, tenantId: $tenantId})
        SET tx.amountCents = $amountCents,
            tx.timestamp = $timestamp,
            tx.metadata = $metadata
        MERGE (src)-[:SENDS_TO]->(tgt)
        MERGE (src)-[:HAS_TRANSACTION]->(tx)
        MERGE (tx)-[:TARGETS]->(tgt)
      `,
      parameters: {
        tenantId: request.tenantId,
        transactionId: request.transactionId,
        sourceAccountId: request.sourceAccountId,
        targetAccountId: request.targetAccountId,
        amountCents: request.amountCents,
        timestamp: request.timestamp,
        metadata: JSON.stringify(request.metadata ?? {}),
      },
    }]);
  }

  async ingestRelationship(request: IngestRelationshipRequest): Promise<void> {
    const neo4jRelType = this.edgeTypeToRelType(request.edgeType);

    await this.execute([{
      statement: `
        MERGE (src {id: $sourceId, tenantId: $tenantId})
        MERGE (tgt {id: $targetId, tenantId: $tenantId})
        CREATE (src)-[r:${neo4jRelType} {createdAt: datetime()}]->(tgt)
        SET r += $properties
      `,
      parameters: {
        tenantId: request.tenantId,
        sourceId: request.sourceId,
        targetId: request.targetId,
        properties: request.properties ?? {},
      },
    }]);
  }

  // ---------------------------------------------------------------------------
  // MAPPING HELPERS
  // ---------------------------------------------------------------------------

  private mapLabelToNodeType(label: string): GraphNodeType {
    const map: Record<string, GraphNodeType> = {
      Customer: 'customer',
      Account: 'account',
      Transaction: 'transaction',
      Device: 'device',
      Beneficiary: 'beneficiary',
      WatchlistMatch: 'watchlist_match',
    };
    return map[label] ?? 'customer';
  }

  private mapRelTypeToEdgeType(relType: string): string {
    const map: Record<string, string> = {
      HAS_ACCOUNT: 'has_account',
      SENDS_TO: 'sends_to',
      RECEIVES_FROM: 'receives_from',
      USES_DEVICE: 'uses_device',
      MATCHES_WATCHLIST: 'matches_watchlist',
      OWNS_JOINTLY: 'owns_jointly',
      PAYS_BENEFICIARY: 'pays_beneficiary',
    };
    return map[relType] ?? relType.toLowerCase();
  }

  private edgeTypeToRelType(edgeType: string): string {
    return edgeType.toUpperCase();
  }

  private async computeRiskScore(tenantId: string, customerId: string): Promise<number> {
    const result = await this.execute([{
      statement: `
        MATCH (c:Customer {id: $customerId, tenantId: $tenantId})
        OPTIONAL MATCH (c)-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(other:Customer)
        WHERE other <> c
        WITH c, count(DISTINCT other) AS sharedDeviceCount
        OPTIONAL MATCH (c)-[:PAYS_BENEFICIARY]->(b:Beneficiary)
        WITH c, sharedDeviceCount, count(DISTINCT b) AS beneficiaryCount
        RETURN
          COALESCE(c.riskScore, 0) +
          (sharedDeviceCount * 150) +
          (beneficiaryCount * 50) AS computedRisk
      `,
      parameters: { customerId, tenantId },
    }]);

    const score = (result.results[0]?.data[0]?.row[0] as number) ?? 0;
    return Math.min(1000, score);
  }
}
