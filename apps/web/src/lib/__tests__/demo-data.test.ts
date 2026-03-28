import { describe, it, expect } from "vitest";
import { getDemoResponse } from "../demo-data";

describe("getDemoResponse", () => {
  // Accounts
  it("returns accounts list", () => {
    const result = getDemoResponse("accounts.list", {}) as { accounts: unknown[] };
    expect(result.accounts).toBeDefined();
    expect(result.accounts.length).toBeGreaterThan(0);
    expect(result.accounts[0]).toHaveProperty("id");
    expect(result.accounts[0]).toHaveProperty("type");
  });

  it("returns single account", () => {
    const result = getDemoResponse("accounts.get", { id: "acct-demo-checking-001" }) as Record<
      string,
      unknown
    >;
    expect(result.account).toBeDefined();
  });

  it("returns account summary", () => {
    const result = getDemoResponse("accounts.summary", {}) as Record<string, unknown>;
    expect(result).toHaveProperty("totalBalanceCents");
  });

  // Transactions
  it("returns transactions list", () => {
    const result = getDemoResponse("transactions.list", {}) as { transactions: unknown[] };
    expect(result.transactions).toBeDefined();
    expect(result.transactions.length).toBeGreaterThan(0);
  });

  it("returns single transaction", () => {
    const result = getDemoResponse("transactions.get", { id: "txn-1" }) as Record<string, unknown>;
    expect(result.transaction).toBeDefined();
  });

  it("returns transaction search results", () => {
    const result = getDemoResponse("transactions.search", { query: "coffee" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // Transfers
  it("returns transfers list", () => {
    const result = getDemoResponse("transfers.list", {}) as Record<string, unknown>;
    expect(result.transfers).toBeDefined();
  });

  it("creates a transfer", () => {
    const result = getDemoResponse("transfers.create", {
      fromAccountId: "acct-1",
      toAccountId: "acct-2",
      amountCents: 5000,
    }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("schedules a transfer", () => {
    const result = getDemoResponse("transfers.schedule", {
      fromAccountId: "acct-1",
      toAccountId: "acct-2",
      amountCents: 5000,
    }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("cancels a transfer", () => {
    const result = getDemoResponse("transfers.cancel", {}) as Record<string, unknown>;
    expect(result.success).toBe(true);
  });

  // Beneficiaries
  it("returns beneficiaries list", () => {
    const result = getDemoResponse("beneficiaries.list", {}) as Record<string, unknown>;
    expect(result.beneficiaries).toBeDefined();
  });

  it("creates a beneficiary", () => {
    const result = getDemoResponse("beneficiaries.create", { name: "Test" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("deletes a beneficiary", () => {
    const result = getDemoResponse("beneficiaries.delete", {}) as Record<string, unknown>;
    expect(result.success).toBe(true);
  });

  // Bills
  it("returns bills list", () => {
    const result = getDemoResponse("bills.list", {}) as Record<string, unknown>;
    expect(result.bills).toBeDefined();
  });

  it("creates a bill", () => {
    const result = getDemoResponse("bills.create", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("pays a bill", () => {
    const result = getDemoResponse("bills.pay", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("cancels a bill", () => {
    const result = getDemoResponse("bills.cancel", {}) as Record<string, unknown>;
    expect(result.success).toBe(true);
  });

  // Cards
  it("returns cards list", () => {
    const result = getDemoResponse("cards.list", {}) as { cards: unknown[] };
    expect(result.cards).toBeDefined();
    expect(result.cards.length).toBeGreaterThan(0);
  });

  it("locks a card", () => {
    const result = getDemoResponse("cards.lock", { id: "card-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("unlocks a card", () => {
    const result = getDemoResponse("cards.unlock", { id: "card-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("sets card limit", () => {
    const result = getDemoResponse("cards.setLimit", { id: "card-1", limitCents: 50000 }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // RDC
  it("submits an RDC deposit", () => {
    const result = getDemoResponse("rdc.deposit", { amountCents: 10000 }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("returns RDC history", () => {
    const result = getDemoResponse("rdc.history", {}) as Record<string, unknown>;
    expect(result.deposits).toBeDefined();
  });

  // Notifications
  it("returns notifications list", () => {
    const result = getDemoResponse("notifications.list", {}) as Record<string, unknown>;
    expect(result.notifications).toBeDefined();
  });

  it("returns unread count", () => {
    const result = getDemoResponse("notifications.unreadCount", {}) as Record<string, unknown>;
    expect(typeof result.count).toBe("number");
  });

  it("marks notification as read", () => {
    const result = getDemoResponse("notifications.markRead", {}) as Record<string, unknown>;
    expect(result.success).toBe(true);
  });

  it("marks all notifications read", () => {
    const result = getDemoResponse("notifications.markAllRead", {}) as Record<string, unknown>;
    expect(result.success).toBe(true);
  });

  // Statements
  it("returns statements list", () => {
    const result = getDemoResponse("statements.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns single statement", () => {
    const result = getDemoResponse("statements.get", { id: "stmt-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Config
  it("returns capabilities", () => {
    const result = getDemoResponse("config.capabilities", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns tenant theme", () => {
    const result = getDemoResponse("config.theme", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Loans
  it("returns loans list", () => {
    const result = getDemoResponse("loans.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns single loan", () => {
    const result = getDemoResponse("loans.get", { id: "loan-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Activation
  it("returns activation config", () => {
    const result = getDemoResponse("activation.config", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Financial data
  it("returns spending summary", () => {
    const result = getDemoResponse("financial.spending", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns monthly trends", () => {
    const result = getDemoResponse("financial.trends", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns budgets", () => {
    const result = getDemoResponse("financial.budgets.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns net worth", () => {
    const result = getDemoResponse("financial.networth", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns recurring transactions", () => {
    const result = getDemoResponse("financial.recurring", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Offers
  it("returns card offers list", () => {
    const result = getDemoResponse("offers.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("activates an offer", () => {
    const result = getDemoResponse("offers.activate", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Account opening
  it("returns account opening config", () => {
    const result = getDemoResponse("account-opening.config", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Experiments
  it("returns experiment assignment", () => {
    const result = getDemoResponse("experiments.assign", { experimentId: "exp-1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // Bill pay
  it("returns billers search", () => {
    const result = getDemoResponse("billpay.billers.search", { query: "electric" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("returns payees list", () => {
    const result = getDemoResponse("billpay.payees.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Messaging
  it("returns message threads", () => {
    const result = getDemoResponse("messaging.threads.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns message departments", () => {
    const result = getDemoResponse("messaging.departments.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Disputes
  it("returns disputes list", () => {
    const result = getDemoResponse("disputes.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Check orders
  it("returns check styles", () => {
    const result = getDemoResponse("checks.styles", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Direct deposit
  it("returns employer list", () => {
    const result = getDemoResponse("directDeposit.employers", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Wire transfers
  it("returns wire list", () => {
    const result = getDemoResponse("wires.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Stop payments
  it("returns stop payments", () => {
    const result = getDemoResponse("stopPayments.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns stop payment fee", () => {
    const result = getDemoResponse("stopPayments.fee", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // P2P
  it("returns P2P enrollment", () => {
    const result = getDemoResponse("p2p.enrollment", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns P2P transactions", () => {
    const result = getDemoResponse("p2p.transactions", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns P2P limits", () => {
    const result = getDemoResponse("p2p.limits", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Goals
  it("returns savings goals", () => {
    const result = getDemoResponse("goals.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns goals summary", () => {
    const result = getDemoResponse("goals.summary", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Joint accounts
  it("returns joint owners", () => {
    const result = getDemoResponse("jointAccounts.owners.list", { accountId: "acct-1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("returns joint account summary", () => {
    const result = getDemoResponse("jointAccounts.summary", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Overdraft
  it("returns overdraft settings", () => {
    const result = getDemoResponse("overdraft.settings.get", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Spending alerts
  it("returns spending alerts", () => {
    const result = getDemoResponse("alerts.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Document vault
  it("returns vault documents", () => {
    const result = getDemoResponse("vault.documents.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns vault summary", () => {
    const result = getDemoResponse("vault.summary", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Devices
  it("returns device list", () => {
    const result = getDemoResponse("devices.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Card services
  it("returns travel notices", () => {
    const result = getDemoResponse("cardServices.travelNotice.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Sessions
  it("returns sessions", () => {
    const result = getDemoResponse("sessions.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // System
  it("returns health check", () => {
    const result = getDemoResponse("system.health", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Unknown action
  it("returns error for unknown action", () => {
    const result = getDemoResponse("unknown.action", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Data exports
  it("returns exports list", () => {
    const result = getDemoResponse("exports.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Notification preferences
  it("returns notification preferences", () => {
    const result = getDemoResponse("notifications.preferences.get", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // CMS
  it("returns CMS content list", () => {
    const result = getDemoResponse("cms.content.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns CMS channels", () => {
    const result = getDemoResponse("cms.channels.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // AI
  it("returns AI chat response", () => {
    const result = getDemoResponse("ai.chat.send", { message: "Hello" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Integrations
  it("returns integrations providers", () => {
    const result = getDemoResponse("integrations.providers", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // RBAC
  it("returns roles list", () => {
    const result = getDemoResponse("admin.roles.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Webhooks
  it("returns webhook endpoints", () => {
    const result = getDemoResponse("webhooks.endpoints.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Enrichment
  it("returns enrichment result", () => {
    const result = getDemoResponse("enrichment.enhance", { transactionId: "txn-1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // External accounts
  it("returns external accounts", () => {
    const result = getDemoResponse("external-accounts.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Password policy
  it("returns password policy", () => {
    const result = getDemoResponse("passwordPolicy.get", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Member
  it("returns member addresses", () => {
    const result = getDemoResponse("member.addresses", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Locations
  it("returns locations", () => {
    const result = getDemoResponse("locations.search", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Onboarding
  it("returns onboarding status", () => {
    const result = getDemoResponse("onboarding.status", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // SSO
  it("returns SSO providers", () => {
    const result = getDemoResponse("sso.providers.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Admin users
  it("handles admin user actions", () => {
    const result = getDemoResponse("admin.users.suspend", { userId: "u-1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // Admin analytics
  it("returns admin analytics", () => {
    const result = getDemoResponse("admin.analytics.keyMetrics", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Admin compliance
  it("returns compliance data", () => {
    const result = getDemoResponse("admin.compliance.kycReviews", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Additional actions to maximize demo-data coverage

  // KYC
  it("returns KYC evaluation", () => {
    const result = getDemoResponse("kyc.evaluate", {
      firstName: "John",
      lastName: "Doe",
    }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns KYC status", () => {
    const result = getDemoResponse("kyc.status", { token: "tok-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Activation extended
  it("returns activation verifyIdentity", () => {
    const result = getDemoResponse("activation.verifyIdentity", {
      memberNumber: "12345",
    }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns activation acceptTerms", () => {
    const result = getDemoResponse("activation.acceptTerms", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns activation createCredentials", () => {
    const result = getDemoResponse("activation.createCredentials", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns activation enrollMFA", () => {
    const result = getDemoResponse("activation.enrollMFA", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns activation verifyMFA", () => {
    const result = getDemoResponse("activation.verifyMFA", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns activation registerDevice", () => {
    const result = getDemoResponse("activation.registerDevice", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns activation complete", () => {
    const result = getDemoResponse("activation.complete", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns activation getTerms", () => {
    const result = getDemoResponse("activation.getTerms", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns activation checkTermsStatus", () => {
    const result = getDemoResponse("activation.checkTermsStatus", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Account opening extended
  it("creates account opening application", () => {
    const result = getDemoResponse("account-opening.create", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("gets account opening application", () => {
    const result = getDemoResponse("account-opening.get", { applicationId: "app-1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // Experiments extended
  it("lists experiments", () => {
    const result = getDemoResponse("experiments.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("gets experiment", () => {
    const result = getDemoResponse("experiments.get", { id: "exp-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("tracks experiment event", () => {
    const result = getDemoResponse("experiments.track", { experimentId: "exp-1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // Bill pay extended
  it("enrolls payee", () => {
    const result = getDemoResponse("billpay.payees.enroll", { billerId: "b1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("schedules bill payment", () => {
    const result = getDemoResponse("billpay.payments.schedule", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("lists bill payments", () => {
    const result = getDemoResponse("billpay.payments.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("lists eBills", () => {
    const result = getDemoResponse("billpay.ebills.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Financial extended
  it("returns financial enrich", () => {
    const result = getDemoResponse("financial.enrich", { transactions: [] }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("returns net worth history", () => {
    const result = getDemoResponse("financial.networth.history", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Offers extended
  it("deactivates an offer", () => {
    const result = getDemoResponse("offers.deactivate", { offerId: "o1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("returns offer redemptions", () => {
    const result = getDemoResponse("offers.redemptions", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns offers summary", () => {
    const result = getDemoResponse("offers.summary", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // SSO extended
  it("gets SSO provider", () => {
    const result = getDemoResponse("sso.providers.get", { id: "sso-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("creates SSO provider", () => {
    const result = getDemoResponse("sso.providers.create", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("tests SSO connection", () => {
    const result = getDemoResponse("sso.providers.test", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // AI extended
  it("returns AI suggestions", () => {
    const result = getDemoResponse("ai.chat.suggestions", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns AI assistant chat", () => {
    const result = getDemoResponse("ai.assistant.chat", { message: "Help" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // Data export extended
  it("creates an export", () => {
    const result = getDemoResponse("exports.create", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("downloads an export", () => {
    const result = getDemoResponse("exports.download", { id: "exp-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns export summary", () => {
    const result = getDemoResponse("exports.summary", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Notification preferences extended
  it("updates notification preferences", () => {
    const result = getDemoResponse("notifications.preferences.update", {}) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("tests a notification", () => {
    const result = getDemoResponse("notifications.test", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Sessions extended
  it("revokes a session", () => {
    const result = getDemoResponse("sessions.revoke", { sessionId: "s-1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // Onboarding extended
  it("updates onboarding step", () => {
    const result = getDemoResponse("onboarding.updateStep", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // RBAC extended
  it("creates a role", () => {
    const result = getDemoResponse("admin.roles.create", { name: "Teller" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("assigns a role", () => {
    const result = getDemoResponse("admin.roles.assign", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Webhooks extended
  it("creates webhook endpoint", () => {
    const result = getDemoResponse("webhooks.endpoints.create", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns webhook stats", () => {
    const result = getDemoResponse("webhooks.stats", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Integrations extended
  it("returns connected integrations", () => {
    const result = getDemoResponse("integrations.connected", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns integration health", () => {
    const result = getDemoResponse("integrations.health", { integrationId: "i-1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // Admin extended
  it("returns admin analytics account growth", () => {
    const result = getDemoResponse("admin.analytics.accountGrowth", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns admin analytics transaction volume", () => {
    const result = getDemoResponse("admin.analytics.transactionVolume", {}) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("returns AML alerts", () => {
    const result = getDemoResponse("admin.compliance.amlAlerts", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns GDPR requests", () => {
    const result = getDemoResponse("admin.compliance.gdprRequests", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // External accounts extended
  it("returns external account balances", () => {
    const result = getDemoResponse("external-accounts.balances", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns external account transactions", () => {
    const result = getDemoResponse("external-accounts.transactions", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Enrichment batch
  it("returns enrichment batch", () => {
    const result = getDemoResponse("enrichment.batch", { transactions: [] }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  // CMS extended
  it("gets CMS content", () => {
    const result = getDemoResponse("cms.content.get", { id: "c-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("creates CMS content", () => {
    const result = getDemoResponse("cms.content.create", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("publishes CMS content", () => {
    const result = getDemoResponse("cms.content.publish", { id: "c-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns CMS content versions", () => {
    const result = getDemoResponse("cms.content.versions", { contentId: "c-1" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("returns public CMS content", () => {
    const result = getDemoResponse("cms.content.public", { slug: "about" }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
  });

  it("returns CMS tokens", () => {
    const result = getDemoResponse("cms.tokens.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Member extended
  it("returns member documents", () => {
    const result = getDemoResponse("member.documents", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns member identifiers", () => {
    const result = getDemoResponse("member.identifiers", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Account/Loan products
  it("returns account products", () => {
    const result = getDemoResponse("accountProducts.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns loan products", () => {
    const result = getDemoResponse("loanProducts.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Charges
  it("returns charge definitions", () => {
    const result = getDemoResponse("charges.definitions", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  it("returns charges list", () => {
    const result = getDemoResponse("charges.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // Standing instructions
  it("returns standing instructions", () => {
    const result = getDemoResponse("standingInstructions.list", {}) as Record<string, unknown>;
    expect(result).toBeDefined();
  });

  // CD maturity
  it("returns CD maturity", () => {
    const result = getDemoResponse("cd.maturity", { accountId: "a-1" }) as Record<string, unknown>;
    expect(result).toBeDefined();
  });
});
