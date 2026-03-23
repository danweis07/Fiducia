import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export const openFinanceKeys = {
  all: ["openFinance"] as const,
  connections: () => ["openFinance", "connections"] as const,
  accounts: (connectionId?: string) => ["openFinance", "accounts", connectionId] as const,
  netWorth: () => ["openFinance", "netWorth"] as const,
  alternativeCredit: () => ["openFinance", "alternativeCredit"] as const,
};

export function useOpenFinanceConnections() {
  return useQuery({
    queryKey: openFinanceKeys.connections(),
    queryFn: () => gateway.openFinance.listConnections(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateOpenFinanceConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { institutionId: string; countryCode: string; redirectUrl?: string }) =>
      gateway.openFinance.createConnection(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openFinanceKeys.connections() });
    },
  });
}

export function useRefreshOpenFinanceConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => gateway.openFinance.refreshConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openFinanceKeys.all });
    },
  });
}

export function useRemoveOpenFinanceConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => gateway.openFinance.removeConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openFinanceKeys.all });
    },
  });
}

export function useOpenFinanceAccounts(connectionId?: string) {
  return useQuery({
    queryKey: openFinanceKeys.accounts(connectionId),
    queryFn: () => gateway.openFinance.listAccounts({ connectionId }),
    staleTime: 1000 * 60 * 2,
  });
}

export function useOpenFinanceNetWorth() {
  return useQuery({
    queryKey: openFinanceKeys.netWorth(),
    queryFn: () => gateway.openFinance.getNetWorth(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAlternativeCreditData() {
  return useQuery({
    queryKey: openFinanceKeys.alternativeCredit(),
    queryFn: () => gateway.openFinance.getAlternativeCreditData(),
    staleTime: 1000 * 60 * 5,
  });
}
