import { useQuery } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export interface AdminAccountListParams {
  type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const adminAccountKeys = {
  all: ['admin-accounts'] as const,
  list: (params: AdminAccountListParams) => ['admin-accounts', 'list', params] as const,
  aggregates: () => ['admin-accounts', 'aggregates'] as const,
};

export function useAdminAccountList(params: AdminAccountListParams = {}) {
  return useQuery({
    queryKey: adminAccountKeys.list(params),
    queryFn: () => gateway.adminAccounts.list(params),
    staleTime: 1000 * 60 * 1,
  });
}

export function useAdminAccountAggregates() {
  return useQuery({
    queryKey: adminAccountKeys.aggregates(),
    queryFn: () => gateway.adminAccounts.aggregates(),
    staleTime: 1000 * 60 * 2,
  });
}
