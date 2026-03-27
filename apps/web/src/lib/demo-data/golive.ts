/**
 * Demo Data — Go-Live Orchestration
 *
 * Mock responses for go-live workflow, smoke tests, post-launch monitoring,
 * canary deployments, adapter setup, and runbook generation.
 */

import type {
  GoLiveWorkflow,
  GoLiveStep,
  GoLiveEvent,
  SmokeTestSuite,
  PostLaunchMetrics,
  TenantDeployment,
  ApprovalRecord,
} from "@/types/golive";

import { ActionHandler, TENANT_ID, isoDate } from "./types";

// =============================================================================
// GO-LIVE STEPS
// =============================================================================

const STEP_DEFS: Array<Pick<GoLiveStep, "id" | "label" | "description">> = [
  {
    id: "provision",
    label: "Provision & Validate",
    description: "Create tenant project, run migrations, deploy edge functions",
  },
  {
    id: "adapters",
    label: "Configure Adapters",
    description: "Set up core banking, payments, KYC adapters and run health checks",
  },
  {
    id: "data_import",
    label: "Import Data",
    description: "Migrate members, accounts, transactions from legacy system",
  },
  {
    id: "smoke_tests",
    label: "Smoke Tests",
    description: "Run automated tests: auth, accounts, transfers, bill pay",
  },
  { id: "approval", label: "Approval Gate", description: "Stakeholder sign-off before cutover" },
  {
    id: "dns_cutover",
    label: "DNS Cutover",
    description: "Point production domain to new platform",
  },
  {
    id: "post_launch_monitor",
    label: "Post-Launch Monitor",
    description: "First 24-hour monitoring dashboard",
  },
];

function buildSteps(completedCount: number): GoLiveStep[] {
  return STEP_DEFS.map((def, i) => ({
    ...def,
    status: i < completedCount ? "completed" : i === completedCount ? "in_progress" : "pending",
    result: null,
    canRollback: i < completedCount,
    startedAt: i <= completedCount ? isoDate(7 - i) : null,
    completedAt: i < completedCount ? isoDate(7 - i) : null,
  }));
}

const sampleWorkflow: GoLiveWorkflow = {
  id: "wf-001",
  firmId: TENANT_ID,
  status: "in_progress",
  currentStep: "smoke_tests",
  stepsCompleted: ["provision", "adapters", "data_import"],
  steps: buildSteps(3),
  startedBy: "user-admin-001",
  startedAt: isoDate(7),
  completedAt: null,
  metadata: {
    institutionName: "Arizona Federal Credit Union",
    institutionType: "credit_union",
    targetGoLiveDate: null,
    stakeholderEmails: ["admin@azfcu.org"],
    statusPageUrl: null,
  },
};

const sampleEvents: GoLiveEvent[] = [
  {
    id: "evt-001",
    workflowId: "wf-001",
    step: "provision",
    eventType: "started",
    message: "Provisioning tenant project",
    metadata: {},
    createdAt: isoDate(7),
    createdBy: "user-admin-001",
  },
  {
    id: "evt-002",
    workflowId: "wf-001",
    step: "provision",
    eventType: "completed",
    message: "Tenant provisioned: 43 migrations applied, 11 edge functions deployed",
    metadata: {},
    createdAt: isoDate(7),
    createdBy: null,
  },
  {
    id: "evt-003",
    workflowId: "wf-001",
    step: "adapters",
    eventType: "started",
    message: "Configuring adapters",
    metadata: {},
    createdAt: isoDate(6),
    createdBy: "user-admin-001",
  },
  {
    id: "evt-004",
    workflowId: "wf-001",
    step: "adapters",
    eventType: "completed",
    message: "6 adapters configured and healthy",
    metadata: {},
    createdAt: isoDate(6),
    createdBy: null,
  },
  {
    id: "evt-005",
    workflowId: "wf-001",
    step: "data_import",
    eventType: "started",
    message: "Starting data import",
    metadata: {},
    createdAt: isoDate(5),
    createdBy: "user-admin-001",
  },
  {
    id: "evt-006",
    workflowId: "wf-001",
    step: "data_import",
    eventType: "completed",
    message: "37,250 records imported, reconciliation passed",
    metadata: {},
    createdAt: isoDate(4),
    createdBy: null,
  },
  {
    id: "evt-007",
    workflowId: "wf-001",
    step: "smoke_tests",
    eventType: "started",
    message: "Running smoke test suite",
    metadata: {},
    createdAt: isoDate(3),
    createdBy: "user-admin-001",
  },
];

