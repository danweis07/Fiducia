import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export const ekycKeys = {
  all: ['ekyc'] as const,
  providers: (countryCode?: string) => ['ekyc', 'providers', countryCode] as const,
  verifications: (status?: string) => ['ekyc', 'verifications', status] as const,
  verification: (id: string) => ['ekyc', 'verification', id] as const,
};

export function useEKYCProviders(countryCode?: string) {
  return useQuery({
    queryKey: ekycKeys.providers(countryCode),
    queryFn: () => gateway.ekyc.listProviders({ countryCode }),
    staleTime: 1000 * 60 * 5,
  });
}

export function useInitiateEKYC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      provider: string;
      countryCode: string;
      documentType: string;
      documentNumber?: string;
    }) => gateway.ekyc.initiate(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ekycKeys.all });
    },
  });
}

export function useEKYCStatus(verificationId: string) {
  return useQuery({
    queryKey: ekycKeys.verification(verificationId),
    queryFn: () => gateway.ekyc.getStatus(verificationId),
    enabled: !!verificationId,
    staleTime: 1000 * 60,
  });
}

export function useStartLiveness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (verificationId: string) => gateway.ekyc.startLiveness(verificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ekycKeys.all });
    },
  });
}

export function useCompleteLiveness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { challengeId: string; sessionData: string }) =>
      gateway.ekyc.completeLiveness(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ekycKeys.all });
    },
  });
}

export function useEKYCVerifications(status?: string) {
  return useQuery({
    queryKey: ekycKeys.verifications(status),
    queryFn: () => gateway.ekyc.listVerifications({ status }),
    staleTime: 1000 * 60 * 2,
  });
}
