import { useQuery } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { TransactionType, TransactionStatus, TransactionCategory } from "@/types";

export interface TransactionListParams {
  accountId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  category?: TransactionCategory;
  fromDate?: string;
  toDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const transactionKeys = {
  all: ["transactions"] as const,
  list: (params: TransactionListParams) => ["transactions", "list", params] as const,
  detail: (id: string) => ["transactions", id] as const,
};

export function useTransactions(params: TransactionListParams = {}) {
  return useQuery({
    queryKey: transactionKeys.list(params),
    queryFn: () => gateway.transactions.list(params),
    staleTime: 1000 * 60 * 1, // 1 min
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => gateway.transactions.get(id),
    enabled: !!id,
  });
}
