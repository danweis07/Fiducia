import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { InternationalConsentStatus, InternationalConsentScope, ConsentRegulation } from '@/types';

export const internationalConsentKeys = {
  all: ['internationalConsents'] as const,
  consents: (status?: InternationalConsentStatus) => ['internationalConsents', 'consents', status] as const,
  accessLogs: (consentId?: string) => ['internationalConsents', 'accessLogs', consentId] as const,
  summary: () => ['internationalConsents', 'summary'] as const,
};

export function useInternationalConsents(status?: InternationalConsentStatus, regulation?: ConsentRegulation) {
  return useQuery({
    queryKey: internationalConsentKeys.consents(status),
    queryFn: () => gateway.internationalConsents.list({ status, regulation }),
    staleTime: 1000 * 60 * 2,
  });
}

export function useInternationalConsentAccessLogs(consentId?: string) {
  return useQuery({
    queryKey: internationalConsentKeys.accessLogs(consentId),
    queryFn: () => gateway.internationalConsents.accessLogs({ consentId }),
    staleTime: 1000 * 60,
  });
}

export function useInternationalConsentSummary() {
  return useQuery({
    queryKey: internationalConsentKeys.summary(),
    queryFn: () => gateway.internationalConsents.summary(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useRevokeInternationalConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consentId: string) => gateway.internationalConsents.revoke(consentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internationalConsentKeys.all });
    },
  });
}

export function useRevokeInternationalConsentScope() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { consentId: string; scope: InternationalConsentScope }) =>
      gateway.internationalConsents.revokeScope(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internationalConsentKeys.all });
    },
  });
}
