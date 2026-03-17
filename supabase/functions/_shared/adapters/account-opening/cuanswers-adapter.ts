// TODO: Provisional integration — not yet validated in production.
/**
 * CU*Answers Account Opening Adapter
 *
 * Integrates with CU*Answers' membership application and opening APIs:
 *   - POST applicants (MAP) — Submit membership application
 *   - POST members (MOP) — Open membership and create accounts
 *   - POST members/record — Check for existing membership by SSN
 *   - POST membership/reserve — Reserve an account number
 *   - POST membership/validate — Validate member info and reserve account
 *   - PUT online_banking_activation — Activate online banking credentials
 *
 * Flow: validate → reserve account → submit applicant (MAP) → open member (MOP) → activate online banking
 *
 * Configuration:
 *   CUANSWERS_BASE_URL — API base URL
 *   CUANSWERS_APP_KEY — APP Key for authentication
 *   CUANSWERS_CREDIT_UNION_ID — Credit Union ID (format: CUXXXXX)
 *
 * IMPORTANT: PII (SSN, DOB, account numbers) MUST NEVER appear in logs.
 */

import type {
  AccountOpeningAdapter,
  AccountOpeningConfig,
  AccountApplication,
  ApplicationStatus,
  ApplicantInfo,
  FundingRequest,
  ProductOption,
} from './types.ts';
import { maskSSN } from '../kyc/types.ts';

// =============================================================================
// CU*ANSWERS API TYPES
// =============================================================================

interface CUAnswersApplicantPayload {
  ssn: string;
  first_name: string;
  middle_initial: string;
  last_name: string;
  maiden_name: string;
  gender: 'M' | 'F' | 'U';
  date_of_birth: string;
  us_citizen: 'Y' | 'N';
  street_address: string;
  address_line_2: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  phone: string;
  work_phone: string;
  work_extension: string;
  other_phone: string;
  drivers_license: string;
  drivers_license_state: string;
  email_address: string;
  marital_status: 'M' | 'S' | 'U';
  promo_code: string;
  verification_pass: 'Y' | 'N';
  verification_fail_reason: string;
  joint_applicants?: CUAnswersApplicantPayload[];
}

interface CUAnswersApplicantResponse {
  data: {
    application_number: string;
    core_response_message: string;
    http_response_code: string;
  };
}

interface CUAnswersMemberPayload extends CUAnswersApplicantPayload {
  reserved_account_number: string;
  joint_members?: CUAnswersApplicantPayload[];
}

interface CUAnswersMemberResponse {
  data: {
    core_response_message: string;
    account_number: string;
    http_response_code: string;
  };
}

interface CUAnswersReserveResponse {
  data: {
    reserved_account_number: string;
  };
}

interface CUAnswersOnlineBankingResponse {
  data: {
    core_response_message: string;
    temp_password: string;
  };
}

// =============================================================================
// IN-MEMORY APPLICATION STORE
// =============================================================================

interface ApplicationState {
  application: AccountApplication;
  applicantInfo: ApplicantInfo;
  reservedAccountNumber?: string;
  coreApplicationNumber?: string;
  coreAccountNumber?: string;
}

const applicationStore = new Map<string, ApplicationState>();

// =============================================================================
// HELPERS
// =============================================================================

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  return `${local[0]}***@${domain}`;
}

function maskAccountNumber(acctNo: string): string {
  if (acctNo.length <= 4) return `****${acctNo}`;
  return `****${acctNo.slice(-4)}`;
}

/**
 * Convert ISO date (YYYY-MM-DD) to CU*Answers MOP format (yyyymmdd).
 */
function isoDateToCUAnswersMOP(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 10);
}

function mapCitizenshipFlag(citizenship: ApplicantInfo['citizenship']): 'Y' | 'N' {
  return citizenship === 'us_citizen' ? 'Y' : 'N';
}

