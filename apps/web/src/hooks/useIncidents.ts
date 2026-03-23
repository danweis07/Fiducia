/**
 * React Query hooks for incidents, rollbacks, change requests, and system health.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type {
  IncidentSeverity,
  IncidentStatus,
  ChangeRequestStatus,
  RollbackType,
} from "@/types/incident";

// =============================================================================
// INCIDENTS
// =============================================================================

export function useIncidents(params?: { status?: IncidentStatus; severity?: IncidentSeverity }) {
  return useQuery({
    queryKey: ["incidents", params],
    queryFn: () => gateway.incidents.list(params),
  });
}

export function useIncident(incidentId: string) {
  return useQuery({
    queryKey: ["incidents", incidentId],
    queryFn: () => gateway.incidents.get(incidentId),
    enabled: !!incidentId,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      title: string;
      description?: string;
      severity: IncidentSeverity;
      detectionSource?: string;
      affectedServices?: string[];
    }) => gateway.incidents.create(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      incidentId: string;
      status?: IncidentStatus;
      assignedTo?: string;
      resolutionSummary?: string;
    }) => gateway.incidents.update(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useAddIncidentTimeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { incidentId: string; action: string; actor: string; detail: string }) =>
      gateway.incidents.addTimeline(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useNotifyStakeholders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { incidentId: string; channels: string[]; stakeholders: string[] }) =>
      gateway.incidents.notifyStakeholders(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

// =============================================================================
// ROLLBACKS
// =============================================================================

export function useRollbacks(incidentId?: string) {
  return useQuery({
    queryKey: ["rollbacks", incidentId],
    queryFn: () => gateway.rollbacks.list({ incidentId }),
  });
}

export function useInitiateRollback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      incidentId: string;
      fromVersion: string;
      toVersion: string;
      rollbackType: RollbackType;
    }) => gateway.rollbacks.initiate(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rollbacks"] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

// =============================================================================
// CHANGE REQUESTS
// =============================================================================

export function useChangeRequests(status?: ChangeRequestStatus) {
  return useQuery({
    queryKey: ["changeRequests", status],
    queryFn: () => gateway.changeRequests.list({ status }),
  });
}

export function useChangeRequest(changeRequestId: string) {
  return useQuery({
    queryKey: ["changeRequests", changeRequestId],
    queryFn: () => gateway.changeRequests.get(changeRequestId),
    enabled: !!changeRequestId,
  });
}

export function useCreateChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      title: string;
      description?: string;
      changeType: string;
      gitBranch?: string;
      prUrl?: string;
    }) => gateway.changeRequests.create(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["changeRequests"] });
    },
  });
}

export function useUpdateChangeRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { changeRequestId: string; status: ChangeRequestStatus }) =>
      gateway.changeRequests.updateStatus(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["changeRequests"] });
    },
  });
}

// =============================================================================
// SYSTEM HEALTH & DEPLOYMENTS
// =============================================================================

export function useSystemHealth() {
  return useQuery({
    queryKey: ["systemHealth"],
    queryFn: () => gateway.systemHealth.snapshot(),
    refetchInterval: 30_000,
  });
}

export function useDeployments(limit?: number) {
  return useQuery({
    queryKey: ["deployments", limit],
    queryFn: () => gateway.systemHealth.deployments({ limit }),
  });
}
