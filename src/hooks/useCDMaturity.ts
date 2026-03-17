import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import { accountKeys } from '@/hooks/useAccounts';

export const cdKeys = {
  maturity: (accountId: string) => ['cd', 'maturity', accountId] as const,
};

export function useCDMaturity(accountId: string) {
  return useQuery({
    queryKey: cdKeys.maturity(accountId),
    queryFn: () => gateway.cd.maturity(accountId),
    enabled: !!accountId,
  });
}

export function useUpdateCDMaturityAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, maturityAction, maturityTransferAccountId }: {
      accountId: string;
      maturityAction: string;
      maturityTransferAccountId?: string;
    }) => gateway.cd.updateMaturityAction(accountId, maturityAction, maturityTransferAccountId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cdKeys.maturity(variables.accountId) });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(variables.accountId) });
    },
  });
}
