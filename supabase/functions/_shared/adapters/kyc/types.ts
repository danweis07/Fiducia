/**
 * KYC (Know Your Customer) Adapter — Types
 *
 * Defines the interface for identity verification providers (e.g. Alloy).
 * Any adapter that performs KYC/identity checks must implement KYCAdapter.
 *
 * IMPORTANT: PII handling rules
 * - SSN must NEVER appear in logs or API responses
 * - PII fields are annotated with @pii comments below
 */

// =============================================================================
// KYC APPLICANT (input)
// =============================================================================

export interface KYCAddress {
  /** @pii Street address line 1 */
  line1: string;
  /** @pii Optional street address line 2 */
  line2?: string;
  /** City */
  city: string;
  /** Two-letter state code (e.g. "CA") */
  state: string;
  /** 5-digit ZIP code */
  zip: string;
}

export interface KYCApplicant {
  /** @pii Legal first name */
  firstName: string;
  /** @pii Legal last name */
  lastName: string;
  /** @pii Email address */
  email: string;
  /** @pii Phone number (E.164 format preferred) */
  phone: string;
  /** @pii Date of birth (ISO 8601: YYYY-MM-DD) */
  dateOfBirth: string;
  /** @pii Social Security Number — MUST be masked in all responses/logs */
  ssn: string;
  /** @pii Physical address */
  address: KYCAddress;

  // --- International KYC fields (optional) ---

  /** ISO 3166-1 alpha-2 country code for jurisdiction-specific verification */
  countryCode?: string;
  /** National ID number (masked in responses — e.g., Aadhaar, CPF, DNI, NIF) */
  nationalIdMasked?: string;
  /** National ID type */
  nationalIdType?: NationalIdType;
  /** Liveness verification data — base64 video or provider session token */
  livenessToken?: string;
  /** Type of liveness verification performed */
  livenessMethod?: LivenessMethod;
}

// =============================================================================
// INTERNATIONAL KYC TYPES
// =============================================================================

/** National ID document types by region */
export type NationalIdType =
  | 'ssn'              // US Social Security Number
  | 'aadhaar'          // India Aadhaar
  | 'pan'              // India PAN
  | 'cpf'              // Brazil CPF (Cadastro de Pessoas Físicas)
  | 'cnpj'             // Brazil CNPJ (business)
  | 'dni'              // Spain DNI
  | 'nif'              // Portugal / France NIF
  | 'personalausweis'  // Germany Personalausweis
  | 'bsn'              // Netherlands BSN (Burgerservicenummer)
  | 'pps'              // Ireland PPS number
  | 'nric'             // Singapore NRIC
  | 'my_number'        // Japan My Number
  | 'emirates_id'      // UAE Emirates ID
  | 'tfn'              // Australia TFN
  | 'passport'         // Universal fallback
  | 'driving_license'; // Universal fallback

/** Liveness verification method */
export type LivenessMethod =
  | 'video_selfie'        // Active liveness — recorded video selfie
  | 'passive_liveness'    // Passive liveness — single photo with AI analysis
  | 'nfc_chip'            // NFC chip read from ePassport / national ID
  | 'provider_session';   // Provider-managed liveness session (Persona, Onfido, etc.)

// =============================================================================
// KYC RESULT (output)
// =============================================================================

export type KYCStatus = 'approved' | 'denied' | 'pending_review' | 'manual_review' | 'expired';

export interface KYCResult {
  /** Unique evaluation token / ID for status lookups */
  token: string;
  /** Verification decision */
  status: KYCStatus;
  /** Human-readable reasons for the decision (e.g. "Address mismatch") */
  reasons: string[];
  /** ISO 8601 timestamp of when the evaluation was created */
  createdAt: string;
  /** ISO 8601 timestamp of when the evaluation was last updated */
  updatedAt: string;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface KYCAdapter {
  /** Unique adapter identifier (e.g. "alloy", "mock") */
  readonly name: string;

  /**
   * Submit an identity evaluation for a new applicant.
   * SSN is sent to the provider but MUST NOT be logged or returned.
   */
  createEvaluation(applicant: KYCApplicant): Promise<KYCResult>;

  /**
   * Retrieve the current status of a previously submitted evaluation.
   */
  getEvaluation(evaluationToken: string): Promise<KYCResult>;

  // ---------------------------------------------------------------------------
  // PERPETUAL KYC (optional — providers that support ongoing refresh)
  // ---------------------------------------------------------------------------

  /**
   * Refresh an existing evaluation to check for changes in identity data.
   * Used for perpetual KYC to keep customer information current.
   */
  refreshEvaluation?(evaluationToken: string, config: KYCRefreshConfig): Promise<KYCRefreshResult>;

  /**
   * Configure automatic refresh schedule for an evaluation.
   */
  configureRefresh?(evaluationToken: string, config: KYCRefreshConfig): Promise<{ configured: boolean; nextRefreshAt: string }>;
}

// =============================================================================
// PERPETUAL KYC TYPES
// =============================================================================

/**
 * Perpetual KYC — automatically refreshes customer identity data to prevent
 * risk from stale information. Adapters that support pKYC implement the
 * optional methods in KYCAdapter below.
 */

export type RefreshTrigger = 'scheduled' | 'event_driven' | 'risk_based' | 'manual';

export interface KYCRefreshResult {
  /** Unique refresh ID */
  refreshId: string;
  /** Original evaluation token being refreshed */
  evaluationToken: string;
  /** What triggered this refresh */
  trigger: RefreshTrigger;
  /** New status after refresh */
  status: KYCStatus;
  /** What changed (empty if nothing changed) */
  changes: string[];
  /** Risk score (0-100, higher = riskier) */
  riskScore: number;
  /** ISO 8601 timestamp of the refresh */
  refreshedAt: string;
  /** ISO 8601 timestamp of the next scheduled refresh */
  nextRefreshAt: string | null;
}

export interface KYCRefreshConfig {
  /** How often to refresh (in hours, default 720 = 30 days) */
  intervalHours: number;
  /** What triggers a refresh */
  triggers: RefreshTrigger[];
  /** Risk score threshold for auto-escalation (0-100) */
  riskThreshold: number;
  /** Whether to auto-deny on high-risk refresh results */
  autoDenyOnHighRisk: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Mask an SSN for display purposes: "123-45-6789" → "***-**-6789"
 * Only the last 4 digits are shown.
 */
export function maskSSN(ssn: string): string {
  const digits = ssn.replace(/\D/g, '');
  if (digits.length < 4) return '***-**-****';
  const last4 = digits.slice(-4);
  return `***-**-${last4}`;
}
