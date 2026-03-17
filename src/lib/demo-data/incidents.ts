/**
 * Demo data for incidents, rollbacks, change requests, system health.
 *
 * Provides realistic walkable demo scenarios:
 * - Payment gateway latency incident with rollback
 * - Multiple change requests at various lifecycle stages
 * - System health and deployment history
 */

import { ActionHandler, isoDate, withPagination, TENANT_ID } from './types';

// =============================================================================
// INCIDENTS
// =============================================================================

const incidentPaymentGateway = {
  id: 'inc-001',
  firmId: TENANT_ID,
  title: 'Payment gateway latency spike — P99 > 2s',
  description: 'Prometheus alert fired: payment_gateway_latency_p99 exceeded 2000ms threshold for 5 consecutive minutes. Traced to v2.4.0 deployment introducing unindexed query in ACH batch processor.',
  severity: 'critical' as const,
  status: 'resolved' as const,
  detectedAt: isoDate(0.17), // ~4 hours ago
  detectedBy: 'system' as const,
  detectionSource: 'alert_rule' as const,
  alertRuleName: 'HighLatencyPaymentGateway',
  affectedServices: ['payment-gateway', 'ach-processor'],
  assignedTo: 'ops-lead@fiducia.dev',
  resolvedAt: isoDate(0.14), // ~3.4 hours ago
  resolutionSummary: 'Rolled back from v2.4.0 to v2.3.1. ACH batch query lacked index on settlement_date. Hotfix prepared in CR-005.',
  rollbackDeploymentId: 'deploy-rollback-001',
  notificationSentAt: isoDate(0.16),
  stakeholdersNotified: ['ops-team@fiducia.dev', 'cto@fiducia.dev', 'compliance@fiducia.dev'],
  postmortemUrl: null,
  timeline: [
    { timestamp: isoDate(0.17), action: 'detected', actor: 'AlertManager', detail: 'Alert HighLatencyPaymentGateway fired — P99 latency 2340ms' },
    { timestamp: isoDate(0.168), action: 'investigating', actor: 'ops-lead@fiducia.dev', detail: 'Investigating — correlating with recent v2.4.0 deployment' },
    { timestamp: isoDate(0.165), action: 'root_cause', actor: 'ops-lead@fiducia.dev', detail: 'Root cause identified: unindexed query in ACH batch processor introduced in v2.4.0' },
    { timestamp: isoDate(0.16), action: 'rollback_initiated', actor: 'ops-lead@fiducia.dev', detail: 'Initiating rollback from v2.4.0 to v2.3.1' },
    { timestamp: isoDate(0.155), action: 'rollback_completed', actor: 'system', detail: 'Rollback to v2.3.1 completed successfully. All health checks passing.' },
    { timestamp: isoDate(0.154), action: 'stakeholders_notified', actor: 'system', detail: 'Notified ops-team, CTO, compliance via Slack and email' },
    { timestamp: isoDate(0.14), action: 'resolved', actor: 'ops-lead@fiducia.dev', detail: 'Incident resolved. P99 latency returned to 180ms. Hotfix CR-005 created.' },
  ],
  createdAt: isoDate(0.17),
  updatedAt: isoDate(0.14),
};

const incidentCertExpiry = {
  id: 'inc-002',
  firmId: TENANT_ID,
  title: 'TLS certificate expiration warning — 7 days remaining',
  description: 'Health check detected TLS certificate for api.demo-bank.com expires in 7 days.',
  severity: 'medium' as const,
  status: 'investigating' as const,
  detectedAt: isoDate(0.5),
  detectedBy: 'system' as const,
  detectionSource: 'health_check' as const,
  alertRuleName: 'CertExpiryWarning',
  affectedServices: ['api-gateway'],
  assignedTo: 'infra@fiducia.dev',
  resolvedAt: null,
  resolutionSummary: null,
  rollbackDeploymentId: null,
  notificationSentAt: null,
  stakeholdersNotified: [],
  postmortemUrl: null,
  timeline: [
    { timestamp: isoDate(0.5), action: 'detected', actor: 'HealthCheck', detail: 'TLS cert expires in 7 days for api.demo-bank.com' },
    { timestamp: isoDate(0.4), action: 'investigating', actor: 'infra@fiducia.dev', detail: 'Checking auto-renewal configuration in Cloudflare' },
  ],
  createdAt: isoDate(0.5),
  updatedAt: isoDate(0.4),
};

const allIncidents = [incidentPaymentGateway, incidentCertExpiry];

