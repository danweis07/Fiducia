import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export const aggregatorKeys = {
  all: ['aggregator'] as const,
  institutions: (query: string, countryCode?: string) => ['aggregator', 'institutions', query, countryCode] as const,
  connections: () => ['aggregator', 'connections'] as const,
  accounts: (connectionId?: string) => ['aggregator', 'accounts', connectionId] as const,
  transactions: (accountId: string) => ['aggregator', 'transactions', accountId] as const,
};

export function useAggregatorInstitutions(query: string, countryCode?: string) {
  return useQuery({
    queryKey: aggregatorKeys.institutions(query, countryCode),
    queryFn: () => gateway.aggregator.searchInstitutions({ query, countryCode }),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAggregatorConnections() {
  return useQuery({
    queryKey: aggregatorKeys.connections(),
    queryFn: () => gateway.aggregator.listConnections(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAggregatedAccounts(connectionId?: string) {
  return useQuery({
    queryKey: aggregatorKeys.accounts(connectionId),
    queryFn: () => gateway.aggregator.listAccounts(connectionId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAggregatedTransactions(accountId: string, params?: { fromDate?: string; toDate?: string; limit?: number }) {
  return useQuery({
    queryKey: aggregatorKeys.transactions(accountId),
    queryFn: () => gateway.aggregator.listTransactions({ accountId, ...params }),
    enabled: !!accountId,
    staleTime: 1000 * 60,
  });
}

export function useCreateAggregatorConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { institutionId: string; redirectUrl?: string; scopes?: string[] }) =>
      gateway.aggregator.createConnection(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aggregatorKeys.connections() });
    },
  });
}

export function useRefreshAggregatorConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) =>
      gateway.aggregator.refreshConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aggregatorKeys.all });
    },
  });
}

export function useRemoveAggregatorConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) =>
      gateway.aggregator.removeConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aggregatorKeys.all });
    },
  });
}
