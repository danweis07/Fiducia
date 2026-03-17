/**
 * Account Opening Adapter — Types
 *
 * Defines the interface for account opening / digital application providers.
 * Provider-agnostic interface for digital account opening flows.
 *
 * Flow: create application → submit KYC → select products → fund → complete
 *
 * IMPORTANT: PII handling rules
 * - SSN, DOB, full account numbers MUST NEVER appear in logs or responses
 * - All PII fields annotated with @pii below
 */

// =============================================================================
// APPLICATION STATUS
// =============================================================================

export type ApplicationStatus =
  | 'draft'           // Application started but not submitted
  | 'submitted'       // Application submitted, pending KYC
  | 'kyc_pending'     // KYC verification in progress
  | 'kyc_approved'    // KYC passed, ready for product selection
  | 'kyc_denied'      // KYC failed
  | 'kyc_review'      // KYC needs manual review
  | 'products_selected' // Products chosen, ready for funding
  | 'funding_pending'   // Initial deposit in progress
  | 'funded'          // Initial deposit received
  | 'approved'        // Application fully approved
  | 'completed'       // Account(s) created and ready
  | 'declined'        // Application declined
  | 'expired'         // Application timed out
  | 'cancelled';      // Applicant cancelled

// =============================================================================
// APPLICANT (input)
// =============================================================================

export interface ApplicantInfo {
  /** @pii Legal first name */
  firstName: string;
  /** @pii Legal last name */
  lastName: string;
  /** @pii Middle name or initial */
  middleName?: string;
  /** @pii Suffix (Jr., Sr., III, etc.) */
  suffix?: string;
  /** @pii Email address */
  email: string;
  /** @pii Phone number (E.164) */
  phone: string;
  /** @pii Date of birth (YYYY-MM-DD) */
  dateOfBirth: string;
  /** @pii Social Security Number — MUST be masked in all responses/logs */
  ssn: string;
  /** @pii Physical address */
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  /** Citizenship status */
  citizenship: 'us_citizen' | 'permanent_resident' | 'non_resident';
  /** Employment status */
  employmentStatus?: 'employed' | 'self_employed' | 'retired' | 'student' | 'unemployed';
  /** Employer name (if employed) */
  employerName?: string;
  /** Annual income in cents */
  annualIncomeCents?: number;
}

// =============================================================================
// PRODUCT SELECTION
// =============================================================================

export type ProductType = 'checking' | 'savings' | 'money_market' | 'cd' | 'ira';

export interface ProductOption {
  id: string;
  type: ProductType;
  name: string;
  description: string;
  /** Annual percentage yield in basis points (e.g. 425 = 4.25%) */
  apyBps: number;
  /** Minimum opening deposit in cents */
  minOpeningDepositCents: number;
  /** Monthly fee in cents (0 = free) */
  monthlyFeeCents: number;
  /** Fee waiver conditions */
  feeWaiverDescription?: string;
  /** For CDs: term in months */
  termMonths?: number;
  /** Whether this product is available for new applications */
  isAvailable: boolean;
}

// =============================================================================
// FUNDING
// =============================================================================

export type FundingMethod =
  | 'ach_transfer'      // From external bank account
  | 'debit_card'        // Card-based funding
  | 'wire_transfer'     // Wire from another institution
  | 'check_deposit'     // Mail a check
  | 'internal_transfer' // From existing account at same institution
  | 'none';             // Open without initial deposit (if allowed)

export interface FundingRequest {
  method: FundingMethod;
  amountCents: number;
  /** For ACH: routing + account number of source (masked in responses) */
  sourceRoutingNumber?: string;
  /** @pii */
  sourceAccountNumber?: string;
  /** For debit card: tokenized card reference (never raw card number) */
  cardToken?: string;
}

// =============================================================================
// APPLICATION
// =============================================================================

