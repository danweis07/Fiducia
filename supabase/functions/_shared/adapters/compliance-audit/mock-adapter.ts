/**
 * Mock Compliance Audit Adapter
 *
 * Sandbox implementation for development and demo mode.
 * Simulates evidence syncing and compliance status checks.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  ComplianceAuditAdapter,
  SyncEvidenceRequest,
  SyncEvidenceResponse,
  ReportIncidentRequest,
  ReportIncidentResponse,
  GetComplianceStatusRequest,
  ComplianceStatusResponse,
  ListSyncHistoryRequest,
  ListSyncHistoryResponse,
  TestConnectionRequest,
  TestConnectionResponse,
} from './types.ts';

// In-memory store for sandbox
const syncHistory: Array<{ batchId: string; syncedAt: string; recordCount: number; syncedCount: number; failedCount: number; status: 'synced' | 'failed' }> = [];

export class MockComplianceAuditAdapter implements ComplianceAuditAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock Compliance Audit (Sandbox)',
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
    };
  }

  async syncEvidence(request: SyncEvidenceRequest): Promise<SyncEvidenceResponse> {
    const batchId = `batch_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const count = request.records.length;

    syncHistory.push({
      batchId,
      syncedAt: new Date().toISOString(),
      recordCount: count,
      syncedCount: count,
      failedCount: 0,
      status: 'synced',
    });

    return {
      syncedCount: count,
      failedCount: 0,
      skippedCount: 0,
      batchId,
    };
  }

  async reportIncident(request: ReportIncidentRequest): Promise<ReportIncidentResponse> {
    return {
      providerIncidentId: `mock_inc_${request.incidentId}`,
      accepted: true,
      dashboardUrl: `https://mock-compliance.example.com/incidents/mock_inc_${request.incidentId}`,
    };
  }

  async getComplianceStatus(_request: GetComplianceStatusRequest): Promise<ComplianceStatusResponse> {
    return {
      overallStatus: 'compliant',
      frameworks: [
        {
          framework: 'SOC2',
          status: 'compliant',
          controlsPassingPct: 96,
          openFindings: 2,
          lastSyncAt: new Date().toISOString(),
        },
        {
          framework: 'GLBA',
          status: 'compliant',
          controlsPassingPct: 100,
          openFindings: 0,
          lastSyncAt: new Date().toISOString(),
        },
        {
          framework: 'NCUA',
          status: 'at_risk',
          controlsPassingPct: 88,
          openFindings: 4,
          lastSyncAt: new Date().toISOString(),
        },
      ],
      provider: 'mock',
    };
  }

  async listSyncHistory(request: ListSyncHistoryRequest): Promise<ListSyncHistoryResponse> {
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 50;
    const filtered = request.status
      ? syncHistory.filter((e) => e.status === request.status)
      : syncHistory;
    const page = filtered.slice(offset, offset + limit);

    return {
      entries: page.map((e) => ({ ...e, provider: 'mock' })),
      total: filtered.length,
    };
  }

  async testConnection(_request: TestConnectionRequest): Promise<TestConnectionResponse> {
    return {
      connected: true,
      provider: 'mock',
      providerAccountName: 'Mock Compliance (Sandbox)',
      apiVersion: '1.0.0',
    };
  }
}
