// TODO: Provisional integration — not yet validated in production.
/**
 * Drata Compliance Audit Adapter
 *
 * Pushes audit evidence, incidents, and compliance status to Drata's API.
 * Drata automates compliance for SOC 2, ISO 27001, PCI DSS, GDPR, etc.
 *
 * Environment variables required:
 * - DRATA_API_KEY: API key for Drata authentication
 * - DRATA_BASE_URL: API base URL (default: https://public-api.drata.com)
 *
 * IMPORTANT: Never send PII to Drata — only operational metadata.
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

export class DrataComplianceAuditAdapter implements ComplianceAuditAdapter {
  readonly config: AdapterConfig = {
    id: 'drata',
    name: 'Drata Compliance Audit',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
    timeout: { ...DEFAULT_TIMEOUT_CONFIG, requestTimeoutMs: 15000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private get baseUrl(): string {
    return Deno.env.get('DRATA_BASE_URL') ?? 'https://public-api.drata.com';
  }

  private get apiKey(): string {
    return Deno.env.get('DRATA_API_KEY') ?? '';
  }

  private async request(path: string, method: string, body?: unknown): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
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
      const resp = await this.request('/public/health', 'GET');
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
    // Drata external evidence API: push evidence items via their evidence library
    const payload = {
      evidenceItems: request.records.map((r) => ({
        externalId: r.eventId,
        collectedAt: r.timestamp,
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

    const resp = await this.request('/public/evidence/external', 'POST', payload);
    const data = await resp.json();

    if (!resp.ok) {
      return {
        syncedCount: 0,
        failedCount: request.records.length,
        skippedCount: 0,
        batchId: data.batchId ?? `drata_err_${Date.now()}`,
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
      batchId: data.batchId ?? `drata_${Date.now()}`,
      details: data.details,
    };
  }

  async reportIncident(request: ReportIncidentRequest): Promise<ReportIncidentResponse> {
    const payload = {
      externalId: request.incidentId,
      name: request.title,
      description: request.description,
      severity: request.severity,
      source: request.source,
      identifiedDate: request.detectedAt,
      resolvedDate: request.resolvedAt,
      tenantId: request.tenantId,
      metadata: request.metadata ?? {},
    };

    const resp = await this.request('/public/incidents', 'POST', payload);
    const data = await resp.json();

    return {
      providerIncidentId: data.id ?? `drata_inc_${request.incidentId}`,
      accepted: resp.ok,
      dashboardUrl: data.dashboardUrl,
    };
  }

  async getComplianceStatus(request: GetComplianceStatusRequest): Promise<ComplianceStatusResponse> {
    const params = new URLSearchParams();
    if (request.framework) params.set('framework', request.framework);

    const resp = await this.request(`/public/compliance/status?${params.toString()}`, 'GET');
    const data = await resp.json();

    if (!resp.ok) {
      return {
        overallStatus: 'unknown',
        frameworks: [],
        provider: 'drata',
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
      provider: 'drata',
    };
  }

  async listSyncHistory(request: ListSyncHistoryRequest): Promise<ListSyncHistoryResponse> {
    const params = new URLSearchParams();
    if (request.limit) params.set('limit', String(request.limit));
    if (request.offset) params.set('offset', String(request.offset));
    if (request.status) params.set('status', request.status);

    const resp = await this.request(`/public/evidence/history?${params.toString()}`, 'GET');
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
        provider: 'drata',
      })),
      total: (data.total as number) ?? 0,
    };
  }

  async testConnection(_request: TestConnectionRequest): Promise<TestConnectionResponse> {
    try {
      const resp = await this.request('/public/workspaces/current', 'GET');
      const data = await resp.json();

      return {
        connected: resp.ok,
        provider: 'drata',
        providerAccountName: data.name ?? data.companyName,
        apiVersion: 'v1',
        errorMessage: resp.ok ? undefined : data.message,
      };
    } catch (err) {
      return {
        connected: false,
        provider: 'drata',
        errorMessage: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }
}
