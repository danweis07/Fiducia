/**
 * Gateway Domain — KYC, AML, Activation, Audit, ComplianceAudit, OpenBanking, Regulatory, GlobalCompliance, SCA, ConfirmationOfPayee
 */

import type { CallGatewayFn, Pagination } from "./client";
import type {
  AuditLogEntry,
  OpenBankingConsent,
  OpenBankingConsentStatus,
  OpenBankingScope,
  OpenBankingAccessLog,
  OpenBankingConsentSummary,
} from "@/types";

export function createComplianceDomain(callGateway: CallGatewayFn) {
  return {
    kyc: {
      async evaluate(params: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        dateOfBirth: string;
        /** @pii SSN — sent to server but never returned in plain text */
        ssn: string;
        address: {
          line1: string;
          line2?: string;
          city: string;
          state: string;
          zip: string;
        };
      }) {
        return callGateway<{
          evaluation: {
            token: string;
            status: "approved" | "denied" | "pending_review" | "manual_review";
            reasons: string[];
            ssnMasked: string;
            createdAt: string;
            updatedAt: string;
          };
          adapter: string;
        }>("kyc.evaluate", params as unknown as Record<string, unknown>);
      },

      async status(token: string) {
        return callGateway<{
          evaluation: {
            token: string;
            status: "approved" | "denied" | "pending_review" | "manual_review" | "expired";
            reasons: string[];
            createdAt: string;
            updatedAt: string;
          };
          adapter: string;
        }>("kyc.status", { token });
      },

      async refresh(params: {
        token: string;
        intervalHours?: number;
        triggers?: Array<"scheduled" | "event_driven" | "risk_based" | "manual">;
        riskThreshold?: number;
        autoDenyOnHighRisk?: boolean;
      }) {
        return callGateway<{
          refresh: import("@/types/banking").KYCRefreshResult;
          adapter: string;
        }>("kyc.refresh", params as unknown as Record<string, unknown>);
      },

      async configureRefresh(params: {
        token: string;
        intervalHours?: number;
        triggers?: Array<"scheduled" | "event_driven" | "risk_based" | "manual">;
        riskThreshold?: number;
        autoDenyOnHighRisk?: boolean;
      }) {
        return callGateway<{ configured: boolean; nextRefreshAt: string; adapter: string }>(
          "kyc.configureRefresh",
          params as unknown as Record<string, unknown>,
        );
      },
    },

    aml: {
      async screen(params: {
        subject: {
          customerId: string;
          firstName: string;
          middleName?: string;
          lastName: string;
          dateOfBirth?: string;
          nationality?: string;
          countryOfResidence?: string;
          entityType: "individual" | "organization";
          organizationName?: string;
          idNumber?: string;
          idType?: "passport" | "national_id" | "drivers_license" | "ssn" | "ein";
        };
        watchlists?: import("@/types/banking").WatchlistSource[];
        matchThreshold?: number;
        enableMonitoring?: boolean;
        monitoringIntervalHours?: number;
      }) {
        return callGateway<{
          screening: import("@/types/banking").ScreeningResult;
          monitoring: import("@/types/banking").MonitoringSubscription | null;
        }>("aml.screen", params as unknown as Record<string, unknown>);
      },

      async getScreening(screeningId: string) {
        return callGateway<{ screening: import("@/types/banking").ScreeningResult }>(
          "aml.getScreening",
          { screeningId },
        );
      },

      monitoring: {
        async list(
          params: {
            customerId?: string;
            status?: import("@/types/banking").MonitoringStatus;
            limit?: number;
            offset?: number;
          } = {},
        ) {
          return callGateway<{ subscriptions: import("@/types/banking").MonitoringSubscription[] }>(
            "aml.monitoring.list",
            params as Record<string, unknown>,
          );
        },

        async update(params: {
          subscriptionId: string;
          status?: import("@/types/banking").MonitoringStatus;
          watchlists?: import("@/types/banking").WatchlistSource[];
          refreshIntervalHours?: number;
        }) {
          return callGateway<{ subscription: import("@/types/banking").MonitoringSubscription }>(
            "aml.monitoring.update",
            params as unknown as Record<string, unknown>,
          );
        },
      },

      alerts: {
        async list(
          params: {
            customerId?: string;
            subscriptionId?: string;
            unreviewedOnly?: boolean;
            limit?: number;
            offset?: number;
          } = {},
        ) {
          return callGateway<{ alerts: import("@/types/banking").MonitoringAlert[] }>(
            "aml.alerts.list",
            params as Record<string, unknown>,
          );
        },

        async review(params: { alertId: string; confirmedMatch: boolean; notes: string }) {
          return callGateway<{ alert: import("@/types/banking").MonitoringAlert }>(
            "aml.alerts.review",
            params as unknown as Record<string, unknown>,
          );
        },
      },
    },

    activation: {
      /** Get tenant-specific activation configuration (required fields, credential rules, MFA policies, terms) */
      async config() {
        return callGateway<import("@/types/activation").ActivationConfig>("activation.config", {});
      },

      /** Verify member identity against core banking records */
      async verifyIdentity(params: import("@/types/activation").IdentityVerificationRequest) {
        return callGateway<import("@/types/activation").IdentityVerificationResult>(
          "activation.verifyIdentity",
          params as unknown as Record<string, unknown>,
        );
      },

      /** Accept terms and disclosures */
      async acceptTerms(params: {
        activationToken: string;
        acceptances: Array<{ documentId: string; version: string }>;
      }) {
        return callGateway<{
          accepted: boolean;
          documents: Array<{ documentId: string; version: string; acceptedAt: string }>;
        }>("activation.acceptTerms", params as unknown as Record<string, unknown>);
      },

      /** Create login credentials (username + password) */
      async createCredentials(params: import("@/types/activation").CredentialCreateRequest) {
        return callGateway<import("@/types/activation").CredentialCreateResult>(
          "activation.createCredentials",
          params as unknown as Record<string, unknown>,
        );
      },

      /** Initiate MFA enrollment */
      async enrollMFA(params: import("@/types/activation").MFAEnrollRequest) {
        return callGateway<import("@/types/activation").MFAEnrollResult>(
          "activation.enrollMFA",
          params as unknown as Record<string, unknown>,
        );
      },

      /** Verify MFA code during enrollment */
      async verifyMFA(params: import("@/types/activation").MFAVerifyRequest) {
        return callGateway<import("@/types/activation").MFAVerifyResult>(
          "activation.verifyMFA",
          params as unknown as Record<string, unknown>,
        );
      },

      /** Get passkey registration options (WebAuthn challenge) */
      async passkeyOptions(activationToken: string) {
        return callGateway<import("@/types/activation").PasskeyRegistrationOptions>(
          "activation.passkeyOptions",
          { activationToken },
        );
      },

      /** Register a passkey after WebAuthn credential creation */
      async registerPasskey(params: import("@/types/activation").PasskeyRegistrationResponse) {
        return callGateway<import("@/types/activation").PasskeyRegistrationResult>(
          "activation.registerPasskey",
          params as unknown as Record<string, unknown>,
        );
      },

      /** Register trusted device */
      async registerDevice(params: import("@/types/activation").DeviceRegisterRequest) {
        return callGateway<import("@/types/activation").DeviceRegisterResult>(
          "activation.registerDevice",
          params as unknown as Record<string, unknown>,
        );
      },

      /** Complete the activation flow */
      async complete(activationToken: string) {
        return callGateway<{ status: string; message: string }>("activation.complete", {
          activationToken,
        });
      },

      /** Check if authenticated member needs to accept new/updated terms */
      async checkTermsStatus() {
        return callGateway<{
          upToDate: boolean;
          pendingDocuments: Array<import("@/types/activation").TermsDocument>;
        }>("activation.checkTermsStatus", {});
      },

      /** Get active terms documents */
      async getTerms(params: { type?: string } = {}) {
        return callGateway<{
          documents: Array<import("@/types/activation").TermsDocument>;
        }>("activation.getTerms", params);
      },

      /** Admin: create new terms version */
      async createTermsVersion(params: {
        type: string;
        title: string;
        content: string;
        version: string;
        mandatory: boolean;
      }) {
        return callGateway<{ document: import("@/types/activation").TermsDocument }>(
          "activation.createTermsVersion",
          params as unknown as Record<string, unknown>,
        );
      },

      /** Admin: get terms acceptance records */
      async getTermsAcceptances(params: { documentId?: string; currentOnly?: boolean } = {}) {
        return callGateway<{
          acceptances: Array<import("@/types/activation").TermsAcceptance>;
        }>("activation.getTermsAcceptances", params);
      },
    },

    audit: {
      async log(params: { limit?: number; offset?: number; action?: string } = {}) {
        return callGateway<{ entries: AuditLogEntry[]; _pagination?: Pagination }>(
          "audit.log",
          params,
        );
      },
    },

    complianceAudit: {
      async syncEvidence(
        params: {
          records?: Array<{
            eventId: string;
            timestamp: string;
            action: string;
            actorId: string;
            actorLabel: string;
            resourceType: string;
            resourceId: string;
            category: string;
            description: string;
            metadata?: Record<string, unknown>;
          }>;
          frameworks?: string[];
          since?: string;
          limit?: number;
        } = {},
      ) {
        return callGateway<{
          syncedCount: number;
          failedCount: number;
          skippedCount: number;
          batchId: string | null;
          message?: string;
          details?: Array<{ eventId: string; status: string; errorMessage?: string }>;
        }>("complianceAudit.syncEvidence", params);
      },
      async reportIncident(params: {
        incidentId: string;
        title: string;
        description: string;
        severity: string;
        source: string;
        detectedAt?: string;
        resolvedAt?: string;
        metadata?: Record<string, unknown>;
      }) {
        return callGateway<{
          providerIncidentId: string;
          accepted: boolean;
          dashboardUrl?: string;
        }>("complianceAudit.reportIncident", params);
      },
      async status(params: { framework?: string } = {}) {
        return callGateway<{
          overallStatus: string;
          frameworks: Array<{
            framework: string;
            status: string;
            controlsPassingPct: number;
            openFindings: number;
            lastSyncAt: string | null;
          }>;
          provider: string;
        }>("complianceAudit.status", params);
      },
      async syncHistory(params: { limit?: number; offset?: number; status?: string } = {}) {
        return callGateway<{
          entries: Array<{
            batchId: string;
            syncedAt: string;
            recordCount: number;
            syncedCount: number;
            failedCount: number;
            status: string;
            provider: string;
          }>;
        }>("complianceAudit.syncHistory", params);
      },
      async testConnection() {
        return callGateway<{
          connected: boolean;
          provider: string;
          providerAccountName?: string;
          apiVersion?: string;
          errorMessage?: string;
        }>("complianceAudit.testConnection", {});
      },
    },

    openBanking: {
      async listConsents(
        params: { status?: OpenBankingConsentStatus; limit?: number; offset?: number } = {},
      ) {
        return callGateway<{ consents: OpenBankingConsent[] }>("openBanking.consents.list", params);
      },

      async getConsent(consentId: string) {
        return callGateway<{ consent: OpenBankingConsent }>("openBanking.consents.get", {
          consentId,
        });
      },

      async grantConsent(params: {
        providerName: string;
        providerId: string;
        scopes: OpenBankingScope[];
        accountIds?: string[];
        expiresInDays?: number;
        providerLogo?: string;
        providerUrl?: string;
        accessFrequency?: string;
        connectionId?: string;
        metadata?: Record<string, unknown>;
      }) {
        return callGateway<{ consent: OpenBankingConsent }>("openBanking.consents.grant", params);
      },

      async revokeConsent(consentId: string) {
        return callGateway<{ consent: OpenBankingConsent }>("openBanking.consents.revoke", {
          consentId,
        });
      },

      async listAccessLogs(params: { consentId?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ accessLogs: OpenBankingAccessLog[] }>(
          "openBanking.accessLogs.list",
          params,
        );
      },

      async getConsentSummary() {
        return callGateway<{ summary: OpenBankingConsentSummary }>(
          "openBanking.consents.summary",
          {},
        );
      },
    },

    regulatory: {
      async getSafeguarding(params: { country?: string } = {}) {
        return callGateway<{ safeguarding: import("@/types").SafeguardingInfo[] }>(
          "regulatory.safeguarding",
          params,
        );
      },
      async listWithholding(params: { accountId?: string; year?: number; currency?: string } = {}) {
        return callGateway<{
          entries: import("@/types").InterestWithholdingEntry[];
          totalGrossInterestCents: number;
          totalTaxWithheldCents: number;
          totalNetInterestCents: number;
        }>("regulatory.withholding", params);
      },
      async getCarbonFootprint(transactionId: string) {
        return callGateway<import("@/types").CarbonFootprint>("regulatory.carbon.transaction", {
          transactionId,
        });
      },
      async getCarbonSummary(params: { periodStart: string; periodEnd: string }) {
        return callGateway<import("@/types").CarbonSummary>("regulatory.carbon.summary", params);
      },
    },

    globalCompliance: {
      async requestDataPortability(params: { format?: string } = {}) {
        return callGateway<{ export: Record<string, unknown>; format: string }>(
          "compliance.dataPortability",
          params,
        );
      },
      async getDataResidency() {
        return callGateway<{
          tenantId: string;
          dataResidencyRegion: string;
          countryCode: string;
          regulations: string[];
        }>("compliance.dataResidency", {});
      },
      async getLoanCoolingOff(loanId: string) {
        return callGateway<{
          loanId: string;
          coolingOffApplicable: boolean;
          coolingOffDays?: number;
          isActive?: boolean;
          daysRemaining?: number;
          canWithdraw?: boolean;
        }>("compliance.loanCoolingOff", { loanId });
      },
      async exerciseLoanWithdrawal(params: { loanId: string; reason?: string }) {
        return callGateway<{
          loanId: string;
          status: string;
          withdrawnAt: string;
          principalToReturn: number;
          penaltyAmount: number;
        }>("compliance.loanWithdrawal", params);
      },
      async getInterestWithholding(params: { accountId: string; taxYear?: string }) {
        return callGateway<{
          accountId: string;
          taxYear: string;
          jurisdiction: string;
          grossInterestCents: number;
          taxWithheldCents: number;
          netInterestCents: number;
          withholdingRateBps: number;
          regulation: string;
        }>("compliance.interestWithholding", params);
      },
    },

    sca: {
      async initiate(params: {
        action: string;
        preferredMethod?: string;
        amountMinorUnits?: number;
        currency?: string;
        payeeName?: string;
        payeeAccountIdentifier?: string;
      }) {
        return callGateway<{
          challenge: { challengeId: string; method: string; status: string; expiresAt: string };
        }>("sca.initiate", params);
      },
      async complete(params: { challengeId: string; authenticationProof: string }) {
        return callGateway<{
          result: { outcome: string; factorsVerified: string[]; authorizationCode: string | null };
        }>("sca.complete", params);
      },
      async checkExemption(params: {
        exemptionType: string;
        amountMinorUnits?: number;
        currency?: string;
        payeeAccountIdentifier?: string;
      }) {
        return callGateway<{ exempt: boolean; exemptionType: string; reason: string | null }>(
          "sca.checkExemption",
          params,
        );
      },
    },

    confirmationOfPayee: {
      async verify(params: {
        payeeName: string;
        iban?: string;
        bic?: string;
        sortCode?: string;
        accountNumber?: string;
        routingNumber?: string;
        pixKey?: string;
        pixKeyType?: string;
        vpa?: string;
        scheme?: string;
      }) {
        return callGateway<{
          verification: {
            verificationId: string;
            scheme: string;
            matchResult: string;
            verifiedName: string | null;
            providedName: string;
            closeMatchReason: string | null;
            receivingInstitution: string | null;
            verifiedAt: string;
          };
        }>("cop.verify", params);
      },
      async getVerification(verificationId: string) {
        return callGateway<{
          verification: {
            verificationId: string;
            scheme: string;
            matchResult: string;
            verifiedName: string | null;
            providedName: string;
            closeMatchReason: string | null;
            receivingInstitution: string | null;
            verifiedAt: string;
          };
        }>("cop.getVerification", { verificationId });
      },
    },
  };
}
