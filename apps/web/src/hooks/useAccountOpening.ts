/**
 * Account Opening Hooks
 *
 * React Query hooks for the account opening flow —
 * new applicants opening checking, savings, CD, or money market accounts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

// =============================================================================
// QUERY KEYS
// =============================================================================

export const accountOpeningKeys = {
  all: ["account-opening"] as const,
  config: () => ["account-opening", "config"] as const,
  application: (id?: string) => ["account-opening", "application", id] as const,
};

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Fetch available products and account-opening configuration for the tenant */
export function useAccountOpeningConfig() {
  return useQuery({
    queryKey: accountOpeningKeys.config(),
    queryFn: () => gateway.accountOpening.config(),
    staleTime: 1000 * 60 * 10, // Config rarely changes — cache 10 min
  });
}

// =============================================================================
// APPLICATION QUERIES
// =============================================================================

/** Fetch an existing application by ID */
export function useGetApplication(id?: string) {
  return useQuery({
    queryKey: accountOpeningKeys.application(id),
    queryFn: () => gateway.accountOpening.get(id!),
    enabled: !!id,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/** Create a new account opening application */
export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicant: Record<string, unknown>) => gateway.accountOpening.create(applicant),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountOpeningKeys.all });
    },
  });
}

/** Select products for an existing application */
export function useSelectProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { applicationId: string; productIds: string[] }) =>
      gateway.accountOpening.selectProducts(params.applicationId, params.productIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: accountOpeningKeys.application(variables.applicationId),
      });
    },
  });
}

/** Submit funding for an application */
export function useSubmitFunding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { applicationId: string; funding: Record<string, unknown> }) =>
      gateway.accountOpening.submitFunding(params.applicationId, params.funding),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: accountOpeningKeys.application(variables.applicationId),
      });
    },
  });
}

/** Complete (finalize) an application — triggers account creation */
export function useCompleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => gateway.accountOpening.complete(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountOpeningKeys.all });
    },
  });
}

/** Cancel an in-progress application */
export function useCancelApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => gateway.accountOpening.cancel(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountOpeningKeys.all });
    },
  });
}
