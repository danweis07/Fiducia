import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { WireFeeSchedule, WireLimits } from '@/types';

export const wireKeys = {
  all: ['wires'] as const,
  list: (params: Record<string, unknown>) => ['wires', 'list', params] as const,
  detail: (id: string) => ['wires', id] as const,
  fees: () => ['wires', 'fees'] as const,
  limits: () => ['wires', 'limits'] as const,
};

export function useWires(params: { status?: string; type?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: wireKeys.list(params),
    queryFn: () => gateway.wires.list(params),
  });
}

export function useWire(id: string) {
  return useQuery({
    queryKey: wireKeys.detail(id),
    queryFn: () => gateway.wires.get(id),
    enabled: !!id,
  });
}

export function useCreateDomesticWire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      fromAccountId: string; beneficiaryName: string; bankName: string;
      routingNumber: string; accountNumber: string; amountCents: number;
      memo?: string; purpose: string;
    }) => gateway.wires.createDomestic(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wireKeys.all });
    },
  });
}

export function useCreateInternationalWire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      fromAccountId: string; beneficiaryName: string; swiftCode: string;
      iban: string; bankName: string; bankCountry: string;
      amountCents: number; currency: string; memo?: string; purpose: string;
    }) => gateway.wires.createInternational(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wireKeys.all });
    },
  });
}

export function useCancelWire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gateway.wires.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wireKeys.all });
    },
  });
}

export function useWireFees() {
  return useQuery<{ fees: WireFeeSchedule }>({
    queryKey: wireKeys.fees(),
    queryFn: () => gateway.wires.fees(),
    staleTime: 1000 * 60 * 30, // 30 min
  });
}

export function useWireLimits() {
  return useQuery<{ limits: WireLimits }>({
    queryKey: wireKeys.limits(),
    queryFn: () => gateway.wires.limits(),
    staleTime: 1000 * 60 * 2, // 2 min
  });
}