// =============================================================================
// ROLLBACKS
// =============================================================================

const rollbackPayment = {
  id: 'rb-001',
  firmId: TENANT_ID,
  incidentId: 'inc-001',
  fromVersion: 'v2.4.0',
  toVersion: 'v2.3.1',
  rollbackType: 'full' as const,
  status: 'completed' as const,
  initiatedBy: 'ops-lead@fiducia.dev',
  initiatedAt: isoDate(0.16),
  completedAt: isoDate(0.155),
  preRollbackSnapshot: {
    services: [
      { name: 'payment-gateway', status: 'degraded' as const, latencyMs: 2340, lastCheckedAt: isoDate(0.16) },
      { name: 'ach-processor', status: 'degraded' as const, latencyMs: 1890, lastCheckedAt: isoDate(0.16) },
      { name: 'auth-service', status: 'healthy' as const, latencyMs: 45, lastCheckedAt: isoDate(0.16) },
      { name: 'database', status: 'healthy' as const, latencyMs: 12, lastCheckedAt: isoDate(0.16) },
    ],
  },
  postRollbackSnapshot: {
    services: [
      { name: 'payment-gateway', status: 'healthy' as const, latencyMs: 180, lastCheckedAt: isoDate(0.155) },
      { name: 'ach-processor', status: 'healthy' as const, latencyMs: 95, lastCheckedAt: isoDate(0.155) },
      { name: 'auth-service', status: 'healthy' as const, latencyMs: 42, lastCheckedAt: isoDate(0.155) },
      { name: 'database', status: 'healthy' as const, latencyMs: 11, lastCheckedAt: isoDate(0.155) },
    ],
  },
  createdAt: isoDate(0.16),
};

// =============================================================================
// CHANGE REQUESTS
// =============================================================================

const changeRequests = [
  {
    id: 'cr-001',
    firmId: TENANT_ID,
    title: 'Add instant ACH support',
    description: 'Enable same-day ACH transfers with configurable cutoff times per tenant.',
    changeType: 'feature' as const,
    status: 'closed' as const,
    requestedBy: 'eng-lead@fiducia.dev',
    requestedAt: isoDate(5),
    approvalId: 'apr-demo-001',
    approvedBy: 'compliance-officer@fiducia.dev',
    approvedAt: isoDate(4.5),
    testStatus: 'passed' as const,
    testResults: { unit: { passed: 247, failed: 0, total: 247 }, e2e: { passed: 38, failed: 1, total: 39 }, coveragePct: 34.2 },
    deploymentVersion: 'v2.3.0',
    deployedAt: isoDate(3),
    monitoringStatus: 'healthy' as const,
    incidentId: null,
    gitSha: 'a1b2c3d',
    gitBranch: 'feature/instant-ach',
    prUrl: 'https://github.com/fiducia/platform/pull/142',
    createdAt: isoDate(5),
    updatedAt: isoDate(2),
  },
  {
    id: 'cr-002',
    firmId: TENANT_ID,
    title: 'Upgrade payment gateway batch processor',
    description: 'Optimize ACH batch processing with indexed settlement_date queries.',
    changeType: 'bugfix' as const,
    status: 'monitoring' as const,
    requestedBy: 'ops-lead@fiducia.dev',
    requestedAt: isoDate(1),
    approvalId: 'apr-demo-002',
    approvedBy: 'eng-lead@fiducia.dev',
    approvedAt: isoDate(0.8),
    testStatus: 'passed' as const,
    testResults: { unit: { passed: 312, failed: 0, total: 312 }, e2e: { passed: 42, failed: 0, total: 42 }, coveragePct: 36.1 },
    deploymentVersion: 'v2.4.1',
    deployedAt: isoDate(0.1),
    monitoringStatus: 'healthy' as const,
    incidentId: null,
    gitSha: 'e5f6g7h',
    gitBranch: 'hotfix/ach-batch-index',
    prUrl: 'https://github.com/fiducia/platform/pull/156',
    createdAt: isoDate(1),
    updatedAt: isoDate(0.1),
  },
  {
    id: 'cr-003',
    firmId: TENANT_ID,
    title: 'Enable multi-currency wire transfers',
    description: 'Support GBP, EUR, CAD wire transfers with FX rate locking.',
    changeType: 'feature' as const,
    status: 'testing' as const,
    requestedBy: 'product@fiducia.dev',
    requestedAt: isoDate(2),
    approvalId: 'apr-demo-003',
    approvedBy: 'compliance-officer@fiducia.dev',
    approvedAt: isoDate(1.5),
    testStatus: 'pending' as const,
    testResults: null,
    deploymentVersion: null,
    deployedAt: null,
    monitoringStatus: 'healthy' as const,
    incidentId: null,
    gitSha: 'i8j9k0l',
    gitBranch: 'feature/multi-currency-wires',
    prUrl: 'https://github.com/fiducia/platform/pull/148',
    createdAt: isoDate(2),
    updatedAt: isoDate(0.5),
  },
  {
    id: 'cr-004',
    firmId: TENANT_ID,
    title: 'GDPR data export endpoint',
    description: 'Implement DSAR (Data Subject Access Request) export endpoint for EU compliance.',
    changeType: 'feature' as const,
    status: 'pending_approval' as const,
    requestedBy: 'eng-lead@fiducia.dev',
    requestedAt: isoDate(0.5),
    approvalId: null,
    approvedBy: null,
    approvedAt: null,
    testStatus: 'pending' as const,
    testResults: null,
    deploymentVersion: null,
    deployedAt: null,
    monitoringStatus: 'healthy' as const,
    incidentId: null,
    gitSha: 'm1n2o3p',
    gitBranch: 'feature/gdpr-dsar-export',
    prUrl: 'https://github.com/fiducia/platform/pull/159',
    createdAt: isoDate(0.5),
    updatedAt: isoDate(0.5),
  },
  {
    id: 'cr-005',
    firmId: TENANT_ID,
    title: 'Hotfix: ACH batch settlement_date index',
    description: 'Add missing index on settlement_date column in ach_batches table. Root cause of INC-001.',
    changeType: 'hotfix' as const,
    status: 'deployed' as const,
    requestedBy: 'ops-lead@fiducia.dev',
    requestedAt: isoDate(0.13),
    approvalId: 'apr-demo-005',
    approvedBy: 'eng-lead@fiducia.dev',
    approvedAt: isoDate(0.12),
    testStatus: 'passed' as const,
    testResults: { unit: { passed: 312, failed: 0, total: 312 }, e2e: { passed: 42, failed: 0, total: 42 }, coveragePct: 36.1 },
    deploymentVersion: 'v2.4.1',
    deployedAt: isoDate(0.1),
    monitoringStatus: 'healthy' as const,
    incidentId: 'inc-001',
    gitSha: 'e5f6g7h',
    gitBranch: 'hotfix/ach-batch-index',
    prUrl: 'https://github.com/fiducia/platform/pull/156',
    createdAt: isoDate(0.13),
    updatedAt: isoDate(0.1),
  },
];

