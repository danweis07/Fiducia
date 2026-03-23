import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const externalAccountKeys = {
  all: ["external-accounts"] as const,
  list: () => ["external-accounts", "list"] as const,
  balances: (accountId?: string) => ["external-accounts", "balances", accountId] as const,
  transactions: (accountId?: string) => ["external-accounts", "transactions", accountId] as const,
};

/**
 * List all linked external accounts.
 */
export function useLinkedAccounts() {
  return useQuery({
    queryKey: externalAccountKeys.list(),
    queryFn: () => gateway.externalAccounts.list(),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Initiate the Plaid Link flow — creates a link token, then exchanges the
 * public token returned by Plaid Link.
 */
export function useLinkAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (publicToken: string) => {
      return gateway.externalAccounts.exchange(publicToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externalAccountKeys.all });
    },
  });
}

/**
 * Get balances for a specific external account (or all if no accountId).
 */
export function useExternalBalances(accountId?: string) {
  return useQuery({
    queryKey: externalAccountKeys.balances(accountId),
    queryFn: () => gateway.externalAccounts.balances(accountId),
    staleTime: 1000 * 60 * 1,
  });
}

/**
 * Get transactions for a specific external account.
 */
export function useExternalTransactions(accountId?: string) {
  return useQuery({
    queryKey: externalAccountKeys.transactions(accountId),
    queryFn: () => gateway.externalAccounts.transactions(accountId ? { accountId } : {}),
    staleTime: 1000 * 60 * 2,
  });
}
