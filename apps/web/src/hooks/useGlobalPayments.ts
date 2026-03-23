import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

// =============================================================================
// CONFIRMATION OF PAYEE (CoP)
// =============================================================================

export function useVerifyPayee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.confirmationOfPayee.verify>[0]) =>
      gateway.confirmationOfPayee.verify(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cop"] });
    },
  });
}

// =============================================================================
// STRONG CUSTOMER AUTHENTICATION (SCA)
// =============================================================================

export function useInitiateSCA() {
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.sca.initiate>[0]) =>
      gateway.sca.initiate(params),
  });
}

export function useCompleteSCA() {
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.sca.complete>[0]) =>
      gateway.sca.complete(params),
  });
}

export function useSCAExemptionCheck(
  params: Parameters<typeof gateway.sca.checkExemption>[0] | null,
) {
  return useQuery({
    queryKey: ["sca", "exemption", params],
    queryFn: () => gateway.sca.checkExemption(params!),
    enabled: !!params,
  });
}

// =============================================================================
// INSTANT PAYMENTS (R2P / Push Payments)
// =============================================================================

export function useInstantPayments(
  params: { accountId?: string; direction?: string; status?: string; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["instantPayments", "list", params],
    queryFn: () => gateway.instantPayments.list(params),
  });
}

export function useInstantPayment(paymentId: string) {
  return useQuery({
    queryKey: ["instantPayments", "get", paymentId],
    queryFn: () => gateway.instantPayments.get(paymentId),
    enabled: !!paymentId,
  });
}

export function useSendInstantPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.instantPayments.send>[0]) =>
      gateway.instantPayments.send(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instantPayments"] });
    },
  });
}

export function useCheckInstantPaymentReceiver() {
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.instantPayments.checkReceiver>[0]) =>
      gateway.instantPayments.checkReceiver(params),
  });
}

export function useSendRequestForPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.instantPayments.requestForPayment>[0]) =>
      gateway.instantPayments.requestForPayment(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instantPayments"] });
    },
  });
}

// =============================================================================
// GLOBAL COMPLIANCE (GDPR, Cooling-Off, Tax)
// =============================================================================

export function useDataPortability() {
  return useMutation({
    mutationFn: (params: { format?: string } = {}) =>
      gateway.globalCompliance.requestDataPortability(params),
  });
}

export function useDataResidency() {
  return useQuery({
    queryKey: ["compliance", "dataResidency"],
    queryFn: () => gateway.globalCompliance.getDataResidency(),
  });
}

export function useLoanCoolingOff(loanId: string) {
  return useQuery({
    queryKey: ["compliance", "coolingOff", loanId],
    queryFn: () => gateway.globalCompliance.getLoanCoolingOff(loanId),
    enabled: !!loanId,
    refetchInterval: 60000, // Refresh every minute to keep daysRemaining accurate
  });
}

export function useExerciseLoanWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { loanId: string; reason?: string }) =>
      gateway.globalCompliance.exerciseLoanWithdrawal(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance", "coolingOff"] });
      qc.invalidateQueries({ queryKey: ["loans"] });
    },
  });
}

export function useInterestWithholding(accountId: string, taxYear?: string) {
  return useQuery({
    queryKey: ["compliance", "interestWithholding", accountId, taxYear],
    queryFn: () => gateway.globalCompliance.getInterestWithholding({ accountId, taxYear }),
    enabled: !!accountId,
  });
}