// Default products for CU*Answers credit unions
const DEFAULT_PRODUCTS: ProductOption[] = [
  {
    id: 'cubase-share-savings',
    type: 'savings',
    name: 'Share Savings',
    description: 'Primary share savings account — required for credit union membership',
    apyBps: 25, // 0.25%
    minOpeningDepositCents: 500, // $5.00
    monthlyFeeCents: 0,
    isAvailable: true,
  },
  {
    id: 'cubase-share-draft',
    type: 'checking',
    name: 'Share Draft Checking',
    description: 'Free checking account with debit card access',
    apyBps: 0,
    minOpeningDepositCents: 2500, // $25.00
    monthlyFeeCents: 0,
    feeWaiverDescription: 'No monthly fees',
    isAvailable: true,
  },
  {
    id: 'cubase-money-market',
    type: 'money_market',
    name: 'Money Market Account',
    description: 'Higher-yield account for larger balances',
    apyBps: 150, // 1.50%
    minOpeningDepositCents: 100000, // $1,000
    monthlyFeeCents: 0,
    feeWaiverDescription: 'No fee with $1,000 minimum balance',
    isAvailable: true,
  },
  {
    id: 'cubase-certificate-12mo',
    type: 'cd',
    name: '12-Month Certificate',
    description: '12-month share certificate with competitive rate',
    apyBps: 425, // 4.25%
    minOpeningDepositCents: 50000, // $500
    monthlyFeeCents: 0,
    termMonths: 12,
    isAvailable: true,
  },
];

// =============================================================================
// ADAPTER
// =============================================================================

export class CUAnswersAccountOpeningAdapter implements AccountOpeningAdapter {
  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly creditUnionId: string;
  private readonly sandbox: boolean;

  readonly name = 'cuanswers';

