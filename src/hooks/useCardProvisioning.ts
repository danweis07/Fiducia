import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { WalletProvider } from '@/types';

export const cardProvisioningKeys = {
  all: ['cardProvisioning'] as const,
  config: () => ['cardProvisioning', 'config'] as const,
  eligibility: (cardId: string, wallet: WalletProvider) => ['cardProvisioning', 'eligibility', cardId, wallet] as const,
};

export function useProvisioningConfig() {
  return useQuery({
    queryKey: cardProvisioningKeys.config(),
    queryFn: () => gateway.cardProvisioning.config(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useProvisioningEligibility(cardId: string, walletProvider: WalletProvider) {
  return useQuery({
    queryKey: cardProvisioningKeys.eligibility(cardId, walletProvider),
    queryFn: () => gateway.cardProvisioning.checkEligibility(cardId, walletProvider),
    enabled: !!cardId && !!walletProvider,
  });
}

export function useInitiateProvisioning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, walletProvider, deviceId }: { cardId: string; walletProvider: WalletProvider; deviceId?: string }) =>
      gateway.cardProvisioning.initiate(cardId, walletProvider, deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardProvisioningKeys.all });
    },
  });
}

export function useCompleteProvisioning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provisioningId, cardId, walletProvider, walletToken }: {
      provisioningId: string; cardId: string; walletProvider: WalletProvider; walletToken: string;
    }) => gateway.cardProvisioning.complete(provisioningId, cardId, walletProvider, walletToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardProvisioningKeys.all });
    },
  });
}

export function useCardCredentials() {
  return useMutation({
    mutationFn: (cardId: string) => gateway.cardProvisioning.credentials(cardId),
  });
}

export function useRequestDigitalOnlyCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => gateway.cardProvisioning.requestDigitalOnly(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardProvisioningKeys.all });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

export function useRequestPhysicalCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => gateway.cardProvisioning.requestPhysical(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardProvisioningKeys.all });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

export function useReportAndReplaceCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, reason, digitalOnly }: { cardId: string; reason: 'lost' | 'stolen'; digitalOnly?: boolean }) =>
      gateway.cardProvisioning.reportAndReplace(cardId, reason, digitalOnly),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardProvisioningKeys.all });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}
