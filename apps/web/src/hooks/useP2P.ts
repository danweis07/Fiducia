import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { accountKeys } from "@/hooks/useAccounts";

export const p2pKeys = {
  all: ["p2p"] as const,
  enrollment: () => ["p2p", "enrollment"] as const,
  transactions: (filter?: string) => ["p2p", "transactions", filter] as const,
  limits: () => ["p2p", "limits"] as const,
};

export function useP2PEnrollment() {
  return useQuery({
    queryKey: p2pKeys.enrollment(),
    queryFn: () => gateway.p2p.getEnrollment(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useEnrollP2P() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      accountId: string;
      enrollmentType: "email" | "phone";
      enrollmentValue: string;
    }) => gateway.p2p.enroll(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: p2pKeys.enrollment() });
    },
  });
}

export function useUnenrollP2P() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => gateway.p2p.unenroll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: p2pKeys.enrollment() });
    },
  });
}

export function useSendP2P() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      recipientType: "email" | "phone" | "token";
      recipientValue: string;
      amountCents: number;
      memo?: string;
    }) => gateway.p2p.send(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: p2pKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useRequestP2P() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      recipientType: "email" | "phone" | "token";
      recipientValue: string;
      amountCents: number;
      memo?: string;
    }) => gateway.p2p.requestMoney(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: p2pKeys.all });
    },
  });
}

export function useP2PTransactions(filter?: "sent" | "received" | "requests") {
  return useQuery({
    queryKey: p2pKeys.transactions(filter),
    queryFn: () => gateway.p2p.listTransactions({ filter, limit: 50 }),
    staleTime: 1000 * 60 * 1,
  });
}

export function useCancelP2PRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gateway.p2p.cancelRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: p2pKeys.all });
    },
  });
}

export function useP2PLimits() {
  return useQuery({
    queryKey: p2pKeys.limits(),
    queryFn: () => gateway.p2p.getLimits(),
    staleTime: 1000 * 60 * 2,
  });
}
