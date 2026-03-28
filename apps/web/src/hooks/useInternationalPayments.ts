import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { PaymentAliasType, PaymentNetwork } from "@/types";

export const internationalPaymentKeys = {
  all: ["internationalPayments"] as const,
  aliases: () => ["internationalPayments", "aliases"] as const,
  payments: (network?: PaymentNetwork, status?: string) =>
    ["internationalPayments", "payments", network, status] as const,
  limits: () => ["internationalPayments", "limits"] as const,
};

export function usePaymentAliases() {
  return useQuery({
    queryKey: internationalPaymentKeys.aliases(),
    queryFn: () => gateway.intlPaymentAliases.listAliases(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreatePaymentAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      aliasType: PaymentAliasType;
      aliasValue: string;
      linkedAccountId: string;
      network: PaymentNetwork;
    }) => gateway.intlPaymentAliases.createAlias(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internationalPaymentKeys.aliases() });
    },
  });
}

export function useDeletePaymentAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (aliasId: string) => gateway.intlPaymentAliases.deleteAlias(aliasId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internationalPaymentKeys.aliases() });
    },
  });
}

export function useConfirmPayee() {
  return useMutation({
    mutationFn: (params: {
      aliasValue: string;
      aliasType: PaymentAliasType;
      network: PaymentNetwork;
    }) => gateway.intlPaymentAliases.confirmPayee(params),
  });
}

export function useSendInternationalPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      recipientAlias: string;
      recipientAliasType: PaymentAliasType;
      amountCents: number;
      currencyCode: string;
      network: PaymentNetwork;
      memo?: string;
    }) => gateway.intlPaymentAliases.send(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internationalPaymentKeys.all });
    },
  });
}

export function useParseQR() {
  return useMutation({
    mutationFn: (qrData: string) => gateway.intlPaymentAliases.parseQR(qrData),
  });
}

export function useGenerateQR() {
  return useMutation({
    mutationFn: (params: { aliasId: string; amountCents?: number; reference?: string }) =>
      gateway.intlPaymentAliases.generateQR(params),
  });
}

export function useInternationalPaymentHistory(network?: PaymentNetwork, status?: string) {
  return useQuery({
    queryKey: internationalPaymentKeys.payments(network, status),
    queryFn: () => gateway.intlPaymentAliases.listPayments({ network, status }),
    staleTime: 1000 * 60,
  });
}

export function useInternationalPaymentLimits() {
  return useQuery({
    queryKey: internationalPaymentKeys.limits(),
    queryFn: () => gateway.intlPaymentAliases.getLimits(),
    staleTime: 1000 * 60 * 5,
  });
}

// --- From main: coverage, FX, cards, payouts, bill pay, loans, BaaS ---

export function useInternationalCoverage(region?: string) {
  return useQuery({
    queryKey: ["internationalPayments", "coverage", region],
    queryFn: () => gateway.internationalPayments.getCoverage({ region }),
  });
}

export function useFXQuote(fromCurrency: string, toCurrency: string, fromAmountCents?: number) {
  return useQuery({
    queryKey: ["internationalPayments", "fxQuote", fromCurrency, toCurrency, fromAmountCents],
    queryFn: () =>
      gateway.internationalPayments.getFXQuote({ fromCurrency, toCurrency, fromAmountCents }),
    enabled: !!fromCurrency && !!toCurrency,
    refetchInterval: 30000,
  });
}

export function useInternationalPayments(
  params: { status?: string; limit?: number; offset?: number } = {},
) {
  return useQuery({
    queryKey: ["internationalPayments", "list", params],
    queryFn: () => gateway.internationalPayments.listPayments(params),
  });
}

export function useCreateInternationalPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.internationalPayments.createPayment>[0]) =>
      gateway.internationalPayments.createPayment(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internationalPayments"] });
    },
  });
}

export function useGlobalCards(params: { status?: string; country?: string } = {}) {
  return useQuery({
    queryKey: ["internationalPayments", "cards", params],
    queryFn: () => gateway.internationalPayments.listCards(params),
  });
}

export function useIssueGlobalCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.internationalPayments.issueCard>[0]) =>
      gateway.internationalPayments.issueCard(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internationalPayments", "cards"] });
    },
  });
}

export function useInternationalPayouts(params: { status?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ["internationalPayments", "payouts", params],
    queryFn: () => gateway.internationalPayments.listPayouts(params),
  });
}

export function useCreateInternationalPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.internationalPayments.createPayout>[0]) =>
      gateway.internationalPayments.createPayout(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internationalPayments", "payouts"] });
    },
  });
}

export function useInternationalBillers(query: string, country?: string) {
  return useQuery({
    queryKey: ["internationalBillPay", "billers", query, country],
    queryFn: () => gateway.internationalBillPay.searchBillers({ query, country }),
    enabled: query.length >= 2,
  });
}

export function useInternationalBillPayments(params: { country?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["internationalBillPay", "payments", params],
    queryFn: () => gateway.internationalBillPay.listPayments(params),
  });
}

export function usePayInternationalBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.internationalBillPay.payBill>[0]) =>
      gateway.internationalBillPay.payBill(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internationalBillPay"] });
    },
  });
}

export function useInternationalBillPayCountries() {
  return useQuery({
    queryKey: ["internationalBillPay", "countries"],
    queryFn: () => gateway.internationalBillPay.getCountries(),
  });
}

export function useInternationalLoanApplications(
  params: { country?: string; status?: string } = {},
) {
  return useQuery({
    queryKey: ["internationalLoans", "applications", params],
    queryFn: () => gateway.internationalLoans.listApplications(params),
  });
}

export function useCreateInternationalLoanApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.internationalLoans.createApplication>[0]) =>
      gateway.internationalLoans.createApplication(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internationalLoans"] });
    },
  });
}

export function useBaaSAccounts(params: { country?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["baas", "accounts", params],
    queryFn: () => gateway.baas.listAccounts(params),
  });
}

export function useCreateBaaSAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof gateway.baas.createAccount>[0]) =>
      gateway.baas.createAccount(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["baas"] });
    },
  });
}
