import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const disputeKeys = {
  all: ["disputes"] as const,
  list: (params?: Record<string, unknown>) => ["disputes", "list", params] as const,
  detail: (id: string) => ["disputes", "detail", id] as const,
  timeline: (id: string) => ["disputes", "timeline", id] as const,
};

export function useDisputes(params: { status?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: disputeKeys.list(params as Record<string, unknown>),
    queryFn: () => gateway.disputes.list(params),
  });
}

export function useDispute(disputeId: string) {
  return useQuery({
    queryKey: disputeKeys.detail(disputeId),
    queryFn: () => gateway.disputes.get(disputeId),
    enabled: !!disputeId,
  });
}

export function useFileDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      transactionId: string;
      reason: string;
      description: string;
      contactPhone?: string;
      contactEmail?: string;
    }) => gateway.disputes.file(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.all });
    },
  });
}

export function useAddDisputeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      disputeId: string;
      documentType: string;
      description: string;
      fileName: string;
    }) => gateway.disputes.addDocument(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.detail(variables.disputeId) });
    },
  });
}

export function useCancelDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ disputeId, reason }: { disputeId: string; reason: string }) =>
      gateway.disputes.cancel(disputeId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: disputeKeys.all });
    },
  });
}

export function useDisputeTimeline(disputeId: string) {
  return useQuery({
    queryKey: disputeKeys.timeline(disputeId),
    queryFn: () => gateway.disputes.timeline(disputeId),
    enabled: !!disputeId,
  });
}
