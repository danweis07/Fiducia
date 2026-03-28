import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/backend", () => ({
  getBackend: vi.fn().mockReturnValue({
    gateway: { invoke: vi.fn() },
  }),
}));
vi.mock("@/lib/demo", () => ({
  isDemoMode: vi.fn().mockReturnValue(false),
}));

import { gateway } from "../../gateway";
import { getBackend } from "@/lib/backend";

function mockInvoke(data: unknown) {
  const backend = getBackend();
  vi.mocked(backend.gateway.invoke).mockResolvedValue({ data, error: undefined, meta: {} });
  return vi.mocked(backend.gateway.invoke);
}

describe("Compliance Domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // KYC
  // ===========================================================================

  describe("kyc", () => {
    it("evaluate calls kyc.evaluate with identity params", async () => {
      const invoke = mockInvoke({ evaluation: { token: "k1", status: "approved" } });
      const params = {
        firstName: "John",
        lastName: "Doe",
        email: "j@d.com",
        phone: "5551234",
        dateOfBirth: "1990-01-01",
        ssn: "123456789",
        address: { line1: "123 Main", city: "NY", state: "NY", zip: "10001" },
      };
      await gateway.kyc.evaluate(params);
      expect(invoke).toHaveBeenCalledWith("kyc.evaluate", params);
    });

    it("status calls kyc.status with token", async () => {
      const invoke = mockInvoke({ evaluation: { token: "k1", status: "approved" } });
      await gateway.kyc.status("k1");
      expect(invoke).toHaveBeenCalledWith("kyc.status", { token: "k1" });
    });

    it("refresh calls kyc.refresh with params", async () => {
      const invoke = mockInvoke({ refresh: { status: "refreshed" } });
      const params = { token: "k1", intervalHours: 24, triggers: ["scheduled" as const] };
      await gateway.kyc.refresh(params);
      expect(invoke).toHaveBeenCalledWith("kyc.refresh", params);
    });

    it("configureRefresh calls kyc.configureRefresh with params", async () => {
      const invoke = mockInvoke({ configured: true, nextRefreshAt: "2026-04-01" });
      const params = { token: "k1", intervalHours: 48, riskThreshold: 0.7 };
      await gateway.kyc.configureRefresh(params);
      expect(invoke).toHaveBeenCalledWith("kyc.configureRefresh", params);
    });
  });

  // ===========================================================================
  // AML
  // ===========================================================================

  describe("aml", () => {
    it("screen calls aml.screen with subject", async () => {
      const invoke = mockInvoke({ screening: { id: "s1" }, monitoring: null });
      const params = {
        subject: {
          customerId: "c1",
          firstName: "John",
          lastName: "Doe",
          entityType: "individual" as const,
        },
        matchThreshold: 0.8,
      };
      await gateway.aml.screen(params);
      expect(invoke).toHaveBeenCalledWith("aml.screen", params);
    });

    it("getScreening calls aml.getScreening with screeningId", async () => {
      const invoke = mockInvoke({ screening: { id: "s1" } });
      await gateway.aml.getScreening("s1");
      expect(invoke).toHaveBeenCalledWith("aml.getScreening", { screeningId: "s1" });
    });

    it("monitoring.list calls aml.monitoring.list with params", async () => {
      const invoke = mockInvoke({ subscriptions: [] });
      await gateway.aml.monitoring.list({ customerId: "c1", limit: 10 });
      expect(invoke).toHaveBeenCalledWith("aml.monitoring.list", { customerId: "c1", limit: 10 });
    });

    it("monitoring.update calls aml.monitoring.update with params", async () => {
      const invoke = mockInvoke({ subscription: { id: "sub1" } });
      const params = { subscriptionId: "sub1", refreshIntervalHours: 12 };
      await gateway.aml.monitoring.update(params);
      expect(invoke).toHaveBeenCalledWith("aml.monitoring.update", params);
    });

    it("alerts.list calls aml.alerts.list with params", async () => {
      const invoke = mockInvoke({ alerts: [] });
      await gateway.aml.alerts.list({ customerId: "c1", unreviewedOnly: true });
      expect(invoke).toHaveBeenCalledWith("aml.alerts.list", {
        customerId: "c1",
        unreviewedOnly: true,
      });
    });

    it("alerts.review calls aml.alerts.review with params", async () => {
      const invoke = mockInvoke({ alert: { id: "a1", reviewed: true } });
      const params = { alertId: "a1", confirmedMatch: false, notes: "False positive" };
      await gateway.aml.alerts.review(params);
      expect(invoke).toHaveBeenCalledWith("aml.alerts.review", params);
    });
  });

  // ===========================================================================
  // ACTIVATION
  // ===========================================================================

  describe("activation", () => {
    it("config calls activation.config", async () => {
      const invoke = mockInvoke({ steps: ["identity", "terms"] });
      await gateway.activation.config();
      expect(invoke).toHaveBeenCalledWith("activation.config", {});
    });

    it("verifyIdentity calls activation.verifyIdentity with params", async () => {
      const invoke = mockInvoke({ token: "tok", status: "verified" });
      const params = { memberNumber: "12345", ssn: "1234", dateOfBirth: "1990-01-01" };
      await gateway.activation.verifyIdentity(params as Record<string, unknown>);
      expect(invoke).toHaveBeenCalledWith(
        "activation.verifyIdentity",
        expect.objectContaining({ memberNumber: "12345" }),
      );
    });

    it("acceptTerms calls activation.acceptTerms with params", async () => {
      const invoke = mockInvoke({ accepted: true });
      const params = { activationToken: "tok", acceptances: [{ documentId: "d1", version: "1" }] };
      await gateway.activation.acceptTerms(params);
      expect(invoke).toHaveBeenCalledWith("activation.acceptTerms", params);
    });

    it("createCredentials calls activation.createCredentials with params", async () => {
      const invoke = mockInvoke({ userId: "u1", status: "created" });
      const params = { activationToken: "tok", username: "jdoe", password: "secureP@ss1" };
      await gateway.activation.createCredentials(params as never);
      expect(invoke).toHaveBeenCalledWith(
        "activation.createCredentials",
        expect.objectContaining({ username: "jdoe" }),
      );
    });

    it("enrollMFA calls activation.enrollMFA with params", async () => {
      const invoke = mockInvoke({ enrollmentId: "e1", qrCode: "data:image" });
      const params = { activationToken: "tok", method: "totp" };
      await gateway.activation.enrollMFA(params as never);
      expect(invoke).toHaveBeenCalledWith(
        "activation.enrollMFA",
        expect.objectContaining({ method: "totp" }),
      );
    });

    it("verifyMFA calls activation.verifyMFA with params", async () => {
      const invoke = mockInvoke({ verified: true });
      const params = { activationToken: "tok", enrollmentId: "e1", code: "123456" };
      await gateway.activation.verifyMFA(params as never);
      expect(invoke).toHaveBeenCalledWith(
        "activation.verifyMFA",
        expect.objectContaining({ code: "123456" }),
      );
    });

    it("passkeyOptions calls activation.passkeyOptions with activationToken", async () => {
      const invoke = mockInvoke({ challenge: "abc", rpId: "example.com" });
      await gateway.activation.passkeyOptions("tok_123");
      expect(invoke).toHaveBeenCalledWith("activation.passkeyOptions", {
        activationToken: "tok_123",
      });
    });

    it("registerPasskey calls activation.registerPasskey with params", async () => {
      const invoke = mockInvoke({ registered: true, credentialId: "cred1" });
      const params = { activationToken: "tok", credentialId: "cred1", attestation: "att" };
      await gateway.activation.registerPasskey(params as never);
      expect(invoke).toHaveBeenCalledWith(
        "activation.registerPasskey",
        expect.objectContaining({ credentialId: "cred1" }),
      );
    });

    it("registerDevice calls activation.registerDevice with params", async () => {
      const invoke = mockInvoke({ deviceId: "dev1", trusted: true });
      const params = { activationToken: "tok", deviceFingerprint: "fp123", platform: "ios" };
      await gateway.activation.registerDevice(params as never);
      expect(invoke).toHaveBeenCalledWith(
        "activation.registerDevice",
        expect.objectContaining({ deviceFingerprint: "fp123" }),
      );
    });

    it("complete calls activation.complete with activationToken", async () => {
      const invoke = mockInvoke({ status: "completed", message: "Done" });
      await gateway.activation.complete("tok_123");
      expect(invoke).toHaveBeenCalledWith("activation.complete", { activationToken: "tok_123" });
    });

    it("checkTermsStatus calls activation.checkTermsStatus", async () => {
      const invoke = mockInvoke({ upToDate: true, pendingDocuments: [] });
      await gateway.activation.checkTermsStatus();
      expect(invoke).toHaveBeenCalledWith("activation.checkTermsStatus", {});
    });

    it("getTerms calls activation.getTerms with params", async () => {
      const invoke = mockInvoke({ documents: [] });
      await gateway.activation.getTerms({ type: "privacy" });
      expect(invoke).toHaveBeenCalledWith("activation.getTerms", { type: "privacy" });
    });

    it("createTermsVersion calls activation.createTermsVersion with params", async () => {
      const invoke = mockInvoke({ document: { id: "doc1" } });
      const params = {
        type: "tos",
        title: "Terms of Service",
        content: "Content here",
        version: "2.0",
        mandatory: true,
      };
      await gateway.activation.createTermsVersion(params);
      expect(invoke).toHaveBeenCalledWith("activation.createTermsVersion", params);
    });

    it("getTermsAcceptances calls activation.getTermsAcceptances with params", async () => {
      const invoke = mockInvoke({ acceptances: [] });
      await gateway.activation.getTermsAcceptances({ documentId: "doc1", currentOnly: true });
      expect(invoke).toHaveBeenCalledWith("activation.getTermsAcceptances", {
        documentId: "doc1",
        currentOnly: true,
      });
    });
  });

  // ===========================================================================
  // AUDIT
  // ===========================================================================

  describe("audit", () => {
    it("log calls audit.log with params", async () => {
      const invoke = mockInvoke({ entries: [] });
      await gateway.audit.log({ limit: 20, action: "create" });
      expect(invoke).toHaveBeenCalledWith("audit.log", { limit: 20, action: "create" });
    });
  });

  // ===========================================================================
  // COMPLIANCE AUDIT
  // ===========================================================================

  describe("complianceAudit", () => {
    it("syncEvidence calls complianceAudit.syncEvidence with params", async () => {
      const invoke = mockInvoke({ syncedCount: 5, failedCount: 0, skippedCount: 0, batchId: "b1" });
      const params = { frameworks: ["SOC2"], since: "2026-01-01", limit: 100 };
      await gateway.complianceAudit.syncEvidence(params);
      expect(invoke).toHaveBeenCalledWith("complianceAudit.syncEvidence", params);
    });

    it("reportIncident calls complianceAudit.reportIncident with params", async () => {
      const invoke = mockInvoke({ providerIncidentId: "pi1", accepted: true });
      const params = {
        incidentId: "i1",
        title: "Data breach",
        description: "Details",
        severity: "high",
        source: "internal",
      };
      await gateway.complianceAudit.reportIncident(params);
      expect(invoke).toHaveBeenCalledWith("complianceAudit.reportIncident", params);
    });

    it("status calls complianceAudit.status with params", async () => {
      const invoke = mockInvoke({ overallStatus: "compliant", frameworks: [], provider: "vanta" });
      await gateway.complianceAudit.status({ framework: "SOC2" });
      expect(invoke).toHaveBeenCalledWith("complianceAudit.status", { framework: "SOC2" });
    });

    it("syncHistory calls complianceAudit.syncHistory with params", async () => {
      const invoke = mockInvoke({ entries: [] });
      await gateway.complianceAudit.syncHistory({ limit: 10, status: "completed" });
      expect(invoke).toHaveBeenCalledWith("complianceAudit.syncHistory", {
        limit: 10,
        status: "completed",
      });
    });

    it("testConnection calls complianceAudit.testConnection", async () => {
      const invoke = mockInvoke({ connected: true, provider: "vanta" });
      await gateway.complianceAudit.testConnection();
      expect(invoke).toHaveBeenCalledWith("complianceAudit.testConnection", {});
    });
  });

  // ===========================================================================
  // OPEN BANKING
  // ===========================================================================

  describe("openBanking", () => {
    it("listConsents calls openBanking.consents.list with params", async () => {
      const invoke = mockInvoke({ consents: [] });
      await gateway.openBanking.listConsents({ status: "active" as const });
      expect(invoke).toHaveBeenCalledWith("openBanking.consents.list", { status: "active" });
    });

    it("getConsent calls openBanking.consents.get with consentId", async () => {
      const invoke = mockInvoke({ consent: { id: "con1" } });
      await gateway.openBanking.getConsent("con1");
      expect(invoke).toHaveBeenCalledWith("openBanking.consents.get", { consentId: "con1" });
    });

    it("grantConsent calls openBanking.consents.grant with params", async () => {
      const invoke = mockInvoke({ consent: { id: "con1" } });
      const params = {
        providerName: "Fintech App",
        providerId: "p1",
        scopes: ["accounts" as never],
        expiresInDays: 90,
      };
      await gateway.openBanking.grantConsent(params);
      expect(invoke).toHaveBeenCalledWith("openBanking.consents.grant", params);
    });

    it("revokeConsent calls openBanking.consents.revoke with consentId", async () => {
      const invoke = mockInvoke({ consent: { id: "con1", status: "revoked" } });
      await gateway.openBanking.revokeConsent("con1");
      expect(invoke).toHaveBeenCalledWith("openBanking.consents.revoke", { consentId: "con1" });
    });

    it("listAccessLogs calls openBanking.accessLogs.list with params", async () => {
      const invoke = mockInvoke({ accessLogs: [] });
      await gateway.openBanking.listAccessLogs({ consentId: "con1", limit: 20 });
      expect(invoke).toHaveBeenCalledWith("openBanking.accessLogs.list", {
        consentId: "con1",
        limit: 20,
      });
    });

    it("getConsentSummary calls openBanking.consents.summary", async () => {
      const invoke = mockInvoke({ summary: { totalConsents: 5 } });
      await gateway.openBanking.getConsentSummary();
      expect(invoke).toHaveBeenCalledWith("openBanking.consents.summary", {});
    });
  });

  // ===========================================================================
  // REGULATORY
  // ===========================================================================

  describe("regulatory", () => {
    it("getSafeguarding calls regulatory.safeguarding with params", async () => {
      const invoke = mockInvoke({ safeguarding: [] });
      await gateway.regulatory.getSafeguarding({ country: "GB" });
      expect(invoke).toHaveBeenCalledWith("regulatory.safeguarding", { country: "GB" });
    });

    it("listWithholding calls regulatory.withholding with params", async () => {
      const invoke = mockInvoke({
        entries: [],
        totalGrossInterestCents: 0,
        totalTaxWithheldCents: 0,
        totalNetInterestCents: 0,
      });
      await gateway.regulatory.listWithholding({ accountId: "a1", year: 2025 });
      expect(invoke).toHaveBeenCalledWith("regulatory.withholding", {
        accountId: "a1",
        year: 2025,
      });
    });

    it("getCarbonFootprint calls regulatory.carbon.transaction with transactionId", async () => {
      const invoke = mockInvoke({ co2Grams: 150, category: "transport" });
      await gateway.regulatory.getCarbonFootprint("t1");
      expect(invoke).toHaveBeenCalledWith("regulatory.carbon.transaction", { transactionId: "t1" });
    });

    it("getCarbonSummary calls regulatory.carbon.summary with params", async () => {
      const invoke = mockInvoke({ totalCo2Grams: 5000 });
      const params = { periodStart: "2026-01-01", periodEnd: "2026-03-31" };
      await gateway.regulatory.getCarbonSummary(params);
      expect(invoke).toHaveBeenCalledWith("regulatory.carbon.summary", params);
    });
  });

  // ===========================================================================
  // GLOBAL COMPLIANCE
  // ===========================================================================

  describe("globalCompliance", () => {
    it("requestDataPortability calls compliance.dataPortability with params", async () => {
      const invoke = mockInvoke({ export: {}, format: "json" });
      await gateway.globalCompliance.requestDataPortability({ format: "csv" });
      expect(invoke).toHaveBeenCalledWith("compliance.dataPortability", { format: "csv" });
    });

    it("getDataResidency calls compliance.dataResidency", async () => {
      const invoke = mockInvoke({
        tenantId: "t1",
        dataResidencyRegion: "eu-west-1",
        countryCode: "DE",
        regulations: ["GDPR"],
      });
      await gateway.globalCompliance.getDataResidency();
      expect(invoke).toHaveBeenCalledWith("compliance.dataResidency", {});
    });

    it("getLoanCoolingOff calls compliance.loanCoolingOff with loanId", async () => {
      const invoke = mockInvoke({ loanId: "l1", coolingOffApplicable: true, coolingOffDays: 14 });
      await gateway.globalCompliance.getLoanCoolingOff("l1");
      expect(invoke).toHaveBeenCalledWith("compliance.loanCoolingOff", { loanId: "l1" });
    });

    it("exerciseLoanWithdrawal calls compliance.loanWithdrawal with params", async () => {
      const invoke = mockInvoke({ loanId: "l1", status: "withdrawn", withdrawnAt: "2026-03-17" });
      const params = { loanId: "l1", reason: "Changed mind" };
      await gateway.globalCompliance.exerciseLoanWithdrawal(params);
      expect(invoke).toHaveBeenCalledWith("compliance.loanWithdrawal", params);
    });

    it("getInterestWithholding calls compliance.interestWithholding with params", async () => {
      const invoke = mockInvoke({ accountId: "a1", taxYear: "2025", grossInterestCents: 10000 });
      const params = { accountId: "a1", taxYear: "2025" };
      await gateway.globalCompliance.getInterestWithholding(params);
      expect(invoke).toHaveBeenCalledWith("compliance.interestWithholding", params);
    });
  });

  // ===========================================================================
  // SCA
  // ===========================================================================

  describe("sca", () => {
    it("initiate calls sca.initiate with params", async () => {
      const invoke = mockInvoke({
        challenge: {
          challengeId: "ch1",
          method: "sms",
          status: "pending",
          expiresAt: "2026-03-17T12:00:00Z",
        },
      });
      const params = {
        action: "payment",
        preferredMethod: "sms",
        amountMinorUnits: 50000,
        currency: "GBP",
      };
      await gateway.sca.initiate(params);
      expect(invoke).toHaveBeenCalledWith("sca.initiate", params);
    });

    it("complete calls sca.complete with params", async () => {
      const invoke = mockInvoke({
        result: { outcome: "success", factorsVerified: ["sms"], authorizationCode: "auth1" },
      });
      const params = { challengeId: "ch1", authenticationProof: "proof123" };
      await gateway.sca.complete(params);
      expect(invoke).toHaveBeenCalledWith("sca.complete", params);
    });

    it("checkExemption calls sca.checkExemption with params", async () => {
      const invoke = mockInvoke({ exempt: true, exemptionType: "low_value", reason: null });
      const params = { exemptionType: "low_value", amountMinorUnits: 1000, currency: "EUR" };
      await gateway.sca.checkExemption(params);
      expect(invoke).toHaveBeenCalledWith("sca.checkExemption", params);
    });
  });

  // ===========================================================================
  // CONFIRMATION OF PAYEE
  // ===========================================================================

  describe("confirmationOfPayee", () => {
    it("verify calls cop.verify with params", async () => {
      const invoke = mockInvoke({ verification: { verificationId: "v1", matchResult: "match" } });
      const params = {
        payeeName: "John Doe",
        sortCode: "123456",
        accountNumber: "12345678",
        scheme: "uk_fps",
      };
      await gateway.confirmationOfPayee.verify(params);
      expect(invoke).toHaveBeenCalledWith("cop.verify", params);
    });

    it("getVerification calls cop.getVerification with verificationId", async () => {
      const invoke = mockInvoke({ verification: { verificationId: "v1", matchResult: "match" } });
      await gateway.confirmationOfPayee.getVerification("v1");
      expect(invoke).toHaveBeenCalledWith("cop.getVerification", { verificationId: "v1" });
    });
  });
});
