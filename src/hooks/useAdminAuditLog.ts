import { useQuery } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export interface AdminAuditLogParams {
  action?: string;
  user?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const adminAuditKeys = {
  all: ['admin-audit'] as const,
  log: (params: AdminAuditLogParams) => ['admin-audit', 'log', params] as const,
};

export function useAdminAuditLog(params: AdminAuditLogParams = {}) {
  return useQuery({
    queryKey: adminAuditKeys.log(params),
    queryFn: () => gateway.adminAudit.log(params),
    staleTime: 1000 * 60 * 1,
  });
}
