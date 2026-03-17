/**
 * Direct Deposit Switching Hooks
 *
 * React Query hooks for employer search, initiating direct deposit switches,
 * tracking switch status, and managing switch history.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { AllocationTypeValue } from "@/types";

// =============================================================================
// QUERY KEYS
// =============================================================================

export const directDepositKeys = {
  all: ['direct-deposit'] as const,
  employers: (params?: Record<string, unknown>) => ['direct-deposit', 'employers', params] as const,
  switches: (params?: Record<string, unknown>) => ['direct-deposit', 'switches', params] as const,
  status: (id?: string) => ['direct-deposit', 'status', id] as const,
};

// =============================================================================
// QUERIES
// =============================================================================

/** Search/list supported employers */
export function useEmployers(params: { query?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: directDepositKeys.employers(params as Record<string, unknown>),
    queryFn: () => gateway.directDeposit.employers(params),
  });
}

/** Get status of a specific switch request */
export function useSwitchStatus(switchId?: string) {
  return useQuery({
    queryKey: directDepositKeys.status(switchId),
    queryFn: () => gateway.directDeposit.status(switchId!),
    enabled: !!switchId,
    refetchInterval: (query) => {
      const status = query.state.data?.switch?.status;
      // Poll while in progress
      if (status === 'awaiting_login' || status === 'processing') return 5000;
      return false;
    },
  });
}

/** List all switch requests for user */
export function useSwitches(params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: directDepositKeys.switches(params as Record<string, unknown>),
    queryFn: () => gateway.directDeposit.list(params),
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/** Initiate a direct deposit switch */
export function useInitiateSwitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      accountId: string; employerId: string;
      allocationType: AllocationTypeValue;
      allocationAmountCents?: number; allocationPercentage?: number;
    }) => gateway.directDeposit.initiate(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: directDepositKeys.all });
    },
  });
}

/** Cancel a pending switch */
export function useCancelSwitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (switchId: string) => gateway.directDeposit.cancel(switchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: directDepositKeys.all });
    },
  });
}

/** Confirm/complete a switch after widget flow */
export function useConfirmSwitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ switchId, providerConfirmationId }: { switchId: string; providerConfirmationId: string }) =>
      gateway.directDeposit.confirm(switchId, providerConfirmationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: directDepositKeys.all });
    },
  });
}
