/**
 * Gateway Domain — International Payments, International Bill Pay,
 * International Loans, BaaS, Alias, Currency Pots
 */

import type { CallGatewayFn } from "./client";

export function createInternationalDomain(callGateway: CallGatewayFn) {
  return {
    internationalPayments: {
      async getCoverage(params: { region?: string } = {}) {
        return callGateway<{ countries: import("@/types").CountryCoverage[]; total: number }>(
          "internationalPayments.coverage",
          params,
        );
      },
      async getFXQuote(params: {
        fromCurrency: string;
        toCurrency: string;
        fromAmountCents?: number;
      }) {
        return callGateway<import("@/types").FXQuote>("internationalPayments.fxQuote", params);
      },
      async createPayment(params: {
        fromAccountId: string;
        fromCurrency: string;
        toCurrency: string;
        amountCents: number;
        beneficiaryName: string;
        beneficiaryCountry: string;
        beneficiaryAccountNumber: string;
        swiftBic?: string;
        iban?: string;
        reference?: string;
        rail?: string;
        quoteId?: string;
      }) {
        return callGateway<import("@/types").InternationalPayment>(
          "internationalPayments.create",
          params,
        );
      },
      async getPayment(paymentId: string) {
        return callGateway<import("@/types").InternationalPayment>("internationalPayments.get", {
          paymentId,
        });
      },
      async listPayments(
        params: {
          status?: string;
          fromDate?: string;
          toDate?: string;
          limit?: number;
          offset?: number;
        } = {},
      ) {
        return callGateway<import("@/types").InternationalPayment[]>(
          "internationalPayments.list",
          params,
        );
      },
      async issueCard(params: {
        type: string;
        cardholderName: string;
        currency: string;
        country: string;
        spendLimitCents: number;
        spendLimitInterval?: string;
        metadata?: Record<string, string>;
      }) {
        return callGateway<import("@/types").GlobalIssuedCard>(
          "internationalPayments.cards.issue",
          params,
        );
      },
      async listCards(
        params: { status?: string; country?: string; limit?: number; offset?: number } = {},
      ) {
        return callGateway<import("@/types").GlobalIssuedCard[]>(
          "internationalPayments.cards.list",
          params,
        );
      },
      async createPayout(params: {
        destinationCountry: string;
        destinationCurrency: string;
        amountCents: number;
        recipientName: string;
        recipientAccountNumber: string;
        rail?: string;
        reference?: string;
      }) {
        return callGateway<import("@/types").InternationalPayout>(
          "internationalPayments.payouts.create",
          params,
        );
      },
      async listPayouts(params: { status?: string; limit?: number; offset?: number } = {}) {
        return callGateway<import("@/types").InternationalPayout[]>(
          "internationalPayments.payouts.list",
          params,
        );
      },
    },

    internationalBillPay: {
      async searchBillers(params: {
        query: string;
        country?: string;
        category?: string;
        limit?: number;
      }) {
        return callGateway<{ billers: import("@/types").InternationalBiller[]; total: number }>(
          "internationalBillPay.billers.search",
          params,
        );
      },
      async payBill(params: {
        billerId: string;
        fromAccountId: string;
        fromCurrency: string;
        amountCents: number;
        accountReference: string;
        referenceFields?: Record<string, string>;
      }) {
        return callGateway<import("@/types").InternationalBillPayment>(
          "internationalBillPay.pay",
          params,
        );
      },
      async getPayment(paymentId: string) {
        return callGateway<import("@/types").InternationalBillPayment>("internationalBillPay.get", {
          paymentId,
        });
      },
      async listPayments(
        params: { country?: string; status?: string; limit?: number; offset?: number } = {},
      ) {
        return callGateway<import("@/types").InternationalBillPayment[]>(
          "internationalBillPay.list",
          params,
        );
      },
      async getCountries() {
        return callGateway<{
          countries: Array<{
            countryCode: string;
            countryName: string;
            currency: string;
            billerCount: number;
            supportsInstant: boolean;
          }>;
        }>("internationalBillPay.countries", {});
      },
    },

    internationalLoans: {
      async createApplication(params: {
        country: string;
        currency: string;
        productType: string;
        requestedAmountCents: number;
        termMonths?: number;
        applicant: { firstName: string; lastName: string; email?: string; phone?: string };
      }) {
        return callGateway<{ application: import("@/types").InternationalLoanApplication }>(
          "internationalLoans.application.create",
          params as unknown as Record<string, unknown>,
        );
      },
      async getApplication(applicationId: string) {
        return callGateway<{ application: import("@/types").InternationalLoanApplication }>(
          "internationalLoans.application.get",
          { applicationId },
        );
      },
      async listApplications(
        params: { country?: string; status?: string; limit?: number; offset?: number } = {},
      ) {
        return callGateway<import("@/types").InternationalLoanApplication[]>(
          "internationalLoans.application.list",
          params,
        );
      },
      async getCreditAssessment(applicationId: string) {
        return callGateway<{
          assessment: {
            score: number;
            grade: string;
            factors: string[];
            model: string;
            assessedAt: string;
          };
        }>("internationalLoans.creditAssessment", { applicationId });
      },
      async getComplianceChecks(applicationId: string) {
        return callGateway<{
          checks: Array<{
            checkType: string;
            status: string;
            jurisdiction: string;
            completedAt: string | null;
          }>;
        }>("internationalLoans.complianceChecks", { applicationId });
      },
    },

    baas: {
      async listAccounts(
        params: { country?: string; status?: string; limit?: number; offset?: number } = {},
      ) {
        return callGateway<import("@/types").BaaSAccount[]>("baas.accounts.list", params);
      },
      async createAccount(params: {
        country: string;
        currency: string;
        accountType: string;
        accountHolderName: string;
      }) {
        return callGateway<{ account: import("@/types").BaaSAccount }>(
          "baas.accounts.create",
          params,
        );
      },
      async getAccount(accountId: string) {
        return callGateway<{ account: import("@/types").BaaSAccount }>("baas.accounts.get", {
          accountId,
        });
      },
      async initiatePayment(params: {
        fromAccountId: string;
        toIban?: string;
        toSortCode?: string;
        toAccountNumber?: string;
        amountCents: number;
        currency: string;
        rail?: string;
        reference?: string;
      }) {
        return callGateway<{ paymentId: string; status: string }>("baas.payments.initiate", params);
      },
      async getKYCStatus() {
        return callGateway<{
          status: string;
          checks: Array<{ type: string; status: string; completedAt: string | null }>;
        }>("baas.kyc.status", {});
      },
      async getComplianceStatus() {
        return callGateway<{
          status: string;
          jurisdictions: Array<{ country: string; status: string; lastAuditDate: string }>;
        }>("baas.compliance.status", {});
      },
    },

    alias: {
      async resolve(params: { aliasType: string; aliasValue: string; region?: string }) {
        return callGateway<{ resolution: import("@/types").AliasResolution }>(
          "alias.resolve",
          params,
        );
      },
      async pay(params: {
        sourceAccountId: string;
        aliasType: string;
        aliasValue: string;
        amountCents: number;
        currency: string;
        description: string;
        idempotencyKey: string;
      }) {
        return callGateway<{
          paymentId: string;
          status: string;
          resolvedName: string;
          resolvedInstitution: string;
          rail: string;
          estimatedArrival: string;
        }>("alias.pay", params);
      },
      async listInboundR2P(params: { status?: string; limit?: number; cursor?: string } = {}) {
        return callGateway<{
          requests: import("@/types").RequestToPayInbound[];
          total: number;
          hasMore: boolean;
          nextCursor: string | null;
        }>("alias.r2p.inbound.list", params);
      },
      async respondToR2P(params: {
        requestId: string;
        action: "approve" | "decline";
        sourceAccountId?: string;
      }) {
        return callGateway<{ requestId: string; status: string; paymentId: string | null }>(
          "alias.r2p.inbound.respond",
          params,
        );
      },
      async sendR2P(params: {
        sourceAccountId: string;
        payerAlias: string;
        payerAliasType: string;
        amountCents: number;
        currency: string;
        description: string;
        expiresAt: string;
      }) {
        return callGateway<{ request: import("@/types").RequestToPayOutbound }>(
          "alias.r2p.outbound.send",
          params,
        );
      },
      async listOutboundR2P(params: { status?: string; limit?: number; cursor?: string } = {}) {
        return callGateway<{
          requests: import("@/types").RequestToPayOutbound[];
          total: number;
          hasMore: boolean;
          nextCursor: string | null;
        }>("alias.r2p.outbound.list", params);
      },
      async getDirectories() {
        return callGateway<{
          directories: Array<{
            region: string;
            name: string;
            supportedAliasTypes: string[];
            supportedCurrencies: string[];
            supportsR2P: boolean;
          }>;
        }>("alias.directories", {});
      },
    },

    currencyPots: {
      async list(params: { status?: string } = {}) {
        return callGateway<{ pots: import("@/types").CurrencyPot[] }>("currency.pots.list", params);
      },
      async create(params: {
        currency: string;
        initialDepositCents?: number;
        sourceAccountId?: string;
      }) {
        return callGateway<{ pot: import("@/types").CurrencyPot }>("currency.pots.create", params);
      },
      async get(potId: string) {
        return callGateway<import("@/types").CurrencyPot>("currency.pots.get", { potId });
      },
      async close(params: { potId: string; transferToPotId: string }) {
        return callGateway<{ success: boolean }>("currency.pots.close", params);
      },
      async generateVIBAN(params: { potId: string; country: string }) {
        return callGateway<{ viban: import("@/types").VirtualIBAN }>(
          "currency.viban.generate",
          params,
        );
      },
      async getSwapQuote(params: { fromPotId: string; toPotId: string; fromAmountCents: number }) {
        return callGateway<import("@/types").FXSwapQuote>("currency.swap.quote", params);
      },
      async executeSwap(params: {
        quoteId: string;
        fromPotId: string;
        toPotId: string;
        fromAmountCents: number;
        idempotencyKey: string;
      }) {
        return callGateway<{ swap: import("@/types").FXSwap }>("currency.swap.execute", params);
      },
      async listSwaps(params: { potId?: string; limit?: number; cursor?: string } = {}) {
        return callGateway<{
          swaps: import("@/types").FXSwap[];
          total: number;
          hasMore: boolean;
          nextCursor: string | null;
        }>("currency.swap.list", params);
      },
    },

    // International Compliance — Consent Dashboard (PSD3 / Open Finance)
    internationalConsents: {
      async list(
        params: {
          status?: import("@/types").InternationalConsentStatus;
          regulation?: string;
          limit?: number;
          offset?: number;
        } = {},
      ) {
        return callGateway<{ consents: import("@/types").InternationalConsent[] }>(
          "intl.consents.list",
          params,
        );
      },
      async get(consentId: string) {
        return callGateway<{ consent: import("@/types").InternationalConsent }>(
          "intl.consents.get",
          { consentId },
        );
      },
      async revoke(consentId: string) {
        return callGateway<{ consent: import("@/types").InternationalConsent }>(
          "intl.consents.revoke",
          { consentId },
        );
      },
      async revokeScope(params: {
        consentId: string;
        scope: import("@/types").InternationalConsentScope;
      }) {
        return callGateway<{ consent: import("@/types").InternationalConsent }>(
          "intl.consents.revokeScope",
          params,
        );
      },
      async accessLogs(params: { consentId?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ accessLogs: import("@/types").InternationalConsentAccessLog[] }>(
          "intl.consents.accessLogs",
          params,
        );
      },
      async summary() {
        return callGateway<{ summary: import("@/types").InternationalConsentSummary }>(
          "intl.consents.summary",
          {},
        );
      },
    },

    // International Compliance — Strong Customer Authentication (SCA)
    intlSca: {
      async getConfig() {
        return callGateway<{ config: import("@/types").SCAConfig }>("intl.sca.config", {});
      },
      async createChallenge(params: {
        triggerAction: string;
        paymentAmountCents?: number;
        paymentCurrency?: string;
        payeeName?: string;
      }) {
        return callGateway<{ challenge: import("@/types").SCAChallenge }>(
          "intl.sca.createChallenge",
          params,
        );
      },
      async verifyFactor(params: { challengeId: string; factorType: string; credential: string }) {
        return callGateway<{ challenge: import("@/types").SCAChallenge }>(
          "intl.sca.verifyFactor",
          params,
        );
      },
      async listTrustedDevices() {
        return callGateway<{ devices: import("@/types").TrustedDevice[] }>(
          "intl.sca.devices.list",
          {},
        );
      },
      async bindDevice(params: {
        deviceName: string;
        deviceType: string;
        platform: string;
        pushToken?: string;
      }) {
        return callGateway<{ device: import("@/types").TrustedDevice }>(
          "intl.sca.devices.bind",
          params,
        );
      },
      async unbindDevice(deviceId: string) {
        return callGateway<{ success: boolean }>("intl.sca.devices.unbind", { deviceId });
      },
    },

    // International Compliance — Localized eKYC
    ekyc: {
      async listProviders(params: { countryCode?: string } = {}) {
        return callGateway<{ providers: import("@/types").EKYCProviderConfig[] }>(
          "intl.ekyc.providers",
          params,
        );
      },
      async initiate(params: {
        provider: string;
        countryCode: string;
        documentType: string;
        documentNumber?: string;
      }) {
        return callGateway<{ verification: import("@/types").EKYCVerification }>(
          "intl.ekyc.initiate",
          params,
        );
      },
      async getStatus(verificationId: string) {
        return callGateway<{ verification: import("@/types").EKYCVerification }>(
          "intl.ekyc.status",
          { verificationId },
        );
      },
      async startLiveness(verificationId: string) {
        return callGateway<{ challenge: import("@/types").LivenessChallenge }>(
          "intl.ekyc.liveness.start",
          { verificationId },
        );
      },
      async completeLiveness(params: { challengeId: string; sessionData: string }) {
        return callGateway<{ verification: import("@/types").EKYCVerification }>(
          "intl.ekyc.liveness.complete",
          params,
        );
      },
      async listVerifications(params: { status?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ verifications: import("@/types").EKYCVerification[] }>(
          "intl.ekyc.list",
          params,
        );
      },
    },

    // International Compliance — Specialized Payments (VPA / Pix / UPI / QR)
    intlPaymentAliases: {
      async listAliases() {
        return callGateway<{ aliases: import("@/types").PaymentAlias[] }>(
          "intl.payments.aliases.list",
          {},
        );
      },
      async createAlias(params: {
        aliasType: import("@/types").PaymentAliasType;
        aliasValue: string;
        linkedAccountId: string;
        network: import("@/types").PaymentNetwork;
      }) {
        return callGateway<{ alias: import("@/types").PaymentAlias }>(
          "intl.payments.aliases.create",
          params,
        );
      },
      async deleteAlias(aliasId: string) {
        return callGateway<{ success: boolean }>("intl.payments.aliases.delete", { aliasId });
      },
      async confirmPayee(params: {
        aliasValue: string;
        aliasType: import("@/types").PaymentAliasType;
        network: import("@/types").PaymentNetwork;
      }) {
        return callGateway<{ confirmation: import("@/types").ConfirmationOfPayee }>(
          "intl.payments.confirmPayee",
          params,
        );
      },
      async send(params: {
        recipientAlias: string;
        recipientAliasType: import("@/types").PaymentAliasType;
        amountCents: number;
        currencyCode: string;
        network: import("@/types").PaymentNetwork;
        memo?: string;
      }) {
        return callGateway<{ payment: import("@/types").InternationalPayment }>(
          "intl.payments.send",
          params,
        );
      },
      async parseQR(qrData: string) {
        return callGateway<{ parsed: import("@/types").QRPaymentData }>("intl.payments.parseQR", {
          qrData,
        });
      },
      async generateQR(params: { aliasId: string; amountCents?: number; reference?: string }) {
        return callGateway<{ qrDataUrl: string; rawData: string }>(
          "intl.payments.generateQR",
          params,
        );
      },
      async listPayments(
        params: {
          network?: import("@/types").PaymentNetwork;
          status?: string;
          limit?: number;
          offset?: number;
        } = {},
      ) {
        return callGateway<{ payments: import("@/types").InternationalPayment[] }>(
          "intl.payments.list",
          params,
        );
      },
      async getLimits() {
        return callGateway<{ limits: import("@/types").InternationalPaymentLimits }>(
          "intl.payments.limits",
          {},
        );
      },
    },

    // International Compliance — Open Finance (Aggregation + Alt Credit)
    openFinance: {
      async listConnections() {
        return callGateway<{ connections: import("@/types").OpenFinanceConnection[] }>(
          "intl.openFinance.connections.list",
          {},
        );
      },
      async createConnection(params: {
        institutionId: string;
        countryCode: string;
        redirectUrl?: string;
      }) {
        return callGateway<{ connectionId: string; connectUrl: string; expiresAt: string }>(
          "intl.openFinance.connections.create",
          params,
        );
      },
      async refreshConnection(connectionId: string) {
        return callGateway<{ connection: import("@/types").OpenFinanceConnection }>(
          "intl.openFinance.connections.refresh",
          { connectionId },
        );
      },
      async removeConnection(connectionId: string) {
        return callGateway<{ success: boolean }>("intl.openFinance.connections.remove", {
          connectionId,
        });
      },
      async listAccounts(params: { connectionId?: string } = {}) {
        return callGateway<{ accounts: import("@/types").OpenFinanceAggregatedAccount[] }>(
          "intl.openFinance.accounts.list",
          params,
        );
      },
      async getNetWorth() {
        return callGateway<{ netWorth: import("@/types").OpenFinanceNetWorth }>(
          "intl.openFinance.netWorth",
          {},
        );
      },
      async getAlternativeCreditData() {
        return callGateway<{ creditData: import("@/types").AlternativeCreditData }>(
          "intl.openFinance.alternativeCredit",
          {},
        );
      },
    },
  };
}
