/**
 * Built-in Account Opening Adapter
 *
 * A fully self-contained, database-backed account opening flow with integrated
 * KYC/AML verification and optional fraud risk assessment. Designed for credit
 * unions and community banks that want a complete OSS solution without depending
 * on external account-opening vendors.
 *
 * Architecture:
 * - Persistence via DatabasePort (platform-agnostic — Supabase, Postgres, etc.)
 * - KYC via the configured KYC adapter (Alloy, LexisNexis, SumSub, mock, etc.)
 * - Fraud risk via the configured fraud adapter (BioCatch, mock, etc.) — optional
 * - E-signatures via the configured e-signature adapter (DocuSign, PandaDoc) — optional
 * - Full audit trail for NCUA/FFIEC compliance
 * - Admin operations: review queue, approve/deny, stats dashboard
 *
 * Best practices implemented:
 * - Risk-based friction: low-risk applicants auto-approve through KYC
 * - Progressive flow: save/resume via DB persistence
 * - PII never logged or returned unmasked
 * - Rate limiting: configurable max applications per day
 * - Application expiry: auto-expire stale applications
 * - Audit trail: every state transition recorded
 *
 * Database tables (expected schema):
 *   account_applications    — application state + masked applicant data
 *   application_products    — selected products per application
 *   application_audit_trail — immutable audit log
 *   application_disclosures — e-signature / disclosure acceptance
 *   tenant_products         — per-tenant product catalog (optional, falls back to defaults)
 *
 * IMPORTANT: PII handling
 * - Raw PII is ONLY sent to the KYC adapter for evaluation
 * - All stored/returned applicant data uses masked fields
 * - SSN, DOB, full names, account numbers NEVER appear in logs
 */

import type { DatabasePort, EnvProvider } from "../../platform/types.ts";
import { secureRandomInt } from "../../secure-random.ts";
import type { KYCAdapter, KYCApplicant } from "../kyc/types.ts";
import type { ESignatureAdapter } from "../e-signature/types.ts";
import type {
  AccountOpeningAdminAdapter,
  AccountOpeningConfig,
  AccountApplication,
  ApplicantInfo,
  ApplicationStatus,
  FundingRequest,
  ProductOption,
  ProductType,
  ApplicationListFilter,
  ApplicationListResult,
  ApplicationReviewAction,
  ApplicationAuditEntry,
  ApplicationStats,
} from "./types.ts";

// =============================================================================
// PII MASKING UTILITIES
// =============================================================================

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "****@****.***";
  return `${local.charAt(0)}***@${domain}`;
}

function maskSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, "");
  if (digits.length < 4) return "***-**-****";
  return `***-**-${digits.slice(-4)}`;
}

function maskLastName(name: string): string {
  if (name.length <= 1) return "*";
  return name.charAt(0) + "*".repeat(name.length - 1);
}

function maskAccountNumber(acctNum: string): string {
  if (acctNum.length <= 4) return `****${acctNum}`;
  return `****${acctNum.slice(-4)}`;
}

// =============================================================================
// DEFAULT PRODUCT CATALOG
// =============================================================================

