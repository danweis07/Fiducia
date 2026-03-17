import { useQuery } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export interface AdminUserListParams {
  status?: string;
  kycStatus?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const adminUserKeys = {
  all: ['admin-users'] as const,
  list: (params: AdminUserListParams) => ['admin-users', 'list', params] as const,
};

export function useAdminUsers(params: AdminUserListParams = {}) {
  return useQuery({
    queryKey: adminUserKeys.list(params),
    queryFn: () => gateway.adminUsers.list(params),
    staleTime: 1000 * 60 * 1,
  });
}
