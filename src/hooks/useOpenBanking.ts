import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { OpenBankingConsentStatus, OpenBankingScope } from '@/types';

export const openBankingKeys = {
  all: ['openBanking'] as const,
  consents: (status?: OpenBankingConsentStatus) => ['openBanking', 'consents', status] as const,
  consent: (id: string) => ['openBanking', 'consents', id] as const,
  accessLogs: (consentId?: string) => ['openBanking', 'accessLogs', consentId] as const,
  summary: () => ['openBanking', 'summary'] as const,
};

export function useOpenBankingConsents(status?: OpenBankingConsentStatus) {
  return useQuery({
    queryKey: openBankingKeys.consents(status),
    queryFn: () => gateway.openBanking.listConsents({ status }),
    staleTime: 1000 * 60 * 2,
  });
}

export function useOpenBankingConsent(consentId: string) {
  return useQuery({
    queryKey: openBankingKeys.consent(consentId),
    queryFn: () => gateway.openBanking.getConsent(consentId),
    enabled: !!consentId,
  });
}

export function useOpenBankingAccessLogs(consentId?: string) {
  return useQuery({
    queryKey: openBankingKeys.accessLogs(consentId),
    queryFn: () => gateway.openBanking.listAccessLogs({ consentId }),
    staleTime: 1000 * 60,
  });
}

export function useOpenBankingConsentSummary() {
  return useQuery({
    queryKey: openBankingKeys.summary(),
    queryFn: () => gateway.openBanking.getConsentSummary(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useGrantConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      providerName: string;
      providerId: string;
      scopes: OpenBankingScope[];
      accountIds?: string[];
      expiresInDays?: number;
      providerLogo?: string;
      providerUrl?: string;
    }) => gateway.openBanking.grantConsent(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openBankingKeys.all });
    },
  });
}

export function useRevokeConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consentId: string) => gateway.openBanking.revokeConsent(consentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openBankingKeys.all });
    },
  });
}
