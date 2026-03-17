/**
 * Compliance Audit Handlers
 *
 * Gateway handlers for automated compliance audit trail operations.
 * Supports syncing audit evidence to Vanta/Drata, reporting incidents,
 * and querying compliance posture.
 *
 * IMPORTANT:
 * - All operations are scoped by ctx.firmId for tenant isolation.
 * - Caller must have 'owner' or 'admin' role in firm_users.
 * - NEVER send PII (customer names, account numbers) to compliance platforms.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { ComplianceAuditAdapter } from '../../_shared/adapters/compliance-audit/types.ts';
import type { EvidenceCategory, ComplianceFramework, IncidentSeverity, SyncStatus } from '../../_shared/adapters/compliance-audit/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function requireAdminRole(ctx: GatewayContext): Promise<GatewayResponse | null> {
  const { data: firmUser, error } = await ctx.db
    .from('firm_users')
    .select('role')
    .eq('user_id', ctx.userId!)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (error || !firmUser) {
    return { error: { code: 'FORBIDDEN', message: 'User not found in tenant' }, status: 403 };
  }

  if (firmUser.role !== 'owner' && firmUser.role !== 'admin') {
    return { error: { code: 'FORBIDDEN', message: 'Admin or owner role required' }, status: 403 };
  }

  return null;
}

async function getAdapter(tenantId: string): Promise<ComplianceAuditAdapter> {
  const { adapter } = await resolveAdapter<ComplianceAuditAdapter>('compliance_audit', tenantId);
  return adapter;
}

// =============================================================================
// SYNC EVIDENCE
// =============================================================================

/**
 * complianceAudit.syncEvidence — Push audit evidence to compliance platform
 *
 * Reads recent audit_logs entries and pushes them to the configured
 * compliance provider (Vanta, Drata). Can also accept explicit records.
 *
 * Params:
 *   - records: AuditEvidenceRecord[] (optional — if omitted, reads from audit_logs)
 *   - frameworks: ComplianceFramework[] (optional)
 *   - since: string (optional — ISO timestamp, defaults to last 24h)
 *   - limit: number (optional, default 100)
 */
export async function syncEvidence(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const adapter = await getAdapter(ctx.firmId!);
  const explicitRecords = ctx.params.records as Array<Record<string, unknown>> | undefined;
  const frameworks = ctx.params.frameworks as ComplianceFramework[] | undefined;

  let records;

  if (explicitRecords && Array.isArray(explicitRecords) && explicitRecords.length > 0) {
    // Use explicitly provided records
    records = explicitRecords.map((r) => ({
      eventId: r.eventId as string,
      timestamp: r.timestamp as string,
      action: r.action as string,
      actorId: r.actorId as string,
      actorLabel: r.actorLabel as string,
      resourceType: r.resourceType as string,
      resourceId: r.resourceId as string,
      category: (r.category as EvidenceCategory) ?? 'change_management',
      description: r.description as string,
      tenantId: ctx.firmId!,
      metadata: r.metadata as Record<string, unknown> | undefined,
    }));
  } else {
    // Pull from audit_logs table
    const since = (ctx.params.since as string) ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const limit = (ctx.params.limit as number) ?? 100;

    const { data: logs, error } = await ctx.db
      .from('audit_logs')
      .select('id, timestamp, action, entity_type, entity_id, user_id, message, metadata')
      .eq('firm_id', ctx.firmId!)
      .gte('timestamp', since)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: 'Failed to read audit logs' }, status: 500 };
    }

    records = (logs ?? []).map((log) => ({
      eventId: log.id,
      timestamp: log.timestamp,
      action: log.action ?? 'unknown',
      actorId: log.user_id ?? 'system',
      actorLabel: log.user_id ? `user:${(log.user_id as string).slice(0, 8)}` : 'system',
      resourceType: log.entity_type ?? 'unknown',
      resourceId: log.entity_id ?? '',
      category: mapActionToCategory(log.action),
      description: log.message ?? `${log.action} on ${log.entity_type}`,
      tenantId: ctx.firmId!,
      metadata: (log.metadata as Record<string, unknown>) ?? {},
    }));
  }

  if (records.length === 0) {
    return {
      data: { syncedCount: 0, failedCount: 0, skippedCount: 0, batchId: null, message: 'No records to sync' },
    };
  }

  const result = await adapter.syncEvidence({ records, frameworks });

  return {
    data: {
      syncedCount: result.syncedCount,
      failedCount: result.failedCount,
      skippedCount: result.skippedCount,
      batchId: result.batchId,
      details: result.details,
    },
  };
}

