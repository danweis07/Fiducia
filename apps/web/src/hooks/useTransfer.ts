import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { TransferType } from "@/types";
import { accountKeys } from "@/hooks/useAccounts";
import { transactionKeys } from "@/hooks/useTransactions";

export interface TransferListParams {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId?: string;
  toBeneficiaryId?: string;
  type: TransferType;
  amountCents: number;
  memo?: string;
  scheduledDate?: string;
}

export const transferKeys = {
  all: ["transfers"] as const,
  list: (params: TransferListParams) => ["transfers", "list", params] as const,
};

export function useTransfers(params: TransferListParams = {}) {
  return useQuery({
    queryKey: transferKeys.list(params),
    queryFn: () => gateway.transfers.list(params),
    staleTime: 1000 * 60 * 1,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransferInput) => gateway.transfers.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useCancelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gateway.transfers.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
