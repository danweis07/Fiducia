/**
 * Confirmation of Payee (CoP) Adapter Interface
 *
 * Implements name-account verification mandated by:
 *   - UK Pay.UK CoP (Faster Payments / CHAPS)
 *   - EU SEPA Verification of Payee (VoP) — EPC regulation
 *   - Brazil Pix DICT key ownership
 *   - India UPI VPA resolution
 *
 * Prevents Authorised Push Payment (APP) fraud by confirming
 * the legal name of an account holder before funds are sent.
 *
 * Implementations:
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// TYPES
// =============================================================================

/** Supported CoP schemes */
export type CoPScheme =
  | 'uk_cop'          // UK Pay.UK Confirmation of Payee
  | 'sepa_vop'        // EU SEPA Verification of Payee
  | 'pix_dict'        // Brazil Pix DICT key lookup
  | 'upi_vpa'         // India UPI VPA resolution
  | 'generic';        // Other / custom

/** CoP match result */
export type CoPMatchResult =
  | 'exact_match'        // Name matches exactly
  | 'close_match'        // Name is similar (e.g. abbreviations, middle name variance)
  | 'no_match'           // Name does not match at all
  | 'account_not_found'  // Account/IBAN/VPA does not exist
  | 'opted_out'          // Account holder opted out of CoP
  | 'unavailable';       // Receiving institution does not support CoP

/** Account identifier type for the verification request */
export type CoPAccountIdentifierType =
  | 'iban'
  | 'sort_code_account'   // UK sort code + account number
  | 'routing_account'     // US routing + account number
  | 'pix_key'
  | 'upi_vpa'
  | 'bic_account';

// =============================================================================
// DATA MODELS
// =============================================================================

export interface CoPVerificationResult {
  /** Unique verification ID */
  verificationId: string;
  /** Which CoP scheme was used */
  scheme: CoPScheme;
  /** Match result */
  matchResult: CoPMatchResult;
  /** Verified legal name of the account holder (only on exact/close match) */
  verifiedName: string | null;
  /** Name the user provided for comparison */
  providedName: string;
  /** Reason for close match (e.g. "Name differs: provided 'John Smith', registered 'J Smith'") */
  closeMatchReason: string | null;
  /** Name of the receiving institution */
  receivingInstitution: string | null;
  /** ISO 8601 timestamp of the verification */
  verifiedAt: string;
  /** Response code from the receiving institution */
  responseCode: string | null;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface VerifyPayeeRequest {
  tenantId: string;
  /** CoP scheme to use (auto-detected from account type if omitted) */
  scheme?: CoPScheme;
  /** Name the sender expects the account to belong to */
  payeeName: string;

  // --- Account identifiers (provide one set) ---

  /** IBAN (SEPA / EU) */
  iban?: string;
  /** BIC / SWIFT (SEPA) */
  bic?: string;
  /** UK sort code */
  sortCode?: string;
  /** Account number (UK / US) */
  accountNumber?: string;
  /** Routing number (US) */
  routingNumber?: string;
  /** Pix key value */
  pixKey?: string;
  /** Pix key type */
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';
  /** UPI Virtual Payment Address */
  vpa?: string;
}

export interface VerifyPayeeResponse {
  verification: CoPVerificationResult;
}

export interface GetVerificationRequest {
  tenantId: string;
  verificationId: string;
}

export interface GetVerificationResponse {
  verification: CoPVerificationResult;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Confirmation of Payee adapter — verifies account holder name
 * before payment execution to prevent APP fraud.
 */
export interface ConfirmationOfPayeeAdapter extends BaseAdapter {
  /** Verify the payee name against the account holder's registered name */
  verifyPayee(request: VerifyPayeeRequest): Promise<VerifyPayeeResponse>;

  /** Retrieve a previous verification result */
  getVerification(request: GetVerificationRequest): Promise<GetVerificationResponse>;
}
