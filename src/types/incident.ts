/**
 * Incident Management, Deployment Rollback & Change Control Types
 *
 * Supports three operational stories:
 * 1. Incident detection → rollback → stakeholder notification
 * 2. Control visibility (deployments, approvals, tests, health)
 * 3. Audit narrative (change → approved → tested → deployed → monitored)
 */

// =============================================================================
// INCIDENTS
// =============================================================================

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'detected' | 'investigating' | 'mitigating' | 'resolved' | 'postmortem';
export type DetectionSource = 'alert_rule' | 'health_check' | 'sentry' | 'manual';

export interface IncidentTimelineEntry {
  timestamp: string;
  action: string;
  actor: string;
  detail: string;
}

export interface Incident {
  id: string;
  firmId: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: string;
  detectedBy: 'system' | 'manual';
  detectionSource: DetectionSource | null;
  alertRuleName: string | null;
  affectedServices: string[];
  assignedTo: string | null;
  resolvedAt: string | null;
  resolutionSummary: string | null;
  rollbackDeploymentId: string | null;
  notificationSentAt: string | null;
  stakeholdersNotified: string[];
  postmortemUrl: string | null;
  timeline: IncidentTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// DEPLOYMENT ROLLBACKS
// =============================================================================

export type RollbackType = 'full' | 'migration' | 'functions';
export type RollbackStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ServiceHealthEntry {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastCheckedAt: string;
}

export interface DeploymentRollback {
  id: string;
  firmId: string;
  incidentId: string | null;
  fromVersion: string;
  toVersion: string;
  rollbackType: RollbackType;
  status: RollbackStatus;
  initiatedBy: string;
  initiatedAt: string;
  completedAt: string | null;
  preRollbackSnapshot: { services: ServiceHealthEntry[] } | null;
  postRollbackSnapshot: { services: ServiceHealthEntry[] } | null;
  createdAt: string;
}

// =============================================================================
// CHANGE REQUESTS (Audit Narrative)
// =============================================================================

export type ChangeType = 'feature' | 'bugfix' | 'hotfix' | 'migration' | 'config';
export type ChangeRequestStatus =
  | 'draft' | 'pending_approval' | 'approved' | 'testing'
  | 'deploying' | 'deployed' | 'monitoring' | 'closed';
export type TestStatus = 'pending' | 'passed' | 'failed' | 'skipped';
export type MonitoringStatus = 'healthy' | 'degraded' | 'incident';

export interface TestResults {
  unit: { passed: number; failed: number; total: number };
  e2e: { passed: number; failed: number; total: number };
  coveragePct: number;
}

export interface ChangeRequest {
  id: string;
  firmId: string;
  title: string;
  description: string | null;
  changeType: ChangeType;
  status: ChangeRequestStatus;
  requestedBy: string;
  requestedAt: string;
  approvalId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  testStatus: TestStatus;
  testResults: TestResults | null;
  deploymentVersion: string | null;
  deployedAt: string | null;
  monitoringStatus: MonitoringStatus;
  incidentId: string | null;
  gitSha: string | null;
  gitBranch: string | null;
  prUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SYSTEM HEALTH (for Control Tower)
// =============================================================================

export interface SystemHealthSnapshot {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'outage';
  services: ServiceHealthEntry[];
  uptimePct: number;
}

// =============================================================================
// DEPLOYMENT RECORD (for Control Tower)
// =============================================================================

export interface DeploymentRecord {
  id: string;
  version: string;
  deploymentType: 'migrations' | 'functions' | 'full';
  status: 'started' | 'success' | 'failed' | 'rolled_back';
  triggeredBy: string;
  gitSha: string | null;
  durationMs: number | null;
  createdAt: string;
}