// =============================================================================
// DEPLOYMENTS
// =============================================================================

const deployments = [
  { id: 'dep-001', version: 'v2.4.1', deploymentType: 'full' as const, status: 'success' as const, triggeredBy: 'ci', gitSha: 'e5f6g7h', durationMs: 47200, createdAt: isoDate(0.1) },
  { id: 'dep-002', version: 'v2.4.0', deploymentType: 'full' as const, status: 'rolled_back' as const, triggeredBy: 'ci', gitSha: 'q4r5s6t', durationMs: 52100, createdAt: isoDate(0.2) },
  { id: 'dep-003', version: 'v2.3.1', deploymentType: 'functions' as const, status: 'success' as const, triggeredBy: 'ci', gitSha: 'u7v8w9x', durationMs: 18300, createdAt: isoDate(1) },
  { id: 'dep-004', version: 'v2.3.0', deploymentType: 'full' as const, status: 'success' as const, triggeredBy: 'ci', gitSha: 'a1b2c3d', durationMs: 51800, createdAt: isoDate(3) },
  { id: 'dep-005', version: 'v2.2.9', deploymentType: 'migrations' as const, status: 'success' as const, triggeredBy: 'manual', gitSha: 'y0z1a2b', durationMs: 8400, createdAt: isoDate(7) },
  { id: 'dep-006', version: 'v2.2.8', deploymentType: 'full' as const, status: 'failed' as const, triggeredBy: 'ci', gitSha: 'c3d4e5f', durationMs: 34600, createdAt: isoDate(10) },
];

// =============================================================================
// SYSTEM HEALTH
// =============================================================================

