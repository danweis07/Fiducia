import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { OverdraftProtectionType } from '@/types';

export function useOverdraftSettings(accountId: string | undefined) {
  return useQuery({
    queryKey: ['overdraft', 'settings', accountId],
    queryFn: () => gateway.overdraft.getSettings(accountId!),
    enabled: !!accountId,
  });
}

export function useUpdateOverdraftSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      accountId: string;
      isEnabled?: boolean;
      protectionType?: OverdraftProtectionType | null;
      linkedAccountId?: string | null;
      courtesyPayLimitCents?: number | null;
      optedIntoOverdraftFees?: boolean;
    }) => gateway.overdraft.updateSettings(params),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['overdraft', 'settings', variables.accountId] });
    },
  });
}

export function useOverdraftHistory(accountId: string | undefined, limit?: number, offset?: number) {
  return useQuery({
    queryKey: ['overdraft', 'history', accountId, limit, offset],
    queryFn: () => gateway.overdraft.getHistory(accountId!, limit, offset),
    enabled: !!accountId,
  });
}

export function useOverdraftFeeSchedule() {
  return useQuery({
    queryKey: ['overdraft', 'feeSchedule'],
    queryFn: () => gateway.overdraft.getFeeSchedule(),
  });
}
