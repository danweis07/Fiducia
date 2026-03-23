import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { ApprovalStatus } from "@/types";

export function useApprovalRequests(status?: ApprovalStatus) {
  return useQuery({
    queryKey: ["approvals", "requests", status],
    queryFn: () => gateway.approvals.listRequests({ status }),
  });
}

export function useApprovalRequest(requestId: string) {
  return useQuery({
    queryKey: ["approvals", "requests", requestId],
    queryFn: () => gateway.approvals.getRequest(requestId),
    enabled: !!requestId,
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { requestId: string; mfaToken?: string }) =>
      gateway.approvals.approve(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

export function useDenyRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { requestId: string; reason?: string }) => gateway.approvals.deny(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

export function useCancelApprovalRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => gateway.approvals.cancel(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

export function useApprovalPolicies() {
  return useQuery({
    queryKey: ["approvals", "policies"],
    queryFn: () => gateway.approvals.listPolicies(),
  });
}

export function useCreateApprovalPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      actionType: string;
      thresholdCents: number;
      approverRoles: string[];
      autoExpireMinutes: number;
      notifyChannels: string[];
      requireMfa?: boolean;
    }) => gateway.approvals.createPolicy(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals", "policies"] });
    },
  });
}

export function useUpdateApprovalPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      policyId: string;
      name?: string;
      thresholdCents?: number;
      autoExpireMinutes?: number;
      notifyChannels?: string[];
      isEnabled?: boolean;
    }) => gateway.approvals.updatePolicy(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals", "policies"] });
    },
  });
}

export function useDeleteApprovalPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyId: string) => gateway.approvals.deletePolicy(policyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals", "policies"] });
    },
  });
}

export function useApprovalSummary() {
  return useQuery({
    queryKey: ["approvals", "summary"],
    queryFn: () => gateway.approvals.getSummary(),
  });
}