const sampleSmokeTests: SmokeTestSuite = {
  workflowId: "wf-001",
  startedAt: isoDate(3),
  completedAt: isoDate(3),
  overallStatus: "failed",
  totalTests: 8,
  passedTests: 7,
  failedTests: 1,
  skippedTests: 0,
  results: [
    {
      testId: "auth_login",
      label: "Authentication",
      status: "passed",
      durationMs: 245,
      message: null,
      details: null,
    },
    {
      testId: "accounts_list",
      label: "Account List",
      status: "passed",
      durationMs: 132,
      message: null,
      details: null,
    },
    {
      testId: "accounts_detail",
      label: "Account Detail",
      status: "passed",
      durationMs: 98,
      message: null,
      details: null,
    },
    {
      testId: "transfer_dryrun",
      label: "Internal Transfer",
      status: "passed",
      durationMs: 310,
      message: null,
      details: null,
    },
    {
      testId: "billpay_payees",
      label: "Bill Pay Payees",
      status: "passed",
      durationMs: 87,
      message: null,
      details: null,
    },
    {
      testId: "card_list",
      label: "Card Controls",
      status: "passed",
      durationMs: 105,
      message: null,
      details: null,
    },
    {
      testId: "adapter_health",
      label: "Wire Transfer",
      status: "passed",
      durationMs: 420,
      message: null,
      details: null,
    },
    {
      testId: "rdc_upload",
      label: "RDC Upload",
      status: "failed",
      durationMs: 3200,
      message: "Timeout waiting for RDC adapter response after 3000ms",
      details: { error: "timeout" },
    },
  ],
};

const sampleApproval: ApprovalRecord = {
  approverEmail: "jane.doe@azfcu.org",
  approverName: "Jane Doe",
  approvedAt: isoDate(2),
  notes: "All checks passed. Approved for cutover.",
};

const samplePostLaunchMetrics: PostLaunchMetrics = {
  errorRate: 0.002,
  p95LatencyMs: 340,
  totalLogins: 3847,
  uniqueUsers: 2103,
  totalTransactions: 12560,
  failedTransactions: 25,
  adapterHealthStatus: {
    "core-banking": "healthy",
    "card-services": "healthy",
    "bill-pay": "healthy",
    kyc: "healthy",
    rdc: "degraded",
    "wire-transfers": "healthy",
  },
  alertsFired: 1,
  uptimePercent: 99.97,
  monitoringSince: isoDate(1),
};

const sampleDeployments: TenantDeployment[] = [
  {
    id: "deploy-001",
    firmId: TENANT_ID,
    version: "1.2.0",
    pinned: false,
    rolloutPercentage: 100,
    status: "active",
    errorRateThreshold: 0.05,
    autoRollback: true,
    deployedAt: isoDate(7),
    createdAt: isoDate(7),
  },
  {
    id: "deploy-002",
    firmId: TENANT_ID,
    version: "1.3.0-rc.1",
    pinned: false,
    rolloutPercentage: 10,
    status: "canary",
    errorRateThreshold: 0.03,
    autoRollback: true,
    deployedAt: isoDate(1),
    createdAt: isoDate(1),
  },
];

const samplePublicStatus = {
  institutionName: "Arizona Federal Credit Union",
  workflowStatus: "in_progress",
  currentStepLabel: "Smoke Tests",
  stepsCompleted: 3,
  totalSteps: 7,
  steps: STEP_DEFS.map((def, i) => ({
    label: def.label,
    status:
      i < 3 ? ("completed" as const) : i === 3 ? ("in_progress" as const) : ("pending" as const),
  })),
  estimatedCompletionAt: null,
  lastUpdatedAt: isoDate(0),
};

// =============================================================================
// HANDLERS
// =============================================================================

