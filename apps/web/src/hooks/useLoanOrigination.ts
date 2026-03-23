/**
 * Loan Origination Hooks
 *
 * React Query hooks for the loan application flow —
 * members applying for auto loans, mortgages, personal loans, HELOCs, etc.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

// =============================================================================
// QUERY KEYS
// =============================================================================

export const loanOriginationKeys = {
  all: ["loan-origination"] as const,
  products: () => ["loan-origination", "products"] as const,
  application: (id?: string) => ["loan-origination", "application", id] as const,
};

// =============================================================================
// QUERIES
// =============================================================================

/** Fetch available loan products for the tenant */
export function useLoanProducts(params: { loanType?: string } = {}) {
  return useQuery({
    queryKey: loanOriginationKeys.products(),
    queryFn: () => gateway.loanProducts.list(params),
    staleTime: 1000 * 60 * 10, // Products rarely change — cache 10 min
  });
}

/** Fetch an existing loan application by ID */
export function useGetLoanApplication(id?: string) {
  return useQuery({
    queryKey: loanOriginationKeys.application(id),
    queryFn: () =>
      gateway.loanOrigination.getApplication({
        applicationId: id!,
        institutionId: "",
      }),
    enabled: !!id,
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/** Create a new loan application */
export function useCreateLoanApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      institutionId: string;
      requestedAmountCents: number;
      termMonths?: number;
      productId?: string;
      applicant: { firstName: string; lastName: string; email?: string; phone?: string };
      coApplicant?: { firstName: string; lastName: string; email?: string; phone?: string };
      additionalFields?: Record<string, unknown>;
    }) => gateway.loanOrigination.createApplication(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanOriginationKeys.all });
    },
  });
}

/** Upload a document to a loan application */
export function useUploadLoanDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      institutionId: string;
      documentTemplateType: number;
      documentEntityType: "Party" | "Loan";
      documentEntity: { id: string; context: "Applicant" | "Application" };
      documentFile?: { fileName: string; fileContent: string };
    }) => gateway.loanOrigination.createDocument(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanOriginationKeys.all });
    },
  });
}