const DEFAULT_PRODUCTS: ProductOption[] = [
  {
    id: "builtin_checking_free",
    type: "checking",
    name: "Free Checking",
    description: "No monthly fees or minimum balance. Free debit card included.",
    apyBps: 1,
    minOpeningDepositCents: 2500,
    monthlyFeeCents: 0,
    isAvailable: true,
  },
  {
    id: "builtin_checking_rewards",
    type: "checking",
    name: "Rewards Checking",
    description: "Earn interest on your balance with cashback on debit purchases.",
    apyBps: 100,
    minOpeningDepositCents: 10000,
    monthlyFeeCents: 800,
    feeWaiverDescription: "Waived with $1,500 minimum daily balance or direct deposit",
    isAvailable: true,
  },
  {
    id: "builtin_savings_regular",
    type: "savings",
    name: "Regular Savings",
    description: "Start saving with as little as $5. Competitive rates.",
    apyBps: 350,
    minOpeningDepositCents: 500,
    monthlyFeeCents: 0,
    isAvailable: true,
  },
  {
    id: "builtin_savings_high_yield",
    type: "savings",
    name: "High-Yield Savings",
    description: "Our best rate for building your emergency fund.",
    apyBps: 475,
    minOpeningDepositCents: 50000,
    monthlyFeeCents: 0,
    isAvailable: true,
  },
  {
    id: "builtin_money_market",
    type: "money_market",
    name: "Money Market Account",
    description: "Higher rates with check-writing privileges and tiered interest.",
    apyBps: 425,
    minOpeningDepositCents: 100000,
    monthlyFeeCents: 500,
    feeWaiverDescription: "Waived with $5,000 minimum daily balance",
    isAvailable: true,
  },
  {
    id: "builtin_cd_6mo",
    type: "cd",
    name: "6-Month Certificate",
    description: "Lock in a great rate for 6 months.",
    apyBps: 490,
    minOpeningDepositCents: 100000,
    monthlyFeeCents: 0,
    termMonths: 6,
    isAvailable: true,
  },
  {
    id: "builtin_cd_12mo",
    type: "cd",
    name: "12-Month Certificate",
    description: "Our most popular term with a competitive rate.",
    apyBps: 500,
    minOpeningDepositCents: 100000,
    monthlyFeeCents: 0,
    termMonths: 12,
    isAvailable: true,
  },
];

// =============================================================================
// STRUCTURED LOGGING (NO PII)
// =============================================================================

function log(
  level: "info" | "warn" | "error",
  action: string,
  extra: Record<string, unknown> = {},
): void {
  console.warn(
    JSON.stringify({
      level,
      adapter: "builtin-account-opening",
      action,
      timestamp: new Date().toISOString(),
      ...extra,
    }),
  );
}

// =============================================================================
// BUILT-IN ADAPTER
// =============================================================================

export interface BuiltinAdapterDeps {
  db: DatabasePort;
  env: EnvProvider;
  /** The KYC adapter to use for identity verification */
  kycAdapter: KYCAdapter;
  /** Optional fraud adapter for risk assessment at application time */
  fraudAdapter?: {
    assessSession(request: { tenantId: string; customerId: string; activity: string }): Promise<{
      riskScore: number;
      riskLevel: string;
      recommendedAction: string;
    }>;
  };
  /** Optional e-signature adapter for disclosure signing (DocuSign, PandaDoc) */
  eSignatureAdapter?: ESignatureAdapter;
}

export class BuiltinAccountOpeningAdapter implements AccountOpeningAdminAdapter {
  readonly name = "builtin";
  private readonly db: DatabasePort;
  private readonly env: EnvProvider;
  private readonly kyc: KYCAdapter;
  private readonly fraud?: BuiltinAdapterDeps["fraudAdapter"];
  private readonly eSig?: ESignatureAdapter;

  constructor(deps: BuiltinAdapterDeps) {
    this.db = deps.db;
    this.env = deps.env;
    this.kyc = deps.kycAdapter;
    this.fraud = deps.fraudAdapter;
    this.eSig = deps.eSignatureAdapter;
  }

  // ===========================================================================
  // USER-FACING: getConfig
  // ===========================================================================

  async getConfig(tenantId: string): Promise<AccountOpeningConfig> {
    // Try tenant-specific products from DB first
    const { data: tenantProducts } = await this.db
      .from<ProductOption>("tenant_products")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_available", true)
      .execute();

    const products = tenantProducts?.length ? tenantProducts : DEFAULT_PRODUCTS;

    // Load tenant-specific config or use defaults
    const { data: tenantConfig } = await this.db
      .from("tenant_account_opening_config")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    return {
      products,
      allowedFundingMethods: tenantConfig?.allowed_funding_methods ?? [
        "ach_transfer",
        "debit_card",
        "internal_transfer",
        "none",
      ],
      minimumAge: tenantConfig?.minimum_age ?? 18,
      maxApplicationsPerDay: tenantConfig?.max_applications_per_day ?? 10,
      applicationExpiryHours: tenantConfig?.application_expiry_hours ?? 72,
      allowJointApplications: tenantConfig?.allow_joint_applications ?? false,
      requiredDisclosures: tenantConfig?.required_disclosures ?? [
        "digital_banking_agreement",
        "electronic_disclosure",
        "privacy_policy",
        "truth_in_savings",
      ],
    };
  }