export const goliveHandlers: Record<string, ActionHandler> = {
  "golive.start": () => ({
    workflow: {
      ...sampleWorkflow,
      status: "in_progress",
      currentStep: "provision",
      stepsCompleted: [],
      steps: buildSteps(0),
    },
  }),

  "golive.status": () => ({ workflow: sampleWorkflow }),

  "golive.events.list": () => ({ events: sampleEvents }),

  "golive.step.execute": (params) => {
    const stepId = params.stepId as string;
    const idx = STEP_DEFS.findIndex((s) => s.id === stepId);
    return {
      workflow: {
        ...sampleWorkflow,
        currentStep: STEP_DEFS[idx + 1]?.id ?? null,
        stepsCompleted: [...sampleWorkflow.stepsCompleted, stepId],
        steps: buildSteps(idx + 1),
      },
    };
  },

  "golive.step.approve": () => ({
    approval: {
      ...sampleApproval,
      approvals: [
        sampleApproval,
        {
          approverEmail: "john@azfcu.org",
          approverName: "John Admin",
          approvedAt: new Date().toISOString(),
          notes: "Approved",
        },
      ],
      isApproved: true,
    },
  }),

  "golive.rollback": () => ({
    workflow: { ...sampleWorkflow, status: "rolled_back" },
  }),

  "golive.smoketest.run": () => ({ suite: sampleSmokeTests }),

  "golive.approval.status": () => ({ approval: sampleApproval }),

  "golive.monitor.dashboard": () => ({ metrics: samplePostLaunchMetrics }),

  "golive.status.public": () => ({ status: samplePublicStatus }),

  // Runbook generator
  "admin.runbooks.list": () => ({
    runbooks: [
      { name: "incident-response.md", generatedAt: isoDate(1), sizeBytes: 24500 },
      { name: "adapter-troubleshooting.md", generatedAt: isoDate(1), sizeBytes: 18200 },
      { name: "backup-restore-sop.md", generatedAt: isoDate(1), sizeBytes: 8900 },
      { name: "support-escalation.md", generatedAt: isoDate(1), sizeBytes: 6400 },
    ],
  }),

  "admin.runbooks.generate": () => ({
    runbooks: [
      { name: "incident-response.md", generatedAt: new Date().toISOString(), sizeBytes: 24500 },
      {
        name: "adapter-troubleshooting.md",
        generatedAt: new Date().toISOString(),
        sizeBytes: 18200,
      },
      { name: "backup-restore-sop.md", generatedAt: new Date().toISOString(), sizeBytes: 8900 },
      { name: "support-escalation.md", generatedAt: new Date().toISOString(), sizeBytes: 6400 },
    ],
  }),

  // Adapter setup
  "adapters.setup.test": () => ({
    results: [
      {
        adapter: "core-banking",
        provider: "Symitar",
        status: "healthy",
        latencyMs: 145,
        message: "Connection successful, API version 4.2 detected",
      },
      {
        adapter: "card-services",
        provider: "PSCU",
        status: "healthy",
        latencyMs: 210,
        message: "Connection successful",
      },
      {
        adapter: "bill-pay",
        provider: "Payveris",
        status: "healthy",
        latencyMs: 98,
        message: "Connection successful",
      },
      {
        adapter: "kyc",
        provider: "Alloy",
        status: "healthy",
        latencyMs: 320,
        message: "Connection successful, sandbox mode",
      },
      {
        adapter: "rdc",
        provider: "Mitek",
        status: "degraded",
        latencyMs: 4200,
        message: "Connection successful but latency exceeds 2000ms threshold",
      },
      {
        adapter: "wire-transfers",
        provider: "FedLine",
        status: "healthy",
        latencyMs: 180,
        message: "Connection successful",
      },
    ],
    summary: { total: 6, healthy: 5, degraded: 1, down: 0 },
    testedAt: new Date().toISOString(),
  }),

  "adapters.setup.save": () => ({
    success: true,
    savedAt: new Date().toISOString(),
  }),

  // Canary deployments
  "canary.deployments.list": () => ({ deployments: sampleDeployments }),

  "canary.deployments.update": (params) => {
    const dep = sampleDeployments.find((d) => d.id === params.deploymentId);
    if (!dep) return { error: "Deployment not found" };
    return {
      deployment: {
        ...dep,
        rolloutPercentage: (params.rolloutPercentage as number) ?? dep.rolloutPercentage,
        ...(params.status ? { status: params.status } : {}),
      },
    };
  },

  "canary.metrics": () => ({
    canary: {
      version: "1.3.0-rc.1",
      errorRate: 0.004,
      p50LatencyMs: 120,
      p95LatencyMs: 380,
      p99LatencyMs: 920,
      requestCount: 4520,
      successCount: 4502,
      failureCount: 18,
      periodStart: isoDate(1),
      periodEnd: new Date().toISOString(),
    },
    stable: {
      version: "1.2.0",
      errorRate: 0.001,
      p50LatencyMs: 110,
      p95LatencyMs: 340,
      p99LatencyMs: 780,
      requestCount: 45200,
      successCount: 45155,
      failureCount: 45,
      periodStart: isoDate(1),
      periodEnd: new Date().toISOString(),
    },
    verdict: "canary_acceptable",
    comparedAt: new Date().toISOString(),
  }),
};