  constructor() {
    this.baseUrl = Deno.env.get('CUANSWERS_BASE_URL') ?? '';
    this.appKey = Deno.env.get('CUANSWERS_APP_KEY') ?? '';
    this.creditUnionId = Deno.env.get('CUANSWERS_CREDIT_UNION_ID') ?? '';
    this.sandbox = !this.baseUrl || !this.appKey || !this.creditUnionId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (this.sandbox) {
      throw new Error('CU*Answers account opening adapter in sandbox mode');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'APP-KEY': this.appKey,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`CU*Answers API error (${res.status}): ${errBody}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  private cuPath(subpath: string): string {
    return `/credit_unions/${this.creditUnionId}${subpath}`;
  }

  private buildApplicantPayload(applicant: ApplicantInfo): CUAnswersApplicantPayload {
    return {
      ssn: applicant.ssn.replace(/\D/g, ''),
      first_name: applicant.firstName.slice(0, 14),
      middle_initial: (applicant.middleName ?? '').slice(0, 1),
      last_name: applicant.lastName.slice(0, 15),
      maiden_name: '',
      gender: 'U',
      date_of_birth: isoDateToCUAnswersMOP(applicant.dateOfBirth),
      us_citizen: mapCitizenshipFlag(applicant.citizenship),
      street_address: applicant.address.line1.slice(0, 25),
      address_line_2: (applicant.address.line2 ?? '').slice(0, 25),
      city: applicant.address.city.slice(0, 20),
      state: applicant.address.state.toUpperCase().slice(0, 2),
      zip: applicant.address.zip.slice(0, 5),
      county: '',
      phone: cleanPhone(applicant.phone),
      work_phone: '',
      work_extension: '',
      other_phone: '',
      drivers_license: '',
      drivers_license_state: '',
      email_address: applicant.email.slice(0, 100),
      marital_status: 'U',
      promo_code: '',
      verification_pass: 'N',
      verification_fail_reason: '',
    };
  }

  // ---------------------------------------------------------------------------
  // Get config
  // ---------------------------------------------------------------------------

  async getConfig(_tenantId: string): Promise<AccountOpeningConfig> {
    return {
      products: DEFAULT_PRODUCTS,
      allowedFundingMethods: ['ach_transfer', 'internal_transfer', 'none'],
      minimumAge: 18,
      maxApplicationsPerDay: 5,
      applicationExpiryHours: 72,
      allowJointApplications: true,
      requiredDisclosures: [
        'Membership Eligibility Agreement',
        'Electronic Funds Transfer Disclosure',
        'Truth in Savings Disclosure',
        'Privacy Policy',
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Create application
  // ---------------------------------------------------------------------------

  async createApplication(
    tenantId: string,
    applicant: ApplicantInfo,
  ): Promise<AccountApplication> {
    if (this.sandbox) {
      const { MockAccountOpeningAdapter } = await import('./mock-adapter.ts');
      return new MockAccountOpeningAdapter().createApplication(tenantId, applicant);
    }

    const now = new Date().toISOString();
    const appId = `cua-app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    // Step 1: Check for existing membership
    let existingMember = false;
    try {
      await this.request(
        'POST',
        this.cuPath('/membership/members/record'),
        { ssn: applicant.ssn.replace(/\D/g, '') },
      );
      // 204 = membership exists
      existingMember = true;
    } catch {
      // 404 = no existing membership, proceed with new application
    }

    let status: ApplicationStatus = 'submitted';
    let reservedAccountNumber: string | undefined;

    if (existingMember) {
      // Member already exists — they can add products to existing membership
      status = 'kyc_approved';
    } else {
      // Step 2: Validate member info and reserve account number
      try {
        const validateRes = await this.request<CUAnswersReserveResponse>(
          'POST',
          this.cuPath('/membership/validate'),
          this.buildApplicantPayload(applicant),
        );
        reservedAccountNumber = validateRes.data.reserved_account_number;
        status = 'kyc_pending';
      } catch {
        // Validation failed — try just reserving a number
        try {
          const reserveRes = await this.request<CUAnswersReserveResponse>(
            'POST',
            this.cuPath('/membership/reserve'),
          );
          reservedAccountNumber = reserveRes.data.reserved_account_number;
          status = 'kyc_pending';
        } catch {
          status = 'submitted';
        }
      }
    }

    const application: AccountApplication = {
      id: appId,
      tenantId,
      status,
      applicant: {
        firstNameInitial: applicant.firstName[0],
        lastNameMasked: `${applicant.lastName[0]}${'*'.repeat(applicant.lastName.length - 1)}`,
        emailMasked: maskEmail(applicant.email),
        ssnMasked: maskSSN(applicant.ssn),
      },
      selectedProducts: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    applicationStore.set(appId, {
      application,
      applicantInfo: applicant,
      reservedAccountNumber,
    });

    return application;
  }

  // ---------------------------------------------------------------------------
  // Get application
  // ---------------------------------------------------------------------------

  async getApplication(applicationId: string): Promise<AccountApplication> {
    if (this.sandbox) {
      const { MockAccountOpeningAdapter } = await import('./mock-adapter.ts');
      return new MockAccountOpeningAdapter().getApplication(applicationId);
    }

    const state = applicationStore.get(applicationId);
    if (!state) {
      throw new Error(`Application ${applicationId} not found`);
    }

    // Check expiry
    if (new Date(state.application.expiresAt) < new Date()) {
      state.application.status = 'expired';
      state.application.updatedAt = new Date().toISOString();
    }

    return state.application;
  }

  // ---------------------------------------------------------------------------
  // Select products
  // ---------------------------------------------------------------------------

  async selectProducts(
    applicationId: string,
    productIds: string[],
  ): Promise<AccountApplication> {
    if (this.sandbox) {
      const { MockAccountOpeningAdapter } = await import('./mock-adapter.ts');
      return new MockAccountOpeningAdapter().selectProducts(applicationId, productIds);
    }

    const state = applicationStore.get(applicationId);
    if (!state) throw new Error(`Application ${applicationId} not found`);

    const selectedProducts = productIds.map(id => {
      const product = DEFAULT_PRODUCTS.find(p => p.id === id);
      if (!product) throw new Error(`Product ${id} not found`);
      return {
        productId: product.id,
        productType: product.type,
        productName: product.name,
      };
    });

    state.application.selectedProducts = selectedProducts;
    state.application.status = 'products_selected';
    state.application.updatedAt = new Date().toISOString();

    return state.application;
  }

  // ---------------------------------------------------------------------------
  // Submit funding
  // ---------------------------------------------------------------------------

  async submitFunding(
    applicationId: string,
    funding: FundingRequest,
  ): Promise<AccountApplication> {
    if (this.sandbox) {
      const { MockAccountOpeningAdapter } = await import('./mock-adapter.ts');
      return new MockAccountOpeningAdapter().submitFunding(applicationId, funding);
    }

    const state = applicationStore.get(applicationId);
    if (!state) throw new Error(`Application ${applicationId} not found`);

    state.application.funding = {
      method: funding.method,
      amountCents: funding.amountCents,
      sourceAccountMasked: funding.sourceAccountNumber
        ? maskAccountNumber(funding.sourceAccountNumber)
        : undefined,
    };
    state.application.status = 'funding_pending';
    state.application.updatedAt = new Date().toISOString();

    return state.application;
  }

  // ---------------------------------------------------------------------------
  // Complete application (triggers MAP → MOP on CU*Answers)
  // ---------------------------------------------------------------------------

  async completeApplication(applicationId: string): Promise<AccountApplication> {
    if (this.sandbox) {
      const { MockAccountOpeningAdapter } = await import('./mock-adapter.ts');
      return new MockAccountOpeningAdapter().completeApplication(applicationId);
    }

    const state = applicationStore.get(applicationId);
    if (!state) throw new Error(`Application ${applicationId} not found`);

    const { applicantInfo, reservedAccountNumber } = state;

    // Step 1: Submit membership application (MAP)
    const applicantPayload = this.buildApplicantPayload(applicantInfo);
    try {
      const mapResult = await this.request<CUAnswersApplicantResponse>(
        'POST',
        this.cuPath('/membership/applicants'),
        applicantPayload,
      );
      state.coreApplicationNumber = mapResult.data.application_number;
    } catch (err) {
      // 409 = duplicate application, which is OK — means application already submitted
      if (!(err instanceof Error && err.message.includes('409'))) {
        state.application.status = 'declined';
        state.application.reason = err instanceof Error ? err.message : 'Application submission failed';
        state.application.updatedAt = new Date().toISOString();
        return state.application;
      }
    }

    // Step 2: Open membership (MOP)
    const memberPayload: CUAnswersMemberPayload = {
      ...applicantPayload,
      reserved_account_number: reservedAccountNumber ?? '',
    };

    try {
      const mopResult = await this.request<CUAnswersMemberResponse>(
        'POST',
        this.cuPath('/membership/members'),
        memberPayload,
      );

      state.coreAccountNumber = mopResult.data.account_number;

      state.application.createdAccounts = state.application.selectedProducts.map(p => ({
        accountId: mopResult.data.account_number,
        accountNumberMasked: maskAccountNumber(mopResult.data.account_number),
        type: p.productType,
      }));

      state.application.status = 'completed';
    } catch (err) {
      state.application.status = 'declined';
      state.application.reason = err instanceof Error ? err.message : 'Membership opening failed';
    }

    // Step 3: Activate online banking (best-effort)
    if (state.application.status === 'completed' && state.coreAccountNumber) {
      try {
        await this.request<CUAnswersOnlineBankingResponse>(
          'PUT',
          this.cuPath(`/membership/members/${state.coreAccountNumber}/online_banking_activation`),
        );
      } catch {
        // Online banking activation is best-effort — member can activate later
      }
    }

    state.application.updatedAt = new Date().toISOString();
    return state.application;
  }

  // ---------------------------------------------------------------------------
  // Cancel application
  // ---------------------------------------------------------------------------

  async cancelApplication(applicationId: string): Promise<void> {
    if (this.sandbox) {
      const { MockAccountOpeningAdapter } = await import('./mock-adapter.ts');
      return new MockAccountOpeningAdapter().cancelApplication(applicationId);
    }

    const state = applicationStore.get(applicationId);
    if (!state) throw new Error(`Application ${applicationId} not found`);

    state.application.status = 'cancelled';
    state.application.updatedAt = new Date().toISOString();
  }
}