export interface AccountApplication {
  /** Application ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** Status of the application */
  status: ApplicationStatus;
  /** Applicant information (masked in responses) */
  applicant: {
    firstNameInitial: string;
    lastNameMasked: string;
    emailMasked: string;
    ssnMasked: string;
  };
  /** Selected products */
  selectedProducts: Array<{
    productId: string;
    productType: ProductType;
    productName: string;
  }>;
  /** Funding info (masked) */
  funding?: {
    method: FundingMethod;
    amountCents: number;
    sourceAccountMasked?: string;
  };
  /** KYC evaluation reference */
  kycToken?: string;
  /** Created accounts (populated on completion) */
  createdAccounts?: Array<{
    accountId: string;
    accountNumberMasked: string;
    type: ProductType;
  }>;
  /** Decline/expiry reason */
  reason?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

// =============================================================================
// ADAPTER CONFIGURATION (per tenant)
// =============================================================================

export interface AccountOpeningConfig {
  /** Available products for this tenant */
  products: ProductOption[];
  /** Allowed funding methods */
  allowedFundingMethods: FundingMethod[];
  /** Minimum age to apply */
  minimumAge: number;
  /** Maximum applications per day (rate limiting) */
  maxApplicationsPerDay: number;
  /** Application expiry in hours */
  applicationExpiryHours: number;
  /** Whether joint accounts are supported */
  allowJointApplications: boolean;
  /** Required disclosures for account opening */
  requiredDisclosures: string[];
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface AccountOpeningAdapter {
  /** Unique adapter identifier (e.g. "cuanswers", "mock") */
  readonly name: string;

  /** Get available products and configuration for a tenant */
  getConfig(tenantId: string): Promise<AccountOpeningConfig>;

  /** Create a new application */
  createApplication(
    tenantId: string,
    applicant: ApplicantInfo,
  ): Promise<AccountApplication>;

  /** Get application status */
  getApplication(applicationId: string): Promise<AccountApplication>;

  /** Select products for an application */
  selectProducts(
    applicationId: string,
    productIds: string[],
  ): Promise<AccountApplication>;

  /** Submit funding for an application */
  submitFunding(
    applicationId: string,
    funding: FundingRequest,
  ): Promise<AccountApplication>;

  /** Complete the application (triggers account creation) */
  completeApplication(applicationId: string): Promise<AccountApplication>;

  /** Cancel an in-progress application */
  cancelApplication(applicationId: string): Promise<void>;
}

// =============================================================================
// ADMIN INTERFACE (extends base for back-office operations)
// =============================================================================

/** Filter criteria for listing applications */
export interface ApplicationListFilter {
  tenantId: string;
  /** Filter by status(es) */
  statuses?: ApplicationStatus[];
  /** Only applications created after this ISO timestamp */
  createdAfter?: string;
  /** Only applications created before this ISO timestamp */
  createdBefore?: string;
  /** Pagination offset (0-based) */
  offset?: number;
  /** Page size (default 25, max 100) */
  limit?: number;
}

/** Paginated list of applications (all PII masked) */
export interface ApplicationListResult {
  applications: AccountApplication[];
  total: number;
  offset: number;
  limit: number;
}

/** Admin review decision */
export type ReviewDecision = 'approve' | 'deny' | 'escalate' | 'request_info';

/** Admin review action input */
export interface ApplicationReviewAction {
  applicationId: string;
  decision: ReviewDecision;
  /** Reason for the decision (required for deny/escalate) */
  reason?: string;
  /** Admin user ID performing the review */
  reviewerId: string;
}

/** Immutable audit trail entry */
export interface ApplicationAuditEntry {
  id: string;
  applicationId: string;
  action: string;
  /** Previous status before this action */
  previousStatus: ApplicationStatus | null;
  /** New status after this action */
  newStatus: ApplicationStatus;
  /** Actor ID (user or admin who triggered the action) */
  actorId: string;
  /** Actor type */
  actorType: 'applicant' | 'admin' | 'system';
  /** Human-readable description (NO PII) */
  description: string;
  timestamp: string;
}

/** Aggregate stats for the admin dashboard */
export interface ApplicationStats {
  tenantId: string;
  /** Counts by status */
  byStatus: Record<ApplicationStatus, number>;
  /** Applications requiring manual review */
  pendingReviewCount: number;
  /** Applications created in the last 24h */
  last24hCount: number;
  /** Average time from draft to completed (minutes), null if no data */
  avgCompletionMinutes: number | null;
  /** Auto-decision rate (0-100) */
  autoDecisionRate: number | null;
  /** Timestamp of the stats snapshot */
  generatedAt: string;
}

/**
 * Admin-capable account opening adapter.
 * Extends the base interface with back-office operations:
 * review queues, audit trail, search, and dashboard stats.
 */
export interface AccountOpeningAdminAdapter extends AccountOpeningAdapter {
  /** List applications with filters and pagination */
  listApplications(filter: ApplicationListFilter): Promise<ApplicationListResult>;

  /** Admin review action (approve, deny, escalate, request more info) */
  reviewApplication(action: ApplicationReviewAction): Promise<AccountApplication>;

  /** Get full audit trail for an application */
  getAuditTrail(applicationId: string): Promise<ApplicationAuditEntry[]>;

  /** Get aggregate stats for admin dashboard */
  getStats(tenantId: string): Promise<ApplicationStats>;
}
