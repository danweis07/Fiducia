/**
 * Go-Live Orchestration Hooks
 *
 * TanStack React Query hooks for go-live workflows, smoke tests,
 * canary deployments, runbooks, and adapter configuration.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type {
  GoLiveWorkflow,
  GoLiveStepId,
  SmokeTestSuite,
  PostLaunchMetrics,
  ApprovalRecord,
} from "@/types/golive";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunbookEntry {
  name: string;
  generatedAt: string;
  sizeBytes: number;
}

export interface CanaryDeployment {
  id: string;
  version: string;
  rolloutPercentage: number;
  status: "pending" | "rolling_out" | "stable" | "rolled_back";
  errorRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface CanaryMetrics {
  deploymentId: string;
  errorRate: number;
  p95LatencyMs: number;
  requestCount: number;
  rolloutPercentage: number;
  sampledAt: string;
}

export interface AdapterConnectionResult {
  domain: string;
  provider: string;
  connected: boolean;
  latencyMs: number;
  error?: string;
}

export interface AdapterConfig {
  domain: string;
  provider: string;
  credentials: Record<string, unknown>;
  options?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// GO-LIVE WORKFLOW
// ---------------------------------------------------------------------------

export function useGoLiveWorkflow() {
  return useQuery({
    queryKey: ["golive-workflow"],
    queryFn: () => gateway.request<{ workflow: GoLiveWorkflow }>("golive.status", {}),
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
    },
  });
}

export function useApproveGoLiveStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { comment: string }) =>
      gateway.request<{ approval: ApprovalRecord }>("golive.step.approve", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["golive-workflow"] });
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
// POST-LAUNCH MONITORING
// ---------------------------------------------------------------------------

export function usePostLaunchMetrics(workflowId: string) {
  return useQuery({
    queryKey: ["golive-post-launch-metrics", workflowId],
    queryFn: () =>
      gateway.request<{ metrics: PostLaunchMetrics }>("golive.monitor.dashboard", { workflowId }),
    enabled: !!workflowId,
    refetchInterval: 30_000,
  });
}

// ---------------------------------------------------------------------------
// RUNBOOKS
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ADAPTER CONFIGURATION
// ---------------------------------------------------------------------------

export function useTestAdapterConnection() {
  return useMutation({
    mutationFn: (params: {
      domain: string;
      provider: string;
      credentials: Record<string, unknown>;
    }) =>
      gateway.request<{ result: AdapterConnectionResult }>("adapters.setup.healthcheck", params),
  });
}

export function useSaveAdapterConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: AdapterConfig) =>
      gateway.request<{ success: boolean }>("adapters.setup.save", {
        ...params,
      } as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["golive-workflow"] });
    },
  });
}

// ---------------------------------------------------------------------------
// CANARY DEPLOYMENTS
// ---------------------------------------------------------------------------

export function useCanaryDeployments() {
  return useQuery({
    queryKey: ["canary-deployments"],
    queryFn: () =>
      gateway.request<{ deployments: CanaryDeployment[] }>("deployments.canary.list", {}),
  });
}

export function useUpdateCanaryDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      deploymentId: string;
      rolloutPercentage?: number;
      status?: "rolling_out" | "stable" | "rolled_back";
    }) => gateway.request<{ deployment: CanaryDeployment }>("deployments.canary.update", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["canary-deployments"] }),
  });
}

export function useCanaryMetrics(deploymentId: string) {
  return useQuery({
    queryKey: ["canary-metrics", deploymentId],
    queryFn: () =>
      gateway.request<{ metrics: CanaryMetrics }>("deployments.canary.metrics", { deploymentId }),
    enabled: !!deploymentId,
    refetchInterval: 30_000,
  });
}
