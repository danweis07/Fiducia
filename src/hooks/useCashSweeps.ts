import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { SweepRuleStatus, SweepFrequency, SweepDirection } from '@/types';

export function useSweepRules(status?: SweepRuleStatus) {
  return useQuery({
    queryKey: ['sweeps', 'rules', status],
    queryFn: () => gateway.cashSweeps.listRules({ status }),
  });
}

export function useCreateSweepRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      sourceAccountId: string;
      destinationAccountId: string;
      thresholdCents: number;
      targetBalanceCents?: number;
      direction: SweepDirection;
      frequency: SweepFrequency;
    }) => gateway.cashSweeps.createRule(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sweeps'] });
    },
  });
}

export function useUpdateSweepRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { ruleId: string; name?: string; thresholdCents?: number; targetBalanceCents?: number; frequency?: string; status?: string }) =>
      gateway.cashSweeps.updateRule(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sweeps'] });
    },
  });
}

export function useDeleteSweepRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => gateway.cashSweeps.deleteRule(ruleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sweeps'] });
    },
  });
}

export function useToggleSweepRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { ruleId: string; status: 'active' | 'paused' }) =>
      gateway.cashSweeps.toggleRule(params.ruleId, params.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sweeps'] });
    },
  });
}

export function useSweepExecutions(ruleId?: string) {
  return useQuery({
    queryKey: ['sweeps', 'executions', ruleId],
    queryFn: () => gateway.cashSweeps.listExecutions({ ruleId }),
  });
}

export function useSweepSummary() {
  return useQuery({
    queryKey: ['sweeps', 'summary'],
    queryFn: () => gateway.cashSweeps.getSummary(),
  });
}