/**
 * complianceAudit.reportIncident — Report a security/operational incident
 *
 * Params:
 *   - incidentId: string (required)
 *   - title: string (required)
 *   - description: string (required — no PII)
 *   - severity: IncidentSeverity (required)
 *   - source: string (required, e.g., 'sentry', 'cms', 'gateway')
 *   - detectedAt: string (optional, defaults to now)
 *   - resolvedAt: string (optional)
 *   - metadata: Record<string, unknown> (optional)
 */
export async function reportIncident(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const { incidentId, title, description, severity, source } = ctx.params as {
    incidentId?: string; title?: string; description?: string; severity?: string; source?: string;
  };

  if (!incidentId || !title || !description || !severity || !source) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required fields: incidentId, title, description, severity, source' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId!);

  const result = await adapter.reportIncident({
    incidentId,
    title,
    description,
    severity: severity as IncidentSeverity,
    source,
    detectedAt: (ctx.params.detectedAt as string) ?? new Date().toISOString(),
    resolvedAt: ctx.params.resolvedAt as string | undefined,
    tenantId: ctx.firmId!,
    metadata: ctx.params.metadata as Record<string, unknown> | undefined,
  });

  return {
    data: {
      providerIncidentId: result.providerIncidentId,
      accepted: result.accepted,
      dashboardUrl: result.dashboardUrl,
    },
  };
}

/**
 * complianceAudit.status — Get compliance posture from the provider
 *
 * Params:
 *   - framework: ComplianceFramework (optional — filter to a specific framework)
 */
export async function getComplianceAuditStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const adapter = await getAdapter(ctx.firmId!);

  const result = await adapter.getComplianceStatus({
    framework: ctx.params.framework as ComplianceFramework | undefined,
    tenantId: ctx.firmId!,
  });

  return {
    data: {
      overallStatus: result.overallStatus,
      frameworks: result.frameworks,
      provider: result.provider,
    },
  };
}

/**
 * complianceAudit.syncHistory — List evidence sync history
 *
 * Params:
 *   - limit: number (optional, default 50)
 *   - offset: number (optional, default 0)
 *   - status: SyncStatus (optional)
 */
export async function listComplianceSyncHistory(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const adapter = await getAdapter(ctx.firmId!);
  const limit = (ctx.params.limit as number) ?? 50;
  const offset = (ctx.params.offset as number) ?? 0;

  const result = await adapter.listSyncHistory({
    tenantId: ctx.firmId!,
    limit,
    offset,
    status: ctx.params.status as SyncStatus | undefined,
  });

  return {
    data: { entries: result.entries },
    meta: {
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
      },
    },
  };
}

/**
 * complianceAudit.testConnection — Test connection to compliance platform
 */
export async function testComplianceConnection(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const adapter = await getAdapter(ctx.firmId!);

  const result = await adapter.testConnection({ tenantId: ctx.firmId! });

  return {
    data: {
      connected: result.connected,
      provider: result.provider,
      providerAccountName: result.providerAccountName,
      apiVersion: result.apiVersion,
      errorMessage: result.errorMessage,
    },
  };
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/** Map audit log action names to compliance evidence categories */
function mapActionToCategory(action: string | null): EvidenceCategory {
  if (!action) return 'change_management';

  if (action.includes('login') || action.includes('logout') || action.includes('session') || action.includes('mfa')) {
    return 'access_control';
  }
  if (action.includes('cms') || action.includes('publish') || action.includes('deploy') || action.includes('update') || action.includes('create') || action.includes('delete')) {
    return 'change_management';
  }
  if (action.includes('incident') || action.includes('error') || action.includes('alert')) {
    return 'incident_response';
  }
  if (action.includes('encrypt') || action.includes('pii') || action.includes('gdpr') || action.includes('export')) {
    return 'data_protection';
  }
  if (action.includes('scan') || action.includes('vulnerability') || action.includes('patch')) {
    return 'vulnerability_management';
  }
  if (action.includes('vendor') || action.includes('integration')) {
    return 'vendor_management';
  }
  if (action.includes('risk') || action.includes('aml') || action.includes('kyc')) {
    return 'risk_assessment';
  }

  return 'change_management';
}
