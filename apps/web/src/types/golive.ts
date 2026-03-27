/**
 * Go-Live Orchestration Types
 *
 * Types for the sequenced go-live workflow, smoke testing,
 * and canary deployment management.
 */

// =============================================================================
// GO-LIVE WORKFLOW
// =============================================================================

export type GoLiveWorkflowStatus =
  | "not_started"
  | "in_progress"
  | "paused"
  | "completed"
  | "rolled_back";

export type GoLiveStepId =
  | "provision"
  | "adapters"
  | "data_import"
  | "smoke_tests"
  | "approval"
  | "dns_cutover"
  | "post_launch_monitor";

export type GoLiveEventType =
  | "started"
  | "completed"
  | "failed"
  | "skipped"
  | "approved"
  | "rolled_back";

export interface GoLiveStep {
  id: GoLiveStepId;
  label: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  result: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  canRollback: boolean;
}

export interface GoLiveWorkflow {
  id: string;
  firmId: string;
  status: GoLiveWorkflowStatus;
  currentStep: GoLiveStepId | null;
  steps: GoLiveStep[];
  stepsCompleted: GoLiveStepId[];
  startedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  metadata: GoLiveMetadata;
}

export interface GoLiveMetadata {
  institutionName: string;
  institutionType: "credit_union" | "community_bank" | "digital_bank";
  targetGoLiveDate: string | null;
  stakeholderEmails: string[];
  statusPageUrl: string | null;
}

export interface GoLiveEvent {
  id: string;
  workflowId: string;
  step: GoLiveStepId;
  eventType: GoLiveEventType;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  createdBy: string | null;
}

// =============================================================================
// SMOKE TESTS
// =============================================================================

export type SmokeTestId =
  | "auth_login"
  | "auth_session"
  | "accounts_list"
  | "accounts_detail"
  | "transfer_dryrun"
  | "billpay_payees"
  | "card_list"
  | "adapter_health"
  | "rdc_upload"
  | "notifications";

export type SmokeTestStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export interface SmokeTestResult {
  testId: SmokeTestId;
  label: string;
  status: SmokeTestStatus;
  durationMs: number;
  message: string | null;
  details: Record<string, unknown> | null;
}

export interface SmokeTestSuite {
  workflowId: string;
  results: SmokeTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  startedAt: string;
  completedAt: string | null;
  overallStatus: "passed" | "failed" | "running";
}

// =============================================================================
// APPROVAL GATE
// =============================================================================

export interface ApprovalRecord {
  approverEmail: string;
  approverName: string;
  approvedAt: string;
  notes: string;
}

// =============================================================================
// POST-LAUNCH MONITORING
// =============================================================================

export interface PostLaunchMetrics {
  errorRate: number;
  p95LatencyMs: number;
  totalLogins: number;
  uniqueUsers: number;
  totalTransactions: number;
  failedTransactions: number;
  adapterHealthStatus: Record<string, "healthy" | "degraded" | "down">;
  alertsFired: number;
  uptimePercent: number;
  monitoringSince: string;
}

// =============================================================================
// CANARY DEPLOYMENTS
// =============================================================================

export type DeploymentStatus = "active" | "canary" | "rolling_back" | "inactive";

export interface TenantDeployment {
  id: string;
  firmId: string;
  version: string;
  pinned: boolean;
  rolloutPercentage: number;
  status: DeploymentStatus;
  errorRateThreshold: number;
  autoRollback: boolean;
  deployedAt: string;
  createdAt: string;
}

export interface CanaryMetrics {
  deploymentId: string;
  currentErrorRate: number;
  thresholdExceeded: boolean;
  requestsServed: number;
  rolloutPercentage: number;
  version: string;
  comparisonVersion: string | null;
  metrics: {
    canary: { errorRate: number; p95Ms: number; requestCount: number };
    stable: { errorRate: number; p95Ms: number; requestCount: number };
  };
}

// =============================================================================
// RUNBOOK GENERATOR
// =============================================================================

export interface GeneratedRunbook {
  id: string;
  name: string;
  category:
    | "incident_response"
    | "adapter_troubleshooting"
    | "backup_restore"
    | "escalation"
    | "tenant_specific";
  generatedAt: string;
  markdownContent: string;
  sourceArtifacts: string[];
  tenantSpecific: boolean;
}
