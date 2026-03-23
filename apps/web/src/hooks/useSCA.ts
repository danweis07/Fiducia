import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const scaKeys = {
  all: ["sca"] as const,
  config: () => ["sca", "config"] as const,
  challenges: () => ["sca", "challenges"] as const,
  devices: () => ["sca", "devices"] as const,
};

export function useSCAConfig() {
  return useQuery({
    queryKey: scaKeys.config(),
    queryFn: () => gateway.sca.getConfig(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateSCAChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      triggerAction: string;
      paymentAmountCents?: number;
      paymentCurrency?: string;
      payeeName?: string;
    }) => gateway.sca.createChallenge(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scaKeys.challenges() });
    },
  });
}

export function useVerifySCAFactor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { challengeId: string; factorType: string; credential: string }) =>
      gateway.sca.verifyFactor(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scaKeys.challenges() });
    },
  });
}

export function useSCATrustedDevices() {
  return useQuery({
    queryKey: scaKeys.devices(),
    queryFn: () => gateway.sca.listTrustedDevices(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useBindSCADevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      deviceName: string;
      deviceType: string;
      platform: string;
      pushToken?: string;
    }) => gateway.sca.bindDevice(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scaKeys.devices() });
    },
  });
}

export function useUnbindSCADevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId: string) => gateway.sca.unbindDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scaKeys.devices() });
    },
  });
}
