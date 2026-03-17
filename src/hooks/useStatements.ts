/**
 * Account Statements Hooks
 *
 * React Query hooks for fetching account statements,
 * statement configuration, and statement downloads.
 */

import { useQuery } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export const statementKeys = {
  all: ['statements'] as const,
  list: (accountId: string) => ['statements', 'list', accountId] as const,
  detail: (id: string) => ['statements', 'detail', id] as const,
  config: () => ['statements', 'config'] as const,
};

/** List available statements for an account */
export function useStatements(accountId: string) {
  return useQuery({
    queryKey: statementKeys.list(accountId),
    queryFn: () => gateway.statements.list({ accountId }),
    enabled: !!accountId,
    staleTime: 1000 * 60 * 5, // Statements don't change often
  });
}

/** Get statement detail with transactions */
export function useStatementDetail(id: string) {
  return useQuery({
    queryKey: statementKeys.detail(id),
    queryFn: () => gateway.statements.get(id),
    enabled: !!id,
  });
}

/** Get tenant statement configuration */
export function useStatementConfig() {
  return useQuery({
    queryKey: statementKeys.config(),
    queryFn: () => gateway.statements.config(),
    staleTime: 1000 * 60 * 30, // Config rarely changes
  });
}
