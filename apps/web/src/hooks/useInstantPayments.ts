import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { InstantPaymentRail } from "@/types";

export interface InstantPaymentListParams {
  accountId?: string;
  direction?: string;
  status?: string;
  rail?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const instantPaymentKeys = {
  all: ["instantPayments"] as const,
  list: (params: InstantPaymentListParams) => ["instantPayments", "list", params] as const,
  detail: (id: string) => ["instantPayments", id] as const,
  limits: ["instantPayments", "limits"] as const,
  receiver: (routing: string) => ["instantPayments", "receiver", routing] as const,
};

export function useInstantPayments(params: InstantPaymentListParams = {}) {
  return useQuery({
    queryKey: instantPaymentKeys.list(params),
    queryFn: () => gateway.instantPayments.list(params),
    staleTime: 1000 * 30, // 30 sec — real-time payments need fresher data
  });
}

export function useInstantPayment(paymentId: string) {
  return useQuery({
    queryKey: instantPaymentKeys.detail(paymentId),
    queryFn: () => gateway.instantPayments.get(paymentId),
    enabled: !!paymentId,
    refetchInterval: (query) => {
      const status = query.state.data?.payment?.status;
      // Poll while pending/accepted — stop when terminal
      return status === "pending" || status === "accepted" ? 3000 : false;
    },
  });
}

export function useInstantPaymentLimits() {
  return useQuery({
    queryKey: instantPaymentKeys.limits,
    queryFn: () => gateway.instantPayments.limits(),
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useCheckReceiver(routingNumber: string, rail?: InstantPaymentRail) {
  return useQuery({
    queryKey: instantPaymentKeys.receiver(routingNumber),
    queryFn: () => gateway.instantPayments.checkReceiver(routingNumber, rail),
    enabled: routingNumber.length === 9,
    staleTime: 1000 * 60 * 10, // 10 min
  });
}

export function useSendInstantPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      sourceAccountId: string;
      receiverRoutingNumber: string;
      receiverAccountNumber: string;
      receiverName: string;
      amountCents: number;
      currency?: string;
      description: string;
      preferredRail?: InstantPaymentRail;
      idempotencyKey: string;
    }) => gateway.instantPayments.send(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instantPaymentKeys.all });
    },
  });
}

export function useRequestForPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      requesterAccountId: string;
      payerRoutingNumber: string;
      payerName: string;
      amountCents: number;
      description: string;
      expiresAt: string;
      preferredRail?: InstantPaymentRail;
    }) => gateway.instantPayments.requestPayment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instantPaymentKeys.all });
    },
  });
}

export function useExportISO20022() {
  return useMutation({
    mutationFn: (params: { paymentId: string; format?: "pain.001" | "pacs.008" }) =>
      gateway.instantPayments.exportISO20022(params.paymentId, params.format),
  });
}
