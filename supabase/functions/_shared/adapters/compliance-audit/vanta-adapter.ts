// TODO: Provisional integration — not yet validated in production.
/**
 * Vanta Compliance Audit Adapter
 *
 * Pushes audit evidence, incidents, and compliance status to Vanta's API.
 * Vanta provides automated security monitoring for SOC 2, HIPAA, ISO 27001, etc.
 *
 * Environment variables required:
 * - VANTA_API_TOKEN: Bearer token for Vanta API authentication
 * - VANTA_BASE_URL: API base URL (default: https://api.vanta.com/v1)
 *
 * IMPORTANT: Never send PII to Vanta — only operational metadata.
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
  ComplianceFramework,
  SyncStatus,
} from './types.ts';

export class VantaComplianceAuditAdapter implements ComplianceAuditAdapter {
  readonly config: AdapterConfig = {
    id: 'vanta',
    name: 'Vanta Compliance Audit',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
    timeout: { ...DEFAULT_TIMEOUT_CONFIG, requestTimeoutMs: 15000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private get baseUrl(): string {
    return Deno.env.get('VANTA_BASE_URL') ?? 'https://api.vanta.com/v1';
  }

  private get apiToken(): string {
    return Deno.env.get('VANTA_API_TOKEN') ?? '';
  }

  private async request(path: string, method: string, body?: unknown): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout.requestTimeoutMs);

    try {
      return await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const resp = await this.request('/ping', 'GET');
      return {
        adapterId: this.config.id,
        healthy: resp.ok,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: resp.ok ? undefined : `HTTP ${resp.status}`,
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

  async syncEvidence(request: SyncEvidenceRequest): Promise<SyncEvidenceResponse> {
    // Vanta custom evidence API: push evidence records as custom assertions
    const payload = {
      evidenceItems: request.records.map((r) => ({
        externalId: r.eventId,
        timestamp: r.timestamp,
        action: r.action,
        actorId: r.actorId,
        actorLabel: r.actorLabel,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        category: r.category,
        description: r.description,
        tenantId: r.tenantId,
        metadata: r.metadata ?? {},
      })),
      frameworks: request.frameworks ?? [],
    };

    const resp = await this.request('/evidence/custom', 'POST', payload);
    const data = await resp.json();

    if (!resp.ok) {
      return {
        syncedCount: 0,
        failedCount: request.records.length,
        skippedCount: 0,
        batchId: data.batchId ?? `vanta_err_${Date.now()}`,
        details: request.records.map((r) => ({
          eventId: r.eventId,
          status: 'failed' as SyncStatus,
          errorMessage: data.message ?? `HTTP ${resp.status}`,
        })),
      };
    }

    return {
      syncedCount: data.syncedCount ?? request.records.length,
      failedCount: data.failedCount ?? 0,
      skippedCount: data.skippedCount ?? 0,
      batchId: data.batchId ?? `vanta_${Date.now()}`,
      details: data.details,
    };
  }

  async reportIncident(request: ReportIncidentRequest): Promise<ReportIncidentResponse> {
    const payload = {
      externalId: request.incidentId,
      title: request.title,
      description: request.description,
      severity: request.severity,
      source: request.source,
      detectedAt: request.detectedAt,
      resolvedAt: request.resolvedAt,
      tenantId: request.tenantId,
      metadata: request.metadata ?? {},
    };

    const resp = await this.request('/incidents', 'POST', payload);
    const data = await resp.json();

    return {
      providerIncidentId: data.id ?? `vanta_inc_${request.incidentId}`,
      accepted: resp.ok,
      dashboardUrl: data.dashboardUrl,
    };
  }

  async getComplianceStatus(request: GetComplianceStatusRequest): Promise<ComplianceStatusResponse> {
    const params = new URLSearchParams();
    if (request.framework) params.set('framework', request.framework);
    params.set('tenantId', request.tenantId);

    const resp = await this.request(`/compliance/status?${params.toString()}`, 'GET');
    const data = await resp.json();

    if (!resp.ok) {
      return {
        overallStatus: 'unknown',
        frameworks: [],
        provider: 'vanta',
      };
    }

    return {
      overallStatus: data.overallStatus ?? 'unknown',
      frameworks: (data.frameworks ?? []).map((f: Record<string, unknown>) => ({
        framework: f.framework as ComplianceFramework,
        status: f.status ?? 'unknown',
        controlsPassingPct: (f.controlsPassingPct as number) ?? 0,
        openFindings: (f.openFindings as number) ?? 0,
        lastSyncAt: (f.lastSyncAt as string) ?? null,
      })),
      provider: 'vanta',
    };
  }

  async listSyncHistory(request: ListSyncHistoryRequest): Promise<ListSyncHistoryResponse> {
    const params = new URLSearchParams();
    params.set('tenantId', request.tenantId);
    if (request.limit) params.set('limit', String(request.limit));
    if (request.offset) params.set('offset', String(request.offset));
    if (request.status) params.set('status', request.status);

    const resp = await this.request(`/evidence/history?${params.toString()}`, 'GET');
    const data = await resp.json();

    if (!resp.ok) {
      return { entries: [], total: 0 };
    }

    return {
      entries: (data.entries ?? []).map((e: Record<string, unknown>) => ({
        batchId: e.batchId as string,
        syncedAt: e.syncedAt as string,
        recordCount: (e.recordCount as number) ?? 0,
        syncedCount: (e.syncedCount as number) ?? 0,
        failedCount: (e.failedCount as number) ?? 0,
        status: (e.status as SyncStatus) ?? 'synced',
        provider: 'vanta',
      })),
      total: (data.total as number) ?? 0,
    };
  }

  async testConnection(_request: TestConnectionRequest): Promise<TestConnectionResponse> {
    try {
      const resp = await this.request('/organization', 'GET');
      const data = await resp.json();

      return {
        connected: resp.ok,
        provider: 'vanta',
        providerAccountName: data.name,
        apiVersion: data.apiVersion,
        errorMessage: resp.ok ? undefined : data.message,
      };
    } catch (err) {
      return {
        connected: false,
        provider: 'vanta',
        errorMessage: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }
}
