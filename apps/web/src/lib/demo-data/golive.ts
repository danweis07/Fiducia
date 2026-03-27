/**
 * Demo Data — Go-Live Orchestration
 *
 * Mock responses for go-live workflow, smoke tests, post-launch monitoring,
 * and canary deployment actions.
 */

import type {
  GoLiveWorkflow,
  GoLiveStep,
  GoLiveEvent,
  SmokeTestSuite,
  PostLaunchMetrics,
  TenantDeployment,
  GoLiveStatusPublic,
  ApprovalGate,
} from "@/types/golive";

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// GO-LIVE STEPS
// ---------------------------------------------------------------------------

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
    startedAt: i <= completedCount ? isoDate(7 - i) : undefined,
    completedAt: i < completedCount ? isoDate(7 - i) : undefined,
  }));
}

const sampleWorkflow: GoLiveWorkflow = {
  id: "wf-001",
  firmId: "demo-tenant",
  status: "in_progress",
  currentStep: "smoke_tests",
  stepsCompleted: ["provision", "adapters", "data_import"],
  stepResults: {
    provision: { projectRef: "azfcu-prod", migrationsApplied: 43, edgeFunctionsDeployed: 11 },
    adapters: { configured: 6, healthy: 6, degraded: 0, down: 0 },
    data_import: { batches: 3, totalRecords: 37250, reconciliationPassed: true },
    smoke_tests: {},
    approval: {},
    dns_cutover: {},
    post_launch_monitor: {},
  },
  steps: buildSteps(3),
  startedBy: "user-admin-001",
  startedAt: isoDate(7),
  completedAt: null,
  metadata: { institutionName: "Arizona Federal Credit Union", template: "us-credit-union" },
  createdAt: isoDate(7),
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
  runAt: isoDate(3),
  overallStatus: "pass",
  tests: [
    {
      name: "Authentication",
      description: "Sign in with test credentials",
      status: "pass",
      durationMs: 245,
    },
    {
      name: "Account List",
      description: "Fetch accounts.list and verify data",
      status: "pass",
      durationMs: 132,
    },
    {
      name: "Account Detail",
      description: "Fetch individual account with balance",
      status: "pass",
      durationMs: 98,
    },
    {
      name: "Internal Transfer",
      description: "Dry-run transfer between accounts",
      status: "pass",
      durationMs: 310,
    },
    {
      name: "Bill Pay Payees",
      description: "List bill pay payees",
      status: "pass",
      durationMs: 87,
    },
    { name: "Card List", description: "Fetch card data", status: "pass", durationMs: 105 },
    {
      name: "RDC Upload",
      description: "Test remote deposit capture flow",
      status: "skip",
      durationMs: 0,
      details: { reason: "RDC adapter not configured" },
    },
    {
      name: "Wire Transfer",
      description: "Dry-run wire transfer",
      status: "pass",
      durationMs: 420,
    },
    {
      name: "Adapter Health",
      description: "All configured adapters responding",
      status: "pass",
      durationMs: 1200,
    },
    {
      name: "Audit Logging",
      description: "Verify audit entries created",
      status: "pass",
      durationMs: 67,
    },
  ],
  passCount: 8,
  failCount: 0,
  skipCount: 1,
};

const sampleApproval: ApprovalGate = {
  required: 2,
  received: [
    {
      userId: "user-admin-001",
      userName: "Jane Doe",
      role: "owner",
      approvedAt: isoDate(2),
      comment: "All checks passed. Approved for cutover.",
    },
  ],
  isApproved: false,
};

const samplePostLaunchMetrics: PostLaunchMetrics = {
  errorRate: 0.002,
  p95LatencyMs: 340,
  totalLogins: 3847,
  totalTransactions: 12560,
  activeUsers: 2103,
  adapterHealth: {
    "core-banking": "healthy",
    "card-services": "healthy",
    "bill-pay": "healthy",
    kyc: "healthy",
    rdc: "degraded",
    "wire-transfers": "healthy",
  },
  alerts: [
    {
      id: "alert-001",
      severity: "warning",
      message: "RDC processing latency elevated (p95: 4.2s)",
      timestamp: isoDate(0),
      resolved: false,
    },
  ],
  uptimePercent: 99.97,
  periodStart: isoDate(1),
  periodEnd: new Date().toISOString(),
};

const sampleDeployments: TenantDeployment[] = [
  {
    id: "deploy-001",
    firmId: "demo-tenant",
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
    firmId: "demo-tenant",
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

const samplePublicStatus: GoLiveStatusPublic = {
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

// ---------------------------------------------------------------------------
// HANDLERS
// ---------------------------------------------------------------------------

export const goliveHandlers: Record<string, (params: Record<string, unknown>) => unknown> = {
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
      received: [
        ...sampleApproval.received,
        {
          userId: "user-admin-002",
          userName: "John Admin",
          role: "admin",
          approvedAt: new Date().toISOString(),
          comment: "Approved",
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

  // Canary deployments
  "deployments.list": () => ({ deployments: sampleDeployments }),

  "deployments.create": (params) => ({
    deployment: {
      ...sampleDeployments[1],
      id: "deploy-new-" + Date.now(),
      version: (params.version as string) ?? "1.3.0",
      rolloutPercentage: (params.rolloutPercentage as number) ?? 10,
    },
  }),

  "deployments.update": (params) => {
    const dep = sampleDeployments.find((d) => d.id === params.deploymentId);
    if (!dep) return { error: "Not found" };
    return { deployment: { ...dep, ...params } };
  },

  "deployments.rollback": (params) => {
    const dep = sampleDeployments.find((d) => d.id === params.deploymentId);
    if (!dep) return { error: "Not found" };
    return { deployment: { ...dep, status: "rolling_back", rolloutPercentage: 0 } };
  },

  // Runbook generator
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
      { name: "tenant-runbook-demo.md", generatedAt: new Date().toISOString(), sizeBytes: 31000 },
    ],
  }),

  "admin.runbooks.list": () => ({
    runbooks: [
      { name: "incident-response.md", generatedAt: isoDate(1), sizeBytes: 24500 },
      { name: "adapter-troubleshooting.md", generatedAt: isoDate(1), sizeBytes: 18200 },
      { name: "backup-restore-sop.md", generatedAt: isoDate(1), sizeBytes: 8900 },
      { name: "support-escalation.md", generatedAt: isoDate(1), sizeBytes: 6400 },
      { name: "tenant-runbook-demo.md", generatedAt: isoDate(1), sizeBytes: 31000 },
    ],
  }),
};
