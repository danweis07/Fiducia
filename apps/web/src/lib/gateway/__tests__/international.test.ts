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

describe("InternationalDomain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── internationalPayments ───────────────────────────────────────────────────

  describe("internationalPayments", () => {
    it("getCoverage calls internationalPayments.coverage", async () => {
      const invoke = mockInvoke({ countries: [], total: 0 });
      await gateway.internationalPayments.getCoverage({ region: "EU" });
      expect(invoke).toHaveBeenCalledWith("internationalPayments.coverage", { region: "EU" });
    });

    it("getFXQuote calls internationalPayments.fxQuote", async () => {
      const invoke = mockInvoke({ rate: 1.1 });
      const params = { fromCurrency: "USD", toCurrency: "EUR", fromAmountCents: 10000 };
      await gateway.internationalPayments.getFXQuote(params);
      expect(invoke).toHaveBeenCalledWith("internationalPayments.fxQuote", params);
    });

    it("createPayment calls internationalPayments.create", async () => {
      const invoke = mockInvoke({ id: "p1" });
      const params = {
        fromAccountId: "a1",
        fromCurrency: "USD",
        toCurrency: "EUR",
        amountCents: 50000,
        beneficiaryName: "John",
        beneficiaryCountry: "DE",
        beneficiaryAccountNumber: "DE89370400440532013000",
      };
      await gateway.internationalPayments.createPayment(params);
      expect(invoke).toHaveBeenCalledWith("internationalPayments.create", params);
    });

    it("getPayment calls internationalPayments.get", async () => {
      const invoke = mockInvoke({ id: "p1" });
      await gateway.internationalPayments.getPayment("p1");
      expect(invoke).toHaveBeenCalledWith("internationalPayments.get", { paymentId: "p1" });
    });

    it("listPayments calls internationalPayments.list", async () => {
      const invoke = mockInvoke([]);
      await gateway.internationalPayments.listPayments({ status: "completed" });
      expect(invoke).toHaveBeenCalledWith("internationalPayments.list", { status: "completed" });
    });

    it("issueCard calls internationalPayments.cards.issue", async () => {
      const invoke = mockInvoke({ id: "c1" });
      const params = {
        type: "virtual",
        cardholderName: "Jane",
        currency: "EUR",
        country: "DE",
        spendLimitCents: 100000,
      };
      await gateway.internationalPayments.issueCard(params);
      expect(invoke).toHaveBeenCalledWith("internationalPayments.cards.issue", params);
    });

    it("listCards calls internationalPayments.cards.list", async () => {
      const invoke = mockInvoke([]);
      await gateway.internationalPayments.listCards({ status: "active" });
      expect(invoke).toHaveBeenCalledWith("internationalPayments.cards.list", { status: "active" });
    });

    it("createPayout calls internationalPayments.payouts.create", async () => {
      const invoke = mockInvoke({ id: "po1" });
      const params = {
        destinationCountry: "MX",
        destinationCurrency: "MXN",
        amountCents: 200000,
        recipientName: "Maria",
        recipientAccountNumber: "012345678901234567",
      };
      await gateway.internationalPayments.createPayout(params);
      expect(invoke).toHaveBeenCalledWith("internationalPayments.payouts.create", params);
    });

    it("listPayouts calls internationalPayments.payouts.list", async () => {
      const invoke = mockInvoke([]);
      await gateway.internationalPayments.listPayouts({ status: "pending" });
      expect(invoke).toHaveBeenCalledWith("internationalPayments.payouts.list", {
        status: "pending",
      });
    });
  });

  // ── internationalBillPay ────────────────────────────────────────────────────

  describe("internationalBillPay", () => {
    it("searchBillers calls internationalBillPay.billers.search", async () => {
      const invoke = mockInvoke({ billers: [], total: 0 });
      await gateway.internationalBillPay.searchBillers({ query: "Electric", country: "MX" });
      expect(invoke).toHaveBeenCalledWith("internationalBillPay.billers.search", {
        query: "Electric",
        country: "MX",
      });
    });

    it("payBill calls internationalBillPay.pay", async () => {
      const invoke = mockInvoke({ id: "bp1" });
      const params = {
        billerId: "b1",
        fromAccountId: "a1",
        fromCurrency: "USD",
        amountCents: 5000,
        accountReference: "REF123",
      };
      await gateway.internationalBillPay.payBill(params);
      expect(invoke).toHaveBeenCalledWith("internationalBillPay.pay", params);
    });

    it("getPayment calls internationalBillPay.get", async () => {
      const invoke = mockInvoke({ id: "bp1" });
      await gateway.internationalBillPay.getPayment("bp1");
      expect(invoke).toHaveBeenCalledWith("internationalBillPay.get", { paymentId: "bp1" });
    });

    it("listPayments calls internationalBillPay.list", async () => {
      const invoke = mockInvoke([]);
      await gateway.internationalBillPay.listPayments({ country: "MX" });
      expect(invoke).toHaveBeenCalledWith("internationalBillPay.list", { country: "MX" });
    });

    it("getCountries calls internationalBillPay.countries", async () => {
      const invoke = mockInvoke({ countries: [] });
      await gateway.internationalBillPay.getCountries();
      expect(invoke).toHaveBeenCalledWith("internationalBillPay.countries", {});
    });
  });

  // ── internationalLoans ──────────────────────────────────────────────────────

  describe("internationalLoans", () => {
    it("createApplication calls internationalLoans.application.create", async () => {
      const invoke = mockInvoke({ application: {} });
      const params = {
        country: "BR",
        currency: "BRL",
        productType: "personal",
        requestedAmountCents: 500000,
        applicant: { firstName: "Carlos", lastName: "Silva" },
      };
      await gateway.internationalLoans.createApplication(params);
      expect(invoke).toHaveBeenCalledWith("internationalLoans.application.create", params);
    });

    it("getApplication calls internationalLoans.application.get", async () => {
      const invoke = mockInvoke({ application: {} });
      await gateway.internationalLoans.getApplication("app1");
      expect(invoke).toHaveBeenCalledWith("internationalLoans.application.get", {
        applicationId: "app1",
      });
    });

    it("listApplications calls internationalLoans.application.list", async () => {
      const invoke = mockInvoke([]);
      await gateway.internationalLoans.listApplications({ country: "BR" });
      expect(invoke).toHaveBeenCalledWith("internationalLoans.application.list", { country: "BR" });
    });

    it("getCreditAssessment calls internationalLoans.creditAssessment", async () => {
      const invoke = mockInvoke({ assessment: {} });
      await gateway.internationalLoans.getCreditAssessment("app1");
      expect(invoke).toHaveBeenCalledWith("internationalLoans.creditAssessment", {
        applicationId: "app1",
      });
    });

    it("getComplianceChecks calls internationalLoans.complianceChecks", async () => {
      const invoke = mockInvoke({ checks: [] });
      await gateway.internationalLoans.getComplianceChecks("app1");
      expect(invoke).toHaveBeenCalledWith("internationalLoans.complianceChecks", {
        applicationId: "app1",
      });
    });
  });

  // ── baas ────────────────────────────────────────────────────────────────────

  describe("baas", () => {
    it("listAccounts calls baas.accounts.list", async () => {
      const invoke = mockInvoke([]);
      await gateway.baas.listAccounts({ country: "GB" });
      expect(invoke).toHaveBeenCalledWith("baas.accounts.list", { country: "GB" });
    });

    it("createAccount calls baas.accounts.create", async () => {
      const invoke = mockInvoke({ account: {} });
      const params = {
        country: "GB",
        currency: "GBP",
        accountType: "current",
        accountHolderName: "John",
      };
      await gateway.baas.createAccount(params);
      expect(invoke).toHaveBeenCalledWith("baas.accounts.create", params);
    });

    it("getAccount calls baas.accounts.get", async () => {
      const invoke = mockInvoke({ account: {} });
      await gateway.baas.getAccount("acc1");
      expect(invoke).toHaveBeenCalledWith("baas.accounts.get", { accountId: "acc1" });
    });

    it("initiatePayment calls baas.payments.initiate", async () => {
      const invoke = mockInvoke({ paymentId: "p1", status: "pending" });
      const params = {
        fromAccountId: "a1",
        toIban: "GB82WEST12345698765432",
        amountCents: 10000,
        currency: "GBP",
      };
      await gateway.baas.initiatePayment(params);
      expect(invoke).toHaveBeenCalledWith("baas.payments.initiate", params);
    });

    it("getKYCStatus calls baas.kyc.status", async () => {
      const invoke = mockInvoke({ status: "verified", checks: [] });
      await gateway.baas.getKYCStatus();
      expect(invoke).toHaveBeenCalledWith("baas.kyc.status", {});
    });

    it("getComplianceStatus calls baas.compliance.status", async () => {
      const invoke = mockInvoke({ status: "compliant", jurisdictions: [] });
      await gateway.baas.getComplianceStatus();
      expect(invoke).toHaveBeenCalledWith("baas.compliance.status", {});
    });
  });

  // ── alias ───────────────────────────────────────────────────────────────────

  describe("alias", () => {
    it("resolve calls alias.resolve", async () => {
      const invoke = mockInvoke({ resolution: {} });
      const params = { aliasType: "email", aliasValue: "user@example.com" };
      await gateway.alias.resolve(params);
      expect(invoke).toHaveBeenCalledWith("alias.resolve", params);
    });

    it("pay calls alias.pay", async () => {
      const invoke = mockInvoke({
        paymentId: "p1",
        status: "sent",
        resolvedName: "Jane",
        resolvedInstitution: "Bank",
        rail: "faster",
        estimatedArrival: "",
      });
      const params = {
        sourceAccountId: "a1",
        aliasType: "email",
        aliasValue: "jane@example.com",
        amountCents: 5000,
        currency: "GBP",
        description: "Payment",
        idempotencyKey: "key1",
      };
      await gateway.alias.pay(params);
      expect(invoke).toHaveBeenCalledWith("alias.pay", params);
    });

    it("listInboundR2P calls alias.r2p.inbound.list", async () => {
      const invoke = mockInvoke({ requests: [], total: 0, hasMore: false, nextCursor: null });
      await gateway.alias.listInboundR2P({ status: "pending" });
      expect(invoke).toHaveBeenCalledWith("alias.r2p.inbound.list", { status: "pending" });
    });

    it("respondToR2P calls alias.r2p.inbound.respond", async () => {
      const invoke = mockInvoke({ requestId: "r1", status: "approved", paymentId: "p1" });
      const params = { requestId: "r1", action: "approve" as const, sourceAccountId: "a1" };
      await gateway.alias.respondToR2P(params);
      expect(invoke).toHaveBeenCalledWith("alias.r2p.inbound.respond", params);
    });

    it("sendR2P calls alias.r2p.outbound.send", async () => {
      const invoke = mockInvoke({ request: {} });
      const params = {
        sourceAccountId: "a1",
        payerAlias: "user@example.com",
        payerAliasType: "email",
        amountCents: 3000,
        currency: "GBP",
        description: "Invoice",
        expiresAt: "2025-12-31",
      };
      await gateway.alias.sendR2P(params);
      expect(invoke).toHaveBeenCalledWith("alias.r2p.outbound.send", params);
    });

    it("listOutboundR2P calls alias.r2p.outbound.list", async () => {
      const invoke = mockInvoke({ requests: [], total: 0, hasMore: false, nextCursor: null });
      await gateway.alias.listOutboundR2P({ status: "pending" });
      expect(invoke).toHaveBeenCalledWith("alias.r2p.outbound.list", { status: "pending" });
    });

    it("getDirectories calls alias.directories", async () => {
      const invoke = mockInvoke({ directories: [] });
      await gateway.alias.getDirectories();
      expect(invoke).toHaveBeenCalledWith("alias.directories", {});
    });
  });

  // ── currencyPots ────────────────────────────────────────────────────────────

  describe("currencyPots", () => {
    it("list calls currency.pots.list", async () => {
      const invoke = mockInvoke({ pots: [] });
      await gateway.currencyPots.list({ status: "active" });
      expect(invoke).toHaveBeenCalledWith("currency.pots.list", { status: "active" });
    });

    it("create calls currency.pots.create", async () => {
      const invoke = mockInvoke({ pot: {} });
      const params = { currency: "EUR", initialDepositCents: 10000 };
      await gateway.currencyPots.create(params);
      expect(invoke).toHaveBeenCalledWith("currency.pots.create", params);
    });

    it("get calls currency.pots.get", async () => {
      const invoke = mockInvoke({ id: "pot1" });
      await gateway.currencyPots.get("pot1");
      expect(invoke).toHaveBeenCalledWith("currency.pots.get", { potId: "pot1" });
    });

    it("close calls currency.pots.close", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.currencyPots.close({ potId: "pot1", transferToPotId: "pot2" });
      expect(invoke).toHaveBeenCalledWith("currency.pots.close", {
        potId: "pot1",
        transferToPotId: "pot2",
      });
    });

    it("generateVIBAN calls currency.viban.generate", async () => {
      const invoke = mockInvoke({ viban: {} });
      await gateway.currencyPots.generateVIBAN({ potId: "pot1", country: "DE" });
      expect(invoke).toHaveBeenCalledWith("currency.viban.generate", {
        potId: "pot1",
        country: "DE",
      });
    });

    it("getSwapQuote calls currency.swap.quote", async () => {
      const invoke = mockInvoke({ rate: 1.1 });
      const params = { fromPotId: "pot1", toPotId: "pot2", fromAmountCents: 10000 };
      await gateway.currencyPots.getSwapQuote(params);
      expect(invoke).toHaveBeenCalledWith("currency.swap.quote", params);
    });

    it("executeSwap calls currency.swap.execute", async () => {
      const invoke = mockInvoke({ swap: {} });
      const params = {
        quoteId: "q1",
        fromPotId: "pot1",
        toPotId: "pot2",
        fromAmountCents: 10000,
        idempotencyKey: "key1",
      };
      await gateway.currencyPots.executeSwap(params);
      expect(invoke).toHaveBeenCalledWith("currency.swap.execute", params);
    });

    it("listSwaps calls currency.swap.list", async () => {
      const invoke = mockInvoke({ swaps: [], total: 0, hasMore: false, nextCursor: null });
      await gateway.currencyPots.listSwaps({ potId: "pot1" });
      expect(invoke).toHaveBeenCalledWith("currency.swap.list", { potId: "pot1" });
    });
  });

  // ── internationalConsents ───────────────────────────────────────────────────

  describe("internationalConsents", () => {
    it("list calls intl.consents.list", async () => {
      const invoke = mockInvoke({ consents: [] });
      await gateway.internationalConsents.list({ regulation: "PSD2" });
      expect(invoke).toHaveBeenCalledWith("intl.consents.list", { regulation: "PSD2" });
    });

    it("get calls intl.consents.get", async () => {
      const invoke = mockInvoke({ consent: {} });
      await gateway.internationalConsents.get("con1");
      expect(invoke).toHaveBeenCalledWith("intl.consents.get", { consentId: "con1" });
    });

    it("revoke calls intl.consents.revoke", async () => {
      const invoke = mockInvoke({ consent: {} });
      await gateway.internationalConsents.revoke("con1");
      expect(invoke).toHaveBeenCalledWith("intl.consents.revoke", { consentId: "con1" });
    });

    it("revokeScope calls intl.consents.revokeScope", async () => {
      const invoke = mockInvoke({ consent: {} });
      const params = { consentId: "con1", scope: "accounts" as unknown };
      await gateway.internationalConsents.revokeScope(params);
      expect(invoke).toHaveBeenCalledWith("intl.consents.revokeScope", params);
    });

    it("accessLogs calls intl.consents.accessLogs", async () => {
      const invoke = mockInvoke({ accessLogs: [] });
      await gateway.internationalConsents.accessLogs({ consentId: "con1" });
      expect(invoke).toHaveBeenCalledWith("intl.consents.accessLogs", { consentId: "con1" });
    });

    it("summary calls intl.consents.summary", async () => {
      const invoke = mockInvoke({ summary: {} });
      await gateway.internationalConsents.summary();
      expect(invoke).toHaveBeenCalledWith("intl.consents.summary", {});
    });
  });

  // ── intlSca ─────────────────────────────────────────────────────────────────

  describe("intlSca", () => {
    it("getConfig calls intl.sca.config", async () => {
      const invoke = mockInvoke({ config: {} });
      await gateway.intlSca.getConfig();
      expect(invoke).toHaveBeenCalledWith("intl.sca.config", {});
    });

    it("createChallenge calls intl.sca.createChallenge", async () => {
      const invoke = mockInvoke({ challenge: {} });
      const params = { triggerAction: "payment", paymentAmountCents: 50000 };
      await gateway.intlSca.createChallenge(params);
      expect(invoke).toHaveBeenCalledWith("intl.sca.createChallenge", params);
    });

    it("verifyFactor calls intl.sca.verifyFactor", async () => {
      const invoke = mockInvoke({ challenge: {} });
      const params = { challengeId: "ch1", factorType: "totp", credential: "123456" };
      await gateway.intlSca.verifyFactor(params);
      expect(invoke).toHaveBeenCalledWith("intl.sca.verifyFactor", params);
    });

    it("listTrustedDevices calls intl.sca.devices.list", async () => {
      const invoke = mockInvoke({ devices: [] });
      await gateway.intlSca.listTrustedDevices();
      expect(invoke).toHaveBeenCalledWith("intl.sca.devices.list", {});
    });

    it("bindDevice calls intl.sca.devices.bind", async () => {
      const invoke = mockInvoke({ device: {} });
      const params = { deviceName: "iPhone", deviceType: "mobile", platform: "ios" };
      await gateway.intlSca.bindDevice(params);
      expect(invoke).toHaveBeenCalledWith("intl.sca.devices.bind", params);
    });

    it("unbindDevice calls intl.sca.devices.unbind", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.intlSca.unbindDevice("dev1");
      expect(invoke).toHaveBeenCalledWith("intl.sca.devices.unbind", { deviceId: "dev1" });
    });
  });

  // ── ekyc ────────────────────────────────────────────────────────────────────

  describe("ekyc", () => {
    it("listProviders calls intl.ekyc.providers", async () => {
      const invoke = mockInvoke({ providers: [] });
      await gateway.ekyc.listProviders({ countryCode: "BR" });
      expect(invoke).toHaveBeenCalledWith("intl.ekyc.providers", { countryCode: "BR" });
    });

    it("initiate calls intl.ekyc.initiate", async () => {
      const invoke = mockInvoke({ verification: {} });
      const params = { provider: "onfido", countryCode: "BR", documentType: "passport" };
      await gateway.ekyc.initiate(params);
      expect(invoke).toHaveBeenCalledWith("intl.ekyc.initiate", params);
    });

    it("getStatus calls intl.ekyc.status", async () => {
      const invoke = mockInvoke({ verification: {} });
      await gateway.ekyc.getStatus("ver1");
      expect(invoke).toHaveBeenCalledWith("intl.ekyc.status", { verificationId: "ver1" });
    });

    it("startLiveness calls intl.ekyc.liveness.start", async () => {
      const invoke = mockInvoke({ challenge: {} });
      await gateway.ekyc.startLiveness("ver1");
      expect(invoke).toHaveBeenCalledWith("intl.ekyc.liveness.start", { verificationId: "ver1" });
    });

    it("completeLiveness calls intl.ekyc.liveness.complete", async () => {
      const invoke = mockInvoke({ verification: {} });
      const params = { challengeId: "ch1", sessionData: "data123" };
      await gateway.ekyc.completeLiveness(params);
      expect(invoke).toHaveBeenCalledWith("intl.ekyc.liveness.complete", params);
    });

    it("listVerifications calls intl.ekyc.list", async () => {
      const invoke = mockInvoke({ verifications: [] });
      await gateway.ekyc.listVerifications({ status: "pending" });
      expect(invoke).toHaveBeenCalledWith("intl.ekyc.list", { status: "pending" });
    });
  });

  // ── intlPaymentAliases ──────────────────────────────────────────────────────

  describe("intlPaymentAliases", () => {
    it("listAliases calls intl.payments.aliases.list", async () => {
      const invoke = mockInvoke({ aliases: [] });
      await gateway.intlPaymentAliases.listAliases();
      expect(invoke).toHaveBeenCalledWith("intl.payments.aliases.list", {});
    });

    it("createAlias calls intl.payments.aliases.create", async () => {
      const invoke = mockInvoke({ alias: {} });
      const params = {
        aliasType: "vpa" as unknown,
        aliasValue: "user@upi",
        linkedAccountId: "a1",
        network: "upi" as unknown,
      };
      await gateway.intlPaymentAliases.createAlias(params);
      expect(invoke).toHaveBeenCalledWith("intl.payments.aliases.create", params);
    });

    it("deleteAlias calls intl.payments.aliases.delete", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.intlPaymentAliases.deleteAlias("alias1");
      expect(invoke).toHaveBeenCalledWith("intl.payments.aliases.delete", { aliasId: "alias1" });
    });

    it("confirmPayee calls intl.payments.confirmPayee", async () => {
      const invoke = mockInvoke({ confirmation: {} });
      const params = {
        aliasValue: "user@upi",
        aliasType: "vpa" as unknown,
        network: "upi" as unknown,
      };
      await gateway.intlPaymentAliases.confirmPayee(params);
      expect(invoke).toHaveBeenCalledWith("intl.payments.confirmPayee", params);
    });

    it("send calls intl.payments.send", async () => {
      const invoke = mockInvoke({ payment: {} });
      const params = {
        recipientAlias: "user@upi",
        recipientAliasType: "vpa" as unknown,
        amountCents: 5000,
        currencyCode: "INR",
        network: "upi" as unknown,
      };
      await gateway.intlPaymentAliases.send(params);
      expect(invoke).toHaveBeenCalledWith("intl.payments.send", params);
    });

    it("parseQR calls intl.payments.parseQR", async () => {
      const invoke = mockInvoke({ parsed: {} });
      await gateway.intlPaymentAliases.parseQR("qr-data-string");
      expect(invoke).toHaveBeenCalledWith("intl.payments.parseQR", { qrData: "qr-data-string" });
    });

    it("generateQR calls intl.payments.generateQR", async () => {
      const invoke = mockInvoke({ qrDataUrl: "data:image/png;base64,...", rawData: "raw" });
      const params = { aliasId: "alias1", amountCents: 1000 };
      await gateway.intlPaymentAliases.generateQR(params);
      expect(invoke).toHaveBeenCalledWith("intl.payments.generateQR", params);
    });

    it("listPayments calls intl.payments.list", async () => {
      const invoke = mockInvoke({ payments: [] });
      await gateway.intlPaymentAliases.listPayments({ status: "completed" });
      expect(invoke).toHaveBeenCalledWith("intl.payments.list", { status: "completed" });
    });

    it("getLimits calls intl.payments.limits", async () => {
      const invoke = mockInvoke({ limits: {} });
      await gateway.intlPaymentAliases.getLimits();
      expect(invoke).toHaveBeenCalledWith("intl.payments.limits", {});
    });
  });

  // ── openFinance ─────────────────────────────────────────────────────────────

  describe("openFinance", () => {
    it("listConnections calls intl.openFinance.connections.list", async () => {
      const invoke = mockInvoke({ connections: [] });
      await gateway.openFinance.listConnections();
      expect(invoke).toHaveBeenCalledWith("intl.openFinance.connections.list", {});
    });

    it("createConnection calls intl.openFinance.connections.create", async () => {
      const invoke = mockInvoke({
        connectionId: "c1",
        connectUrl: "https://connect",
        expiresAt: "",
      });
      const params = { institutionId: "inst1", countryCode: "GB" };
      await gateway.openFinance.createConnection(params);
      expect(invoke).toHaveBeenCalledWith("intl.openFinance.connections.create", params);
    });

    it("refreshConnection calls intl.openFinance.connections.refresh", async () => {
      const invoke = mockInvoke({ connection: {} });
      await gateway.openFinance.refreshConnection("c1");
      expect(invoke).toHaveBeenCalledWith("intl.openFinance.connections.refresh", {
        connectionId: "c1",
      });
    });

    it("removeConnection calls intl.openFinance.connections.remove", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.openFinance.removeConnection("c1");
      expect(invoke).toHaveBeenCalledWith("intl.openFinance.connections.remove", {
        connectionId: "c1",
      });
    });

    it("listAccounts calls intl.openFinance.accounts.list", async () => {
      const invoke = mockInvoke({ accounts: [] });
      await gateway.openFinance.listAccounts({ connectionId: "c1" });
      expect(invoke).toHaveBeenCalledWith("intl.openFinance.accounts.list", { connectionId: "c1" });
    });

    it("getNetWorth calls intl.openFinance.netWorth", async () => {
      const invoke = mockInvoke({ netWorth: {} });
      await gateway.openFinance.getNetWorth();
      expect(invoke).toHaveBeenCalledWith("intl.openFinance.netWorth", {});
    });

    it("getAlternativeCreditData calls intl.openFinance.alternativeCredit", async () => {
      const invoke = mockInvoke({ creditData: {} });
      await gateway.openFinance.getAlternativeCreditData();
      expect(invoke).toHaveBeenCalledWith("intl.openFinance.alternativeCredit", {});
    });
  });
});
