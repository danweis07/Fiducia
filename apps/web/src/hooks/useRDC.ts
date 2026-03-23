import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { accountKeys } from "@/hooks/useAccounts";
import { transactionKeys } from "@/hooks/useTransactions";

export interface SubmitDepositInput {
  accountId: string;
  amountCents: number;
  frontImageBase64: string;
  backImageBase64: string;
  checkNumber?: string;
}

export interface DepositHistoryParams {
  accountId?: string;
  limit?: number;
}

export const rdcKeys = {
  all: ["rdc"] as const,
  status: (id: string) => ["rdc", "status", id] as const,
  history: (params: DepositHistoryParams) => ["rdc", "history", params] as const,
};

export function useSubmitDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitDepositInput) => gateway.rdc.deposit(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rdcKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useDepositStatus(id: string) {
  return useQuery({
    queryKey: rdcKeys.status(id),
    queryFn: () => gateway.rdc.status(id),
    enabled: !!id,
    refetchInterval: 1000 * 30, // Poll every 30s while deposit is processing
  });
}

export function useDepositHistory(params: DepositHistoryParams = {}) {
  return useQuery({
    queryKey: rdcKeys.history(params),
    queryFn: () => gateway.rdc.history(params),
    staleTime: 1000 * 60 * 2,
  });
}