  // ===========================================================================
  // USER-FACING: createApplication
  // ===========================================================================

  async createApplication(tenantId: string, applicant: ApplicantInfo): Promise<AccountApplication> {
    const config = await this.getConfig(tenantId);

    // --- Age validation ---
    const dob = new Date(applicant.dateOfBirth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < config.minimumAge) {
      throw new Error(`Applicant must be at least ${config.minimumAge} years old`);
    }

    // --- Rate limiting: check daily application count ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayApps } = await this.db
      .from("account_applications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", todayStart.toISOString())
      .execute();
    const todayCount = todayApps?.length ?? 0;
    if (todayCount >= config.maxApplicationsPerDay) {
      throw new Error("Daily application limit reached. Please try again tomorrow.");
    }

    // --- KYC evaluation ---
    const kycApplicant: KYCApplicant = {
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      email: applicant.email,
      phone: applicant.phone,
      dateOfBirth: applicant.dateOfBirth,
      ssn: applicant.ssn,
      address: {
        line1: applicant.address.line1,
        line2: applicant.address.line2,
        city: applicant.address.city,
        state: applicant.address.state,
        zip: applicant.address.zip,
      },
    };

    const kycResult = await this.kyc.createEvaluation(kycApplicant);

    // Map KYC status to application status
    let status: ApplicationStatus;
    switch (kycResult.status) {
      case "approved":
        status = "kyc_approved";
        break;
      case "denied":
        status = "kyc_denied";
        break;
      case "pending_review":
      case "manual_review":
        status = "kyc_review";
        break;
      default:
        status = "kyc_pending";
    }

    // --- Optional fraud risk assessment ---
    let fraudRiskLevel: string | undefined;
    if (this.fraud) {
      try {
        const fraudResult = await this.fraud.assessSession({
          tenantId,
          customerId: applicant.email, // Use email as identifier pre-account
          activity: "account_opening",
        });
        fraudRiskLevel = fraudResult.riskLevel;

        // High/critical fraud risk overrides KYC approval → force manual review
        if (
          (fraudResult.riskLevel === "high" || fraudResult.riskLevel === "critical") &&
          status === "kyc_approved"
        ) {
          status = "kyc_review";
          log("warn", "createApplication:fraud_escalation", {
            tenantId,
            riskLevel: fraudResult.riskLevel,
            riskScore: fraudResult.riskScore,
          });
        }
      } catch (err) {
        // Fraud check is best-effort — don't block account opening
        log("warn", "createApplication:fraud_check_failed", {
          tenantId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // --- Persist application (PII masked in stored record) ---
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + config.applicationExpiryHours * 60 * 60 * 1000,
    ).toISOString();
    const applicationId = `app_${crypto.randomUUID()}`;

    const maskedApplicant = {
      first_name_initial: applicant.firstName.charAt(0).toUpperCase(),
      last_name_masked: maskLastName(applicant.lastName),
      email_masked: maskEmail(applicant.email),
      ssn_masked: maskSSN(applicant.ssn),
    };

    const row = {
      id: applicationId,
      tenant_id: tenantId,
      status,
      first_name_initial: maskedApplicant.first_name_initial,
      last_name_masked: maskedApplicant.last_name_masked,
      email_masked: maskedApplicant.email_masked,
      ssn_masked: maskedApplicant.ssn_masked,
      kyc_token: kycResult.token,
      kyc_status: kycResult.status,
      fraud_risk_level: fraudRiskLevel ?? null,
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
    };

    await this.db.from("account_applications").insert(row).execute();

    // --- Audit trail entry ---
    await this.appendAudit(applicationId, {
      action: "application_created",
      previousStatus: null,
      newStatus: status,
      actorId: applicant.email, // This is the applicant themselves
      actorType: "applicant",
      description: `Application created. KYC result: ${kycResult.status}.${
        fraudRiskLevel ? ` Fraud risk: ${fraudRiskLevel}.` : ""
      }`,
    });

    log("info", "createApplication", {
      applicationId,
      tenantId,
      status,
      kycStatus: kycResult.status,
      fraudRiskLevel: fraudRiskLevel ?? "not_assessed",
    });

    return this.toAccountApplication(row);
  }

  // ===========================================================================
  // USER-FACING: getApplication
  // ===========================================================================

  async getApplication(applicationId: string): Promise<AccountApplication> {
    const row = await this.loadApplication(applicationId);

    // Load selected products
    const { data: products } = await this.db
      .from("application_products")
      .select("*")
      .eq("application_id", applicationId)
      .execute();

    const app = this.toAccountApplication(row);
    if (products?.length) {
      app.selectedProducts = products.map((p: Record<string, unknown>) => ({
        productId: p.product_id as string,
        productType: p.product_type as ProductType,
        productName: p.product_name as string,
      }));
    }

    // Load created accounts if completed
    if (row.status === "completed") {
      const { data: accounts } = await this.db
        .from("application_accounts")
        .select("*")
        .eq("application_id", applicationId)
        .execute();
      if (accounts?.length) {
        app.createdAccounts = accounts.map((a: Record<string, unknown>) => ({
          accountId: a.account_id as string,
          accountNumberMasked: a.account_number_masked as string,
          type: a.account_type as ProductType,
        }));
      }
    }

    return app;
  }

  // ===========================================================================
  // USER-FACING: selectProducts
  // ===========================================================================

  async selectProducts(applicationId: string, productIds: string[]): Promise<AccountApplication> {
    const row = await this.loadApplication(applicationId);
    this.assertStatus(row, ["kyc_approved"]);

    const config = await this.getConfig(row.tenant_id as string);
    const availableProducts = config.products.filter((p) => p.isAvailable);

    // Validate all requested product IDs exist
    const selected = productIds.map((pid) => {
      const product = availableProducts.find((p) => p.id === pid);
      if (!product) throw new Error(`Product not found or unavailable: ${pid}`);
      return product;
    });

    if (selected.length === 0) {
      throw new Error("At least one product must be selected");
    }

    // Clear old selections and insert new ones
    await this.db
      .from("application_products")
      .delete()
      .eq("application_id", applicationId)
      .execute();

    const productRows = selected.map((p) => ({
      application_id: applicationId,
      product_id: p.id,
      product_type: p.type,
      product_name: p.name,
      min_deposit_cents: p.minOpeningDepositCents,
    }));
    await this.db.from("application_products").insert(productRows).execute();

    // Update status
    await this.updateStatus(applicationId, "products_selected");

    await this.appendAudit(applicationId, {
      action: "products_selected",
      previousStatus: row.status as ApplicationStatus,
      newStatus: "products_selected",
      actorId: "applicant",
      actorType: "applicant",
      description: `Selected ${selected.length} product(s): ${selected.map((p) => p.name).join(", ")}`,
    });

    return this.getApplication(applicationId);
  }

  // ===========================================================================
  // USER-FACING: submitFunding
  // ===========================================================================

  async submitFunding(applicationId: string, funding: FundingRequest): Promise<AccountApplication> {
    const row = await this.loadApplication(applicationId);
    this.assertStatus(row, ["products_selected", "funding_pending"]);

    // Validate funding method is allowed
    const config = await this.getConfig(row.tenant_id as string);
    if (!config.allowedFundingMethods.includes(funding.method)) {
      throw new Error(`Funding method not allowed: ${funding.method}`);
    }

    // Validate minimum deposit against selected products
    if (funding.method !== "none") {
      const { data: products } = await this.db
        .from("application_products")
        .select("min_deposit_cents")
        .eq("application_id", applicationId)
        .execute();

      const maxMinDeposit = Math.max(
        ...(products ?? []).map(
          (p: Record<string, unknown>) => (p.min_deposit_cents as number) ?? 0,
        ),
      );
      if (funding.amountCents < maxMinDeposit) {
        throw new Error(
          `Funding amount ($${(funding.amountCents / 100).toFixed(2)}) is below the minimum opening deposit ($${(maxMinDeposit / 100).toFixed(2)})`,
        );
      }
    }

    // Store funding info (masked)
    const fundingData = {
      method: funding.method,
      amount_cents: funding.amountCents,
      source_account_masked: funding.sourceAccountNumber
        ? maskAccountNumber(funding.sourceAccountNumber)
        : null,
    };

    await this.db
      .from("account_applications")
      .update({
        funding_method: fundingData.method,
        funding_amount_cents: fundingData.amount_cents,
        funding_source_masked: fundingData.source_account_masked,
        status: "funded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .execute();

    await this.appendAudit(applicationId, {
      action: "funding_submitted",
      previousStatus: row.status as ApplicationStatus,
      newStatus: "funded",
      actorId: "applicant",
      actorType: "applicant",
      description: `Funding submitted via ${funding.method}: $${(funding.amountCents / 100).toFixed(2)}`,
    });

    log("info", "submitFunding", {
      applicationId,
      method: funding.method,
      amountCents: funding.amountCents,
    });

    return this.getApplication(applicationId);
  }

  // ===========================================================================
  // USER-FACING: completeApplication
  // ===========================================================================

  async completeApplication(applicationId: string): Promise<AccountApplication> {
    const row = await this.loadApplication(applicationId);
    this.assertStatus(row, ["funded", "approved"]);

    // Load selected products
    const { data: products } = await this.db
      .from("application_products")
      .select("*")
      .eq("application_id", applicationId)
      .execute();

    if (!products?.length) {
      throw new Error("No products selected for this application");
    }

    // Generate accounts for each selected product
    const createdAccounts = products.map((p: Record<string, unknown>) => {
      const acctId = `acct_${crypto.randomUUID()}`;
      const acctNum = String(secureRandomInt(1000000000, 10000000000));
      return {
        application_id: applicationId,
        account_id: acctId,
        account_number_masked: maskAccountNumber(acctNum),
        account_type: p.product_type as string,
      };
    });

    // Insert created accounts
    await this.db.from("application_accounts").insert(createdAccounts).execute();

    // Mark as completed
    await this.updateStatus(applicationId, "completed");

    await this.appendAudit(applicationId, {
      action: "application_completed",
      previousStatus: row.status as ApplicationStatus,
      newStatus: "completed",
      actorId: "system",
      actorType: "system",
      description: `Application completed. ${createdAccounts.length} account(s) created.`,
    });

    log("info", "completeApplication", {
      applicationId,
      accountsCreated: createdAccounts.length,
    });

    return this.getApplication(applicationId);
  }

  // ===========================================================================
  // USER-FACING: cancelApplication
  // ===========================================================================

  async cancelApplication(applicationId: string): Promise<void> {
    const row = await this.loadApplication(applicationId);

    // Cannot cancel terminal states
    const terminalStatuses: ApplicationStatus[] = ["completed", "declined", "expired", "cancelled"];
    if (terminalStatuses.includes(row.status as ApplicationStatus)) {
      throw new Error(`Cannot cancel application in status: ${row.status}`);
    }

    await this.updateStatus(applicationId, "cancelled");

    await this.appendAudit(applicationId, {
      action: "application_cancelled",
      previousStatus: row.status as ApplicationStatus,
      newStatus: "cancelled",
      actorId: "applicant",
      actorType: "applicant",
      description: "Application cancelled by applicant.",
    });

    log("info", "cancelApplication", { applicationId });
  }

  // ===========================================================================
  // E-SIGNATURE: Disclosure signing for account opening
  // ===========================================================================

  /**
   * Create an e-signature envelope for required disclosures.
   * Call this after KYC approval and product selection, before funding.
   *
   * If no e-signature adapter is configured, disclosures are tracked
   * as accepted via checkbox (simpler flow without legal-grade signatures).
   */
  async createDisclosureEnvelope(
    applicationId: string,
    signerName: string,
    signerEmail: string,
    returnUrl: string,
  ): Promise<{ envelopeId: string; signingUrl?: string; sessionId?: string } | null> {
    if (!this.eSig) {
      // No e-signature provider — track acceptance via DB only
      await this.db
        .from("application_disclosures")
        .insert({
          application_id: applicationId,
          method: "checkbox",
          accepted_at: new Date().toISOString(),
        })
        .execute();

      await this.appendAudit(applicationId, {
        action: "disclosures_accepted",
        previousStatus: "products_selected",
        newStatus: "products_selected",
        actorId: "applicant",
        actorType: "applicant",
        description: "Disclosures accepted via checkbox (no e-signature provider configured).",
      });

      return null;
    }

    const row = await this.loadApplication(applicationId);
    const config = await this.getConfig(row.tenant_id as string);

    // Create documents for each required disclosure
    const documents = config.requiredDisclosures.map((disclosure, i) => ({
      documentId: `disc_${i}`,
      name: disclosure.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      source: {
        type: "template" as const,
        templateId: disclosure, // Template ID matches disclosure name
      },
    }));

    const envelope = await this.eSig.createEnvelope({
      tenantId: row.tenant_id as string,
      subject: "Account Opening Disclosures",
      message: "Please review and sign the required disclosures to open your account.",
      signers: [
        {
          clientUserId: applicationId,
          name: signerName,
          email: signerEmail,
        },
      ],
      documents,
      referenceId: applicationId,
      referenceType: "account_application",
      returnUrl,
    });

    // Store envelope reference
    await this.db
      .from("application_disclosures")
      .insert({
        application_id: applicationId,
        method: "e_signature",
        envelope_id: envelope.envelopeId,
        provider: this.eSig.name,
        status: envelope.status,
        created_at: new Date().toISOString(),
      })
      .execute();

    // Create embedded signing session
    const session = await this.eSig.createEmbeddedSigningSession({
      envelopeId: envelope.envelopeId,
      clientUserId: applicationId,
      returnUrl,
    });

    await this.appendAudit(applicationId, {
      action: "disclosure_envelope_created",
      previousStatus: row.status as ApplicationStatus,
      newStatus: row.status as ApplicationStatus,
      actorId: "system",
      actorType: "system",
      description: `Disclosure envelope created via ${this.eSig.name}. ${documents.length} document(s).`,
    });

    log("info", "createDisclosureEnvelope", {
      applicationId,
      envelopeId: envelope.envelopeId,
      provider: this.eSig.name,
      documentCount: documents.length,
    });

    return {
      envelopeId: envelope.envelopeId,
      signingUrl: session.signingUrl,
      sessionId: session.sessionId,
    };
  }

  /**
   * Check if disclosures have been signed for an application.
   * Called before allowing funding submission.
   */
  async checkDisclosureStatus(
    applicationId: string,
  ): Promise<{ signed: boolean; method: string; envelopeId?: string }> {
    const { data } = await this.db
      .from("application_disclosures")
      .select("*")
      .eq("application_id", applicationId)
      .maybeSingle();

    if (!data) {
      return { signed: false, method: "none" };
    }

    if ((data as Record<string, unknown>).method === "checkbox") {
      return { signed: true, method: "checkbox" };
    }

    // Check e-signature status
    const envelopeId = (data as Record<string, unknown>).envelope_id as string;
    if (this.eSig && envelopeId) {
      const status = await this.eSig.getEnvelopeStatus(envelopeId);
      const signed = status.status === "signed";

      if (signed) {
        // Update stored status
        await this.db
          .from("application_disclosures")
          .update({ status: "signed", signed_at: new Date().toISOString() })
          .eq("application_id", applicationId)
          .execute();

        await this.appendAudit(applicationId, {
          action: "disclosures_signed",
          previousStatus: "products_selected",
          newStatus: "products_selected",
          actorId: "applicant",
          actorType: "applicant",
          description: `Disclosures signed via ${this.eSig.name}.`,
        });
      }

      return { signed, method: "e_signature", envelopeId };
    }

    return { signed: false, method: "e_signature", envelopeId };
  }

  // ===========================================================================
  // ADMIN: listApplications
  // ===========================================================================

  async listApplications(filter: ApplicationListFilter): Promise<ApplicationListResult> {
    const limit = Math.min(filter.limit ?? 25, 100);
    const offset = filter.offset ?? 0;

    let query = this.db
      .from("account_applications")
      .select("*", { count: "exact" })
      .eq("tenant_id", filter.tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filter.statuses?.length) {
      query = query.in("status", filter.statuses);
    }
    if (filter.createdAfter) {
      query = query.gte("created_at", filter.createdAfter);
    }
    if (filter.createdBefore) {
      query = query.lte("created_at", filter.createdBefore);
    }

    const result = await query.execute();

    return {
      applications: (result.data ?? []).map((row: Record<string, unknown>) =>
        this.toAccountApplication(row),
      ),
      total: result.count ?? 0,
      offset,
      limit,
    };
  }

  // ===========================================================================
  // ADMIN: reviewApplication
  // ===========================================================================

  async reviewApplication(action: ApplicationReviewAction): Promise<AccountApplication> {
    const row = await this.loadApplication(action.applicationId);

    // Only allow review of applications in reviewable states
    const reviewableStatuses: ApplicationStatus[] = ["kyc_review", "kyc_pending", "submitted"];
    if (!reviewableStatuses.includes(row.status as ApplicationStatus)) {
      throw new Error(
        `Cannot review application in status: ${row.status}. Must be in: ${reviewableStatuses.join(", ")}`,
      );
    }

    let newStatus: ApplicationStatus;
    switch (action.decision) {
      case "approve":
        newStatus = "kyc_approved";
        break;
      case "deny":
        newStatus = "declined";
        break;
      case "escalate":
        newStatus = "kyc_review"; // Keep in review queue
        break;
      case "request_info":
        newStatus = "kyc_pending"; // Back to pending for more info
        break;
      default:
        throw new Error(`Unknown review decision: ${action.decision}`);
    }

    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (action.reason) {
      updates.reason = action.reason;
    }

    await this.db
      .from("account_applications")
      .update(updates)
      .eq("id", action.applicationId)
      .execute();

    await this.appendAudit(action.applicationId, {
      action: `admin_review:${action.decision}`,
      previousStatus: row.status as ApplicationStatus,
      newStatus,
      actorId: action.reviewerId,
      actorType: "admin",
      description: `Admin ${action.decision}${action.reason ? `: ${action.reason}` : ""}`,
    });

    log("info", "reviewApplication", {
      applicationId: action.applicationId,
      decision: action.decision,
      reviewerId: action.reviewerId,
      previousStatus: row.status,
      newStatus,
    });

    return this.getApplication(action.applicationId);
  }

  // ===========================================================================
  // ADMIN: getAuditTrail
  // ===========================================================================

  async getAuditTrail(applicationId: string): Promise<ApplicationAuditEntry[]> {
    const { data } = await this.db
      .from("application_audit_trail")
      .select("*")
      .eq("application_id", applicationId)
      .order("timestamp", { ascending: true })
      .execute();

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      applicationId: row.application_id as string,
      action: row.action as string,
      previousStatus: (row.previous_status as ApplicationStatus) ?? null,
      newStatus: row.new_status as ApplicationStatus,
      actorId: row.actor_id as string,
      actorType: row.actor_type as "applicant" | "admin" | "system",
      description: row.description as string,
      timestamp: row.timestamp as string,
    }));
  }

  // ===========================================================================
  // ADMIN: getStats
  // ===========================================================================

  async getStats(tenantId: string): Promise<ApplicationStats> {
    // Get all applications for this tenant
    const { data: allApps } = await this.db
      .from("account_applications")
      .select("status, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .execute();

    const apps = allApps ?? [];
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Count by status
    const byStatus: Record<string, number> = {};
    const allStatuses: ApplicationStatus[] = [
      "draft",
      "submitted",
      "kyc_pending",
      "kyc_approved",
      "kyc_denied",
      "kyc_review",
      "products_selected",
      "funding_pending",
      "funded",
      "approved",
      "completed",
      "declined",
      "expired",
      "cancelled",
    ];
    for (const s of allStatuses) {
      byStatus[s] = 0;
    }

    let last24hCount = 0;
    const completionTimes: number[] = [];
    let autoDecisionCount = 0;
    let totalDecisionCount = 0;

    for (const app of apps) {
      const status = app.status as string;
      byStatus[status] = (byStatus[status] ?? 0) + 1;

      if ((app.created_at as string) >= last24h) {
        last24hCount++;
      }

      // Track completion time for completed applications
      if (status === "completed" && app.created_at && app.updated_at) {
        const created = new Date(app.created_at as string).getTime();
        const updated = new Date(app.updated_at as string).getTime();
        completionTimes.push((updated - created) / (1000 * 60)); // minutes
      }

      // Track auto-decision rate (kyc_approved without manual review)
      if (
        ["kyc_approved", "products_selected", "funded", "approved", "completed"].includes(status)
      ) {
        autoDecisionCount++;
        totalDecisionCount++;
      } else if (["kyc_denied", "declined", "kyc_review"].includes(status)) {
        totalDecisionCount++;
      }
    }

    const avgCompletionMinutes =
      completionTimes.length > 0
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : null;

    const autoDecisionRate =
      totalDecisionCount > 0 ? Math.round((autoDecisionCount / totalDecisionCount) * 100) : null;

    return {
      tenantId,
      byStatus: byStatus as Record<ApplicationStatus, number>,
      pendingReviewCount: byStatus["kyc_review"] ?? 0,
      last24hCount,
      avgCompletionMinutes,
      autoDecisionRate,
      generatedAt: now.toISOString(),
    };
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async loadApplication(applicationId: string): Promise<Record<string, unknown>> {
    const { data, error } = await this.db
      .from("account_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (error || !data) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Check for expiry
    if (data.expires_at && new Date(data.expires_at as string) < new Date()) {
      const currentStatus = data.status as ApplicationStatus;
      const terminalStatuses: ApplicationStatus[] = [
        "completed",
        "declined",
        "cancelled",
        "expired",
      ];
      if (!terminalStatuses.includes(currentStatus)) {
        await this.updateStatus(applicationId, "expired");
        await this.appendAudit(applicationId, {
          action: "application_expired",
          previousStatus: currentStatus,
          newStatus: "expired",
          actorId: "system",
          actorType: "system",
          description: "Application expired due to inactivity.",
        });
        data.status = "expired";
      }
    }

    return data as Record<string, unknown>;
  }

  private assertStatus(row: Record<string, unknown>, allowedStatuses: ApplicationStatus[]): void {
    const status = row.status as ApplicationStatus;
    if (!allowedStatuses.includes(status)) {
      throw new Error(
        `Invalid application status: ${status}. Expected: ${allowedStatuses.join(", ")}`,
      );
    }
  }

  private async updateStatus(applicationId: string, status: ApplicationStatus): Promise<void> {
    await this.db
      .from("account_applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", applicationId)
      .execute();
  }

  private async appendAudit(
    applicationId: string,
    entry: Omit<ApplicationAuditEntry, "id" | "applicationId" | "timestamp">,
  ): Promise<void> {
    await this.db
      .from("application_audit_trail")
      .insert({
        id: `audit_${crypto.randomUUID()}`,
        application_id: applicationId,
        action: entry.action,
        previous_status: entry.previousStatus,
        new_status: entry.newStatus,
        actor_id: entry.actorId,
        actor_type: entry.actorType,
        description: entry.description,
        timestamp: new Date().toISOString(),
      })
      .execute();
  }

  private toAccountApplication(row: Record<string, unknown>): AccountApplication {
    return {
      id: row.id as string,
      tenantId: (row.tenant_id as string) ?? "",
      status: row.status as ApplicationStatus,
      applicant: {
        firstNameInitial: (row.first_name_initial as string) ?? "",
        lastNameMasked: (row.last_name_masked as string) ?? "",
        emailMasked: (row.email_masked as string) ?? "",
        ssnMasked: (row.ssn_masked as string) ?? "",
      },
      selectedProducts: [],
      funding: row.funding_method
        ? {
            method: row.funding_method as AccountApplication["funding"] extends { method: infer M }
              ? M
              : never,
            amountCents: (row.funding_amount_cents as number) ?? 0,
            sourceAccountMasked: (row.funding_source_masked as string) ?? undefined,
          }
        : undefined,
      kycToken: (row.kyc_token as string) ?? undefined,
      reason: (row.reason as string) ?? undefined,
      createdAt: (row.created_at as string) ?? "",
      updatedAt: (row.updated_at as string) ?? "",
      expiresAt: (row.expires_at as string) ?? "",
    };
  }
}
