/**
 * Compliance Audit Adapter Interface
 *
 * Defines the contract for automated compliance audit trail connectors
 * (Vanta, Drata, etc.). These adapters push audit evidence, CMS change
 * records, and error/incident reports to compliance platforms so that
 * regulated institutions can demonstrate continuous monitoring.
 *
 * Supported providers: Vanta, Drata, Mock (sandbox).
 *
 * IMPORTANT:
 * - NEVER send PII (account numbers, SSNs) to compliance platforms.
 * - All payloads should contain only operational metadata.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// ENUMS / LITERALS
// =============================================================================

/** Categories of evidence that can be synced */
export type EvidenceCategory =
  | 'access_control'
  | 'change_management'
  | 'incident_response'
  | 'data_protection'
  | 'vulnerability_management'
  | 'business_continuity'
  | 'risk_assessment'
  | 'vendor_management';

/** Status of an evidence sync operation */
export type SyncStatus = 'pending' | 'synced' | 'failed' | 'skipped';

/** Compliance framework identifiers */
export type ComplianceFramework = 'SOC2' | 'PCI_DSS' | 'GLBA' | 'NCUA' | 'FFIEC' | 'ISO27001' | 'NIST_CSF';

/** Severity for incident reports */
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

/** A single audit evidence record to push to the compliance platform */
export interface AuditEvidenceRecord {
  /** Unique event ID from our audit_logs table */
  eventId: string;
  /** Timestamp of the event */
  timestamp: string;
  /** Action performed (e.g., 'cms.content.publish', 'user.login') */
  action: string;
  /** Actor who performed the action (user ID, never PII) */
  actorId: string;
  /** Actor display label (role or masked identifier, never full name) */
  actorLabel: string;
  /** Resource type affected */
  resourceType: string;
  /** Resource identifier */
  resourceId: string;
  /** Evidence category for compliance mapping */
  category: EvidenceCategory;
  /** Human-readable summary of what changed */
  description: string;
  /** Tenant identifier for multi-tenant scoping */
  tenantId: string;
  /** Additional non-PII metadata */
  metadata?: Record<string, unknown>;
}

export interface SyncEvidenceRequest {
  /** Batch of evidence records to sync */
  records: AuditEvidenceRecord[];
  /** Target compliance framework(s) */
  frameworks?: ComplianceFramework[];
}

export interface SyncEvidenceResponse {
  /** Number of records successfully synced */
  syncedCount: number;
  /** Number of records that failed */
  failedCount: number;
  /** Number of records skipped (duplicates, etc.) */
  skippedCount: number;
  /** Provider-assigned batch ID for tracking */
  batchId: string;
  /** Per-record status details (only for failures/skips) */
  details?: Array<{
    eventId: string;
    status: SyncStatus;
    errorMessage?: string;
  }>;
}

export interface ReportIncidentRequest {
  /** Unique incident ID from our system */
  incidentId: string;
  /** Incident title */
  title: string;
  /** Detailed description (no PII) */
  description: string;
  /** Severity level */
  severity: IncidentSeverity;
  /** Source system (e.g., 'sentry', 'cms', 'gateway') */
  source: string;
  /** When the incident was detected */
  detectedAt: string;
  /** When the incident was resolved (if applicable) */
  resolvedAt?: string;
  /** Tenant identifier */
  tenantId: string;
  /** Additional context */
  metadata?: Record<string, unknown>;
}

export interface ReportIncidentResponse {
  /** Provider-assigned incident tracking ID */
  providerIncidentId: string;
  /** Whether the incident was accepted */
  accepted: boolean;
  /** URL to the incident in the provider's dashboard (if available) */
  dashboardUrl?: string;
}

export interface GetComplianceStatusRequest {
  /** Filter by framework */
  framework?: ComplianceFramework;
  /** Tenant identifier */
  tenantId: string;
}

export interface ComplianceStatusResponse {
  /** Overall compliance posture */
  overallStatus: 'compliant' | 'at_risk' | 'non_compliant' | 'unknown';
  /** Per-framework status */
  frameworks: Array<{
    framework: ComplianceFramework;
    status: 'compliant' | 'at_risk' | 'non_compliant' | 'unknown';
    /** Percentage of controls passing (0-100) */
    controlsPassingPct: number;
    /** Number of open findings */
    openFindings: number;
    /** Last evidence sync timestamp */
    lastSyncAt: string | null;
  }>;
  /** Provider name */
  provider: string;
}

export interface ListSyncHistoryRequest {
  tenantId: string;
  limit?: number;
  offset?: number;
  /** Filter by status */
  status?: SyncStatus;
}

export interface SyncHistoryEntry {
  batchId: string;
  syncedAt: string;
  recordCount: number;
  syncedCount: number;
  failedCount: number;
  status: SyncStatus;
  provider: string;
}

export interface ListSyncHistoryResponse {
  entries: SyncHistoryEntry[];
  total: number;
}

export interface TestConnectionRequest {
  tenantId: string;
}

export interface TestConnectionResponse {
  connected: boolean;
  provider: string;
  providerAccountName?: string;
  apiVersion?: string;
  errorMessage?: string;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface ComplianceAuditAdapter extends BaseAdapter {
  /** Push audit evidence records to the compliance platform */
  syncEvidence(request: SyncEvidenceRequest): Promise<SyncEvidenceResponse>;

  /** Report a security or operational incident */
  reportIncident(request: ReportIncidentRequest): Promise<ReportIncidentResponse>;

  /** Get current compliance posture / dashboard status */
  getComplianceStatus(request: GetComplianceStatusRequest): Promise<ComplianceStatusResponse>;

  /** List history of evidence sync operations */
  listSyncHistory(request: ListSyncHistoryRequest): Promise<ListSyncHistoryResponse>;

  /** Test the connection to the compliance platform */
  testConnection(request: TestConnectionRequest): Promise<TestConnectionResponse>;
}
