import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { accountKeys } from "@/hooks/useAccounts";
import { transactionKeys } from "@/hooks/useTransactions";

export interface BillListParams {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateBillInput {
  payeeName: string;
  payeeAccountNumber: string;
  amountCents: number;
  dueDate: string;
  fromAccountId: string;
  autopay?: boolean;
  recurringRule?: { frequency: string };
}

export const billKeys = {
  all: ["bills"] as const,
  list: (params: BillListParams) => ["bills", "list", params] as const,
};

export function useBills(params: BillListParams = {}) {
  return useQuery({
    queryKey: billKeys.list(params),
    queryFn: () => gateway.bills.list(params),
    staleTime: 1000 * 60 * 1,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBillInput) => gateway.bills.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.all });
    },
  });
}

export function usePayBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (billId: string) => gateway.bills.pay(billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useCancelBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (billId: string) => gateway.bills.cancel(billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.all });
    },
  });
}
