import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import { accountKeys } from '@/hooks/useAccounts';

export const loanKeys = {
  all: ['loans'] as const,
  list: (params: { status?: string }) => ['loans', 'list', params] as const,
  detail: (id: string) => ['loans', id] as const,
  schedule: (loanId: string) => ['loans', loanId, 'schedule'] as const,
  payments: (loanId: string) => ['loans', loanId, 'payments'] as const,
};

export function useLoans(params: { status?: string } = {}) {
  return useQuery({
    queryKey: loanKeys.list(params),
    queryFn: () => gateway.loans.list(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useLoan(id: string) {
  return useQuery({
    queryKey: loanKeys.detail(id),
    queryFn: () => gateway.loans.get(id),
    enabled: !!id,
  });
}

export function useLoanSchedule(loanId: string, params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: loanKeys.schedule(loanId),
    queryFn: () => gateway.loans.schedule(loanId, params),
    enabled: !!loanId,
  });
}

export function useLoanPayments(loanId: string, params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: loanKeys.payments(loanId),
    queryFn: () => gateway.loans.payments(loanId, params),
    enabled: !!loanId,
  });
}

export function useMakeLoanPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { loanId: string; amountCents: number; fromAccountId: string; extraPrincipalCents?: number }) =>
      gateway.loans.makePayment(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: loanKeys.detail(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanKeys.schedule(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanKeys.payments(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}
