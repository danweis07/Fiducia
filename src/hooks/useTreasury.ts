import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export function useTreasuryVaults() {
  return useQuery({
    queryKey: ['treasury', 'vaults'],
    queryFn: () => gateway.treasury.listVaults(),
  });
}

export function useCreateTreasuryVault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; linkedAccountId: string; providerName: string; initialDepositCents?: number }) =>
      gateway.treasury.createVault(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury'] });
    },
  });
}

export function useCloseTreasuryVault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vaultId: string) => gateway.treasury.closeVault(vaultId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury'] });
    },
  });
}

export function useTreasurySummary() {
  return useQuery({
    queryKey: ['treasury', 'summary'],
    queryFn: () => gateway.treasury.getSummary(),
  });
}
