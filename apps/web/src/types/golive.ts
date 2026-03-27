/**
 * Go-Live Orchestration Types
 *
 * Types for the go-live workflow, smoke tests, canary deployments,
 * and the stakeholder status page.
 */

// =============================================================================
// WORKFLOW
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
  result?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
}

export interface GoLiveWorkflow {
  id: string;
  firmId: string;
  status: GoLiveWorkflowStatus;
  currentStep: GoLiveStepId | null;
  stepsCompleted: GoLiveStepId[];
  stepResults: Record<GoLiveStepId, Record<string, unknown>>;
  steps: GoLiveStep[];
  startedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
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

export type SmokeTestStatus = "pass" | "fail" | "skip" | "running";

export interface SmokeTestResult {
  name: string;
  description: string;
  status: SmokeTestStatus;
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SmokeTestSuite {
  workflowId: string;
  runAt: string;
  overallStatus: "pass" | "fail";
  tests: SmokeTestResult[];
  passCount: number;
  failCount: number;
  skipCount: number;
}

// =============================================================================
// POST-LAUNCH MONITORING
// =============================================================================

export interface PostLaunchMetrics {
  errorRate: number;
  p95LatencyMs: number;
  totalLogins: number;
  totalTransactions: number;
  activeUsers: number;
  adapterHealth: Record<string, "healthy" | "degraded" | "down">;
  alerts: PostLaunchAlert[];
  uptimePercent: number;
  periodStart: string;
  periodEnd: string;
}

export interface PostLaunchAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
  resolved: boolean;
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

// =============================================================================
// STAKEHOLDER STATUS
// =============================================================================

export interface GoLiveStatusPublic {
  institutionName: string;
  workflowStatus: GoLiveWorkflowStatus;
  currentStepLabel: string;
  stepsCompleted: number;
  totalSteps: number;
  steps: Array<{
    label: string;
    status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  }>;
  estimatedCompletionAt: string | null;
  lastUpdatedAt: string;
}

// =============================================================================
// APPROVAL GATE
// =============================================================================

export interface ApprovalEntry {
  userId: string;
  userName: string;
  role: string;
  approvedAt: string;
  comment: string;
}

export interface ApprovalGate {
  required: number;
  received: ApprovalEntry[];
  isApproved: boolean;
}