const healthSnapshot = {
  timestamp: new Date().toISOString(),
  overallStatus: 'healthy' as const,
  services: [
    { name: 'API Gateway', status: 'healthy' as const, latencyMs: 45, lastCheckedAt: new Date().toISOString() },
    { name: 'Database (PostgreSQL)', status: 'healthy' as const, latencyMs: 12, lastCheckedAt: new Date().toISOString() },
    { name: 'Auth Service', status: 'healthy' as const, latencyMs: 38, lastCheckedAt: new Date().toISOString() },
    { name: 'Core Banking Adapter', status: 'healthy' as const, latencyMs: 125, lastCheckedAt: new Date().toISOString() },
    { name: 'Payment Gateway', status: 'healthy' as const, latencyMs: 180, lastCheckedAt: new Date().toISOString() },
    { name: 'Notification Service', status: 'healthy' as const, latencyMs: 62, lastCheckedAt: new Date().toISOString() },
  ],
  uptimePct: 99.97,
};

// =============================================================================
// HANDLERS
// =============================================================================

export const incidentHandlers: Record<string, ActionHandler> = {
  'incidents.list': (params) => {
    let filtered = allIncidents;
    if (params.status) filtered = filtered.filter(i => i.status === params.status);
    if (params.severity) filtered = filtered.filter(i => i.severity === params.severity);
    return withPagination({ incidents: filtered }, filtered.length);
  },
  'incidents.get': (params) => {
    const incident = allIncidents.find(i => i.id === params.incidentId) ?? incidentPaymentGateway;
    return { incident };
  },
  'incidents.create': (params) => ({
    incident: {
      ...incidentPaymentGateway,
      id: 'inc-new-' + Date.now(),
      title: params.title ?? 'New Incident',
      severity: params.severity ?? 'medium',
      status: 'detected',
      detectedAt: new Date().toISOString(),
      timeline: [{ timestamp: new Date().toISOString(), action: 'detected', actor: 'manual', detail: 'Incident created manually' }],
    },
  }),
  'incidents.update': (params) => {
    const incident = allIncidents.find(i => i.id === params.incidentId) ?? incidentPaymentGateway;
    return { incident: { ...incident, ...params, updatedAt: new Date().toISOString() } };
  },
  'incidents.addTimeline': (params) => {
    const incident = allIncidents.find(i => i.id === params.incidentId) ?? incidentPaymentGateway;
    const entry = { timestamp: new Date().toISOString(), action: String(params.action), actor: String(params.actor), detail: String(params.detail) };
    return { incident: { ...incident, timeline: [...incident.timeline, entry] } };
  },
  'incidents.notifyStakeholders': () => ({
    success: true,
    notifiedAt: new Date().toISOString(),
  }),

  'rollbacks.list': (params) => {
    let filtered = [rollbackPayment];
    if (params.incidentId) filtered = filtered.filter(r => r.incidentId === params.incidentId);
    return withPagination({ rollbacks: filtered }, filtered.length);
  },
  'rollbacks.initiate': (params) => ({
    rollback: {
      ...rollbackPayment,
      id: 'rb-new-' + Date.now(),
      fromVersion: params.fromVersion ?? 'v2.4.0',
      toVersion: params.toVersion ?? 'v2.3.1',
      status: 'in_progress',
      initiatedAt: new Date().toISOString(),
      completedAt: null,
    },
  }),
  'rollbacks.complete': () => ({
    rollback: { ...rollbackPayment, status: 'completed', completedAt: new Date().toISOString() },
  }),

  'changeRequests.list': (params) => {
    let filtered = changeRequests;
    if (params.status) filtered = filtered.filter(cr => cr.status === params.status);
    return withPagination({ changeRequests: filtered }, filtered.length);
  },
  'changeRequests.get': (params) => {
    const cr = changeRequests.find(c => c.id === params.changeRequestId) ?? changeRequests[0];
    return { changeRequest: cr };
  },
  'changeRequests.create': (params) => ({
    changeRequest: {
      ...changeRequests[0],
      id: 'cr-new-' + Date.now(),
      title: params.title ?? 'New Change',
      status: 'draft',
      createdAt: new Date().toISOString(),
    },
  }),
  'changeRequests.updateStatus': (params) => {
    const cr = changeRequests.find(c => c.id === params.changeRequestId) ?? changeRequests[0];
    return { changeRequest: { ...cr, status: params.status, updatedAt: new Date().toISOString() } };
  },

  'system.healthSnapshot': () => ({ health: healthSnapshot }),
  'system.deployments': (params) => {
    const limit = (params.limit as number) || 10;
    return withPagination({ deployments: deployments.slice(0, limit) }, deployments.length);
  },
};
