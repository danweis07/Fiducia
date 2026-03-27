/**
 * Go-Live Orchestration Hooks
 *
 * TanStack React Query hooks for go-live workflows, smoke tests,
 * post-launch monitoring, and canary deployments.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type {
  GoLiveWorkflow,
  GoLiveEvent,
  GoLiveStepId,
  SmokeTestSuite,
  PostLaunchMetrics,
  TenantDeployment,
  GoLiveStatusPublic,
  ApprovalGate,
} from "@/types/golive";

// ---------------------------------------------------------------------------
// GO-LIVE WORKFLOW
// ---------------------------------------------------------------------------

export function useGoLiveWorkflow() {
  return useQuery({
    queryKey: ["golive-workflow"],
    queryFn: () => gateway.request<{ workflow: GoLiveWorkflow }>("golive.status", {}),
  });
}

export function useGoLiveEvents(workflowId: string) {
  return useQuery({
    queryKey: ["golive-events", workflowId],
    queryFn: () => gateway.request<{ events: GoLiveEvent[] }>("golive.events.list", { workflowId }),
    enabled: !!workflowId,
  });
}

export function useStartGoLive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gateway.request<{ workflow: GoLiveWorkflow }>("golive.start", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["golive-workflow"] }),
  });
}

export function useExecuteGoLiveStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stepId: GoLiveStepId) =>
      gateway.request<{ workflow: GoLiveWorkflow }>("golive.step.execute", { stepId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["golive-workflow"] });
      qc.invalidateQueries({ queryKey: ["golive-events"] });
    },
  });
}

export function useApproveGoLiveStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { comment: string }) =>
      gateway.request<{ approval: ApprovalGate }>("golive.step.approve", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["golive-workflow"] });
      qc.invalidateQueries({ queryKey: ["golive-approval"] });
    },
  });
}

export function useRollbackGoLive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gateway.request<{ workflow: GoLiveWorkflow }>("golive.rollback", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["golive-workflow"] }),
  });
}

// ---------------------------------------------------------------------------
// SMOKE TESTS
// ---------------------------------------------------------------------------

export function useRunSmokeTests() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gateway.request<{ suite: SmokeTestSuite }>("golive.smoketest.run", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["golive-workflow"] }),
  });
}

// ---------------------------------------------------------------------------
// APPROVAL GATE
// ---------------------------------------------------------------------------

export function useApprovalStatus() {
  return useQuery({
    queryKey: ["golive-approval"],
    queryFn: () => gateway.request<{ approval: ApprovalGate }>("golive.approval.status", {}),
  });
}

// ---------------------------------------------------------------------------
// POST-LAUNCH MONITORING
// ---------------------------------------------------------------------------

export function usePostLaunchMetrics() {
  return useQuery({
    queryKey: ["golive-post-launch-metrics"],
    queryFn: () => gateway.request<{ metrics: PostLaunchMetrics }>("golive.monitor.dashboard", {}),
    refetchInterval: 30_000,
  });
}

// ---------------------------------------------------------------------------
// PUBLIC STATUS PAGE
// ---------------------------------------------------------------------------

export function useGoLivePublicStatus(workflowId: string) {
  return useQuery({
    queryKey: ["golive-public-status", workflowId],
    queryFn: () =>
      gateway.request<{ status: GoLiveStatusPublic }>("golive.status.public", { workflowId }),
    enabled: !!workflowId,
    refetchInterval: 15_000,
  });
}

// ---------------------------------------------------------------------------
// CANARY DEPLOYMENTS
// ---------------------------------------------------------------------------

export function useDeployments() {
  return useQuery({
    queryKey: ["tenant-deployments"],
    queryFn: () => gateway.request<{ deployments: TenantDeployment[] }>("deployments.list", {}),
  });
}

export function useCreateDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      version: string;
      rolloutPercentage: number;
      errorRateThreshold?: number;
    }) => gateway.request<{ deployment: TenantDeployment }>("deployments.create", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-deployments"] }),
  });
}

export function useUpdateDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      deploymentId: string;
      rolloutPercentage?: number;
      pinned?: boolean;
      autoRollback?: boolean;
    }) => gateway.request<{ deployment: TenantDeployment }>("deployments.update", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-deployments"] }),
  });
}

export function useRollbackDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deploymentId: string) =>
      gateway.request<{ deployment: TenantDeployment }>("deployments.rollback", { deploymentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-deployments"] }),
  });
}

// ---------------------------------------------------------------------------
// RUNBOOK GENERATOR
// ---------------------------------------------------------------------------

export interface RunbookEntry {
  name: string;
  generatedAt: string;
  sizeBytes: number;
}

export function useRunbooks() {
  return useQuery({
    queryKey: ["admin-runbooks"],
    queryFn: () => gateway.request<{ runbooks: RunbookEntry[] }>("admin.runbooks.list", {}),
  });
}

export function useGenerateRunbooks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gateway.request<{ runbooks: RunbookEntry[] }>("admin.runbooks.generate", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-runbooks"] }),
  });
}
