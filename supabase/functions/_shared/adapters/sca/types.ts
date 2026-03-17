/**
 * Strong Customer Authentication (SCA) Adapter Interface
 *
 * Implements PSD2 / PSD3 Strong Customer Authentication requirements for the EU/EEA.
 * SCA mandates two of three authentication factors for electronic payments:
 *   1. Knowledge (something you know — PIN, password)
 *   2. Possession (something you have — device, hardware token)
 *   3. Inherence (something you are — biometrics, behavioral)
 *
 * Also supports:
 *   - Transaction Risk Analysis (TRA) exemptions
 *   - Low-value payment exemptions
 *   - Trusted beneficiary lists
 *   - Dynamic linking (amount + payee bound to auth code)
 *
 * Implementations:
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// TYPES
// =============================================================================

/** SCA authentication factor categories (PSD2 Art. 4(30)) */
export type SCAFactor = 'knowledge' | 'possession' | 'inherence';

/** SCA challenge method */
export type SCAChallengeMethod =
  | 'push_notification'     // Mobile push with biometric confirmation
  | 'sms_otp'               // One-time passcode via SMS
  | 'totp'                  // Time-based one-time password (authenticator app)
  | 'hardware_token'        // Physical security key (FIDO2 / U2F)
  | 'biometric'             // Device-bound biometric (Face ID, fingerprint)
  | 'behavioral_biometric'; // Passive behavioral analysis

/** SCA challenge status */
export type SCAChallengeStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

/** SCA exemption type (PSD2 RTS Art. 10-18) */
export type SCAExemptionType =
  | 'low_value'                // < €30 (cumulative max €100 or 5 txns)
  | 'trusted_beneficiary'     // Payee on user's trusted list
  | 'recurring_payment'       // Same amount, same payee, recurring
  | 'transaction_risk_analysis' // TRA — based on fraud rate thresholds
  | 'secure_corporate'        // Dedicated corporate payment protocols
  | 'merchant_initiated';     // Merchant-initiated transaction (MIT)

/** Outcome of the SCA process */
export type SCAOutcome = 'authenticated' | 'denied' | 'exempted' | 'stepped_up';

// =============================================================================
// DATA MODELS
// =============================================================================

export interface SCAChallenge {
  /** Unique challenge ID */
  challengeId: string;
  /** User ID */
  userId: string;
  /** Method used for this challenge */
  method: SCAChallengeMethod;
  /** Factors satisfied by this method */
  factorsSatisfied: SCAFactor[];
  /** Current status */
  status: SCAChallengeStatus;
  /** Created timestamp */
  createdAt: string;
  /** Expiry timestamp */
  expiresAt: string;
  /** Completed timestamp */
  completedAt: string | null;
}

export interface SCAResult {
  /** Overall SCA outcome */
  outcome: SCAOutcome;
  /** Challenge details (null if exempted) */
  challenge: SCAChallenge | null;
  /** Exemption type if exempted */
  exemption: SCAExemptionType | null;
  /** Factors that were verified */
  factorsVerified: SCAFactor[];
  /** Authorization code for dynamic linking (bound to amount + payee) */
  authorizationCode: string | null;
  /** Timestamp */
  decidedAt: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface InitiateSCARequest {
  tenantId: string;
  userId: string;
  /** Action requiring SCA */
  action: 'payment' | 'login' | 'beneficiary_add' | 'card_activation' | 'profile_change';
  /** Preferred challenge method (user preference) */
  preferredMethod?: SCAChallengeMethod;

  // --- Dynamic linking fields (for payments) ---

  /** Payment amount in minor currency units */
  amountMinorUnits?: number;
  /** Currency code */
  currency?: string;
  /** Payee name (bound to auth code) */
  payeeName?: string;
  /** Payee account identifier (IBAN, account number, etc.) */
  payeeAccountIdentifier?: string;
}

export interface InitiateSCAResponse {
  challenge: SCAChallenge;
}

export interface CompleteSCARequest {
  tenantId: string;
  challengeId: string;
  /** Proof of authentication (OTP code, FIDO assertion, biometric token, etc.) */
  authenticationProof: string;
}

export interface CompleteSCAResponse {
  result: SCAResult;
}

export interface CheckExemptionRequest {
  tenantId: string;
  userId: string;
  /** Exemption type to check */
  exemptionType: SCAExemptionType;
  /** Payment amount in minor units (for low_value / TRA checks) */
  amountMinorUnits?: number;
  /** Currency */
  currency?: string;
  /** Payee identifier (for trusted_beneficiary check) */
  payeeAccountIdentifier?: string;
}

export interface CheckExemptionResponse {
  /** Whether the exemption applies */
  exempt: boolean;
  /** Exemption type */
  exemptionType: SCAExemptionType;
  /** Reason if not exempt */
  reason: string | null;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Strong Customer Authentication adapter — handles PSD2/PSD3 SCA flows
 * including challenge issuance, verification, and exemption checks.
 */
export interface SCAAdapter extends BaseAdapter {
  /** Initiate an SCA challenge for a user action */
  initiateChallenge(request: InitiateSCARequest): Promise<InitiateSCAResponse>;

  /** Complete an SCA challenge with authentication proof */
  completeChallenge(request: CompleteSCARequest): Promise<CompleteSCAResponse>;

  /** Check if an SCA exemption applies */
  checkExemption(request: CheckExemptionRequest): Promise<CheckExemptionResponse>;
}
