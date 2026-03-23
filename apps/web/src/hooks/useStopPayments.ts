import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const stopPaymentKeys = {
  all: ["stopPayments"] as const,
  list: (params: Record<string, unknown>) => ["stopPayments", "list", params] as const,
  detail: (id: string) => ["stopPayments", id] as const,
  fee: () => ["stopPayments", "fee"] as const,
};

export function useStopPayments(
  params: { status?: string; accountId?: string; limit?: number; offset?: number } = {},
) {
  return useQuery({
    queryKey: stopPaymentKeys.list(params),
    queryFn: () => gateway.stopPayments.list(params),
  });
}

export function useStopPayment(id: string) {
  return useQuery({
    queryKey: stopPaymentKeys.detail(id),
    queryFn: () => gateway.stopPayments.get(id),
    enabled: !!id,
  });
}

export function useCreateStopPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      accountId: string;
      checkNumber: string;
      checkNumberEnd?: string;
      payeeName?: string;
      amountCents?: number;
      amountRangeLowCents?: number;
      amountRangeHighCents?: number;
      reason: string;
      duration: "6months" | "12months" | "permanent";
    }) => gateway.stopPayments.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stopPaymentKeys.all });
    },
  });
}

export function useCancelStopPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gateway.stopPayments.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stopPaymentKeys.all });
    },
  });
}

export function useRenewStopPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      stopPaymentId: string;
      duration: "6months" | "12months" | "permanent";
    }) => gateway.stopPayments.renew(input.stopPaymentId, input.duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stopPaymentKeys.all });
    },
  });
}

export function useStopPaymentFee() {
  return useQuery<{ feeCents: number }>({
    queryKey: stopPaymentKeys.fee(),
    queryFn: () => gateway.stopPayments.fee(),
    staleTime: 1000 * 60 * 30, // 30 min
  });
}
