/**
 * Mock Account Opening Adapter
 *
 * In-memory mock for development and testing.
 * Simulates a digital account opening flow.
 *
 * Deterministic behavior:
 * - SSN ending in "0000" → KYC denied
 * - SSN ending in "9999" → KYC manual review
 * - All others → KYC approved
 * - lastName starting with "DECLINE" → application declined
 */

import { secureRandomInt } from "../../secure-random.ts";
import type {
  AccountOpeningAdapter,
  AccountOpeningConfig,
  AccountApplication,
  ApplicantInfo,
  FundingRequest,
  ProductOption,
  ApplicationStatus,
} from "./types.ts";

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_PRODUCTS: ProductOption[] = [
  {
    id: "prod_checking_free",
    type: "checking",
    name: "Free Checking",
    description: "No monthly fees, no minimum balance. Free debit card included.",
    apyBps: 1, // 0.01%
    minOpeningDepositCents: 2500, // $25
    monthlyFeeCents: 0,
    isAvailable: true,
  },
  {
    id: "prod_checking_premium",
    type: "checking",
    name: "Premium Checking",
    description: "Earn interest on your checking balance. Free checks and cashier's checks.",
    apyBps: 50, // 0.50%
    minOpeningDepositCents: 10000, // $100
    monthlyFeeCents: 1200, // $12
    feeWaiverDescription: "Waived with $2,500 minimum daily balance",
    isAvailable: true,
  },
  {
    id: "prod_savings_basic",
    type: "savings",
    name: "Regular Savings",
    description: "Start saving with as little as $5. Earn competitive interest.",
    apyBps: 350, // 3.50%
    minOpeningDepositCents: 500, // $5
    monthlyFeeCents: 0,
    isAvailable: true,
  },
  {
    id: "prod_savings_high_yield",
    type: "savings",
    name: "High-Yield Savings",
    description: "Our best savings rate. Perfect for building your emergency fund.",
    apyBps: 475, // 4.75%
    minOpeningDepositCents: 50000, // $500
    monthlyFeeCents: 0,
    isAvailable: true,
  },
  {
    id: "prod_money_market",
    type: "money_market",
    name: "Money Market Account",
    description: "Higher rates with check-writing privileges. Tiered interest rates.",
    apyBps: 425, // 4.25%
    minOpeningDepositCents: 100000, // $1,000
    monthlyFeeCents: 500,
    feeWaiverDescription: "Waived with $5,000 minimum daily balance",
    isAvailable: true,
  },
  {
    id: "prod_cd_6mo",
    type: "cd",
    name: "6-Month CD",
    description: "Lock in a great rate for 6 months.",
    apyBps: 490, // 4.90%
    minOpeningDepositCents: 100000, // $1,000
    monthlyFeeCents: 0,
    termMonths: 6,
    isAvailable: true,
  },
  {
    id: "prod_cd_12mo",
    type: "cd",
    name: "12-Month CD",
    description: "Our most popular CD term with a competitive rate.",
    apyBps: 500, // 5.00%
    minOpeningDepositCents: 100000, // $1,000
    monthlyFeeCents: 0,
    termMonths: 12,
    isAvailable: true,
  },
];

// In-memory store for mock applications
const applicationStore = new Map<string, AccountApplication>();

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "****@****.***";
  const maskedLocal = local.charAt(0) + "***";
  return `${maskedLocal}@${domain}`;
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
// MOCK ADAPTER
// =============================================================================

export class MockAccountOpeningAdapter implements AccountOpeningAdapter {
  readonly name = "mock";

  async getConfig(_tenantId: string): Promise<AccountOpeningConfig> {
    return {
      products: MOCK_PRODUCTS,
      allowedFundingMethods: ["ach_transfer", "debit_card", "internal_transfer", "none"],
      minimumAge: 18,
      maxApplicationsPerDay: 5,
      applicationExpiryHours: 72,
      allowJointApplications: false,
      requiredDisclosures: ["digital_banking_agreement", "electronic_disclosure", "privacy_policy"],
    };
  }

  async createApplication(tenantId: string, applicant: ApplicantInfo): Promise<AccountApplication> {
    const id = `app_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    // Determine KYC outcome based on SSN
    const ssnDigits = applicant.ssn.replace(/\D/g, "");
    let status: ApplicationStatus = "kyc_approved";
    if (ssnDigits.endsWith("0000")) {
      status = "kyc_denied";
    } else if (ssnDigits.endsWith("9999")) {
      status = "kyc_review";
    }

    // Check for decline trigger
    if (applicant.lastName.toUpperCase().startsWith("DECLINE")) {
      status = "declined";
    }

    const application: AccountApplication = {
      id,
      tenantId,
      status,
      applicant: {
        firstNameInitial: applicant.firstName.charAt(0).toUpperCase(),
        lastNameMasked: maskLastName(applicant.lastName),
        emailMasked: maskEmail(applicant.email),
        ssnMasked: maskSSN(applicant.ssn),
      },
      selectedProducts: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    applicationStore.set(id, application);

    // Log WITHOUT PII
    console.warn(
      JSON.stringify({
        level: "info",
        adapter: "mock-account-opening",
        action: "createApplication",
        applicationId: id,
        tenantId,
        status,
        timestamp: now,
      }),
    );

    return application;
  }

  async getApplication(applicationId: string): Promise<AccountApplication> {
    const app = applicationStore.get(applicationId);
    if (!app) {
      throw new Error(`Application not found: ${applicationId}`);
    }
    return app;
  }

  async selectProducts(applicationId: string, productIds: string[]): Promise<AccountApplication> {
    const app = applicationStore.get(applicationId);
    if (!app) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const selectedProducts = productIds.map((pid) => {
      const product = MOCK_PRODUCTS.find((p) => p.id === pid);
      if (!product) throw new Error(`Product not found: ${pid}`);
      return {
        productId: product.id,
        productType: product.type,
        productName: product.name,
      };
    });

    app.selectedProducts = selectedProducts;
    app.status = "products_selected";
    app.updatedAt = new Date().toISOString();
    applicationStore.set(applicationId, app);

    return app;
  }

  async submitFunding(applicationId: string, funding: FundingRequest): Promise<AccountApplication> {
    const app = applicationStore.get(applicationId);
    if (!app) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    app.funding = {
      method: funding.method,
      amountCents: funding.amountCents,
      sourceAccountMasked: funding.sourceAccountNumber
        ? maskAccountNumber(funding.sourceAccountNumber)
        : undefined,
    };
    app.status = "funded";
    app.updatedAt = new Date().toISOString();
    applicationStore.set(applicationId, app);

    return app;
  }

  async completeApplication(applicationId: string): Promise<AccountApplication> {
    const app = applicationStore.get(applicationId);
    if (!app) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Generate mock accounts
    app.createdAccounts = app.selectedProducts.map((p) => ({
      accountId: `acct_${crypto.randomUUID()}`,
      accountNumberMasked: `****${secureRandomInt(1000, 10000)}`,
      type: p.productType,
    }));

    app.status = "completed";
    app.updatedAt = new Date().toISOString();
    applicationStore.set(applicationId, app);

    console.warn(
      JSON.stringify({
        level: "info",
        adapter: "mock-account-opening",
        action: "completeApplication",
        applicationId,
        accountsCreated: app.createdAccounts.length,
        timestamp: app.updatedAt,
      }),
    );

    return app;
  }

  async cancelApplication(applicationId: string): Promise<void> {
    const app = applicationStore.get(applicationId);
    if (!app) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    app.status = "cancelled";
    app.updatedAt = new Date().toISOString();
    applicationStore.set(applicationId, app);
  }
}
