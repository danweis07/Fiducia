import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { SpendingAlertType } from '@/types';

export function useSpendingAlerts() {
  return useQuery({
    queryKey: ['spending-alerts'],
    queryFn: () => gateway.spendingAlerts.list(),
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      alertType: SpendingAlertType;
      thresholdCents?: number;
      categoryId?: string;
      accountId?: string;
      channels: ('push' | 'email' | 'sms')[];
    }) => gateway.spendingAlerts.create(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending-alerts'] });
      qc.invalidateQueries({ queryKey: ['spending-alerts', 'summary'] });
    },
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      alertId: string;
      name?: string;
      alertType?: SpendingAlertType;
      thresholdCents?: number;
      categoryId?: string;
      accountId?: string;
      channels?: ('push' | 'email' | 'sms')[];
      isEnabled?: boolean;
    }) => gateway.spendingAlerts.update(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending-alerts'] });
      qc.invalidateQueries({ queryKey: ['spending-alerts', 'summary'] });
    },
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => gateway.spendingAlerts.delete(alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spending-alerts'] });
      qc.invalidateQueries({ queryKey: ['spending-alerts', 'summary'] });
    },
  });
}

export function useAlertHistory(limit?: number, offset?: number) {
  return useQuery({
    queryKey: ['spending-alerts', 'history', limit, offset],
    queryFn: () => gateway.spendingAlerts.history({ limit, offset }),
  });
}

export function useAlertSummary() {
  return useQuery({
    queryKey: ['spending-alerts', 'summary'],
    queryFn: () => gateway.spendingAlerts.summary(),
  });
}
