/**
 * Digital Activation Domain Types
 *
 * Types for the digital activation flow — existing members activating
 * online banking access. Includes tenant-configurable identity verification,
 * credential setup, MFA enrollment, device registration, and terms acceptance.
 *
 * Data Classification:
 *   - restricted: PII fields (SSN, DOB, account numbers)
 *   - confidential: Activation status, device fingerprints
 *   - internal: Configuration, terms metadata
 */

// =============================================================================
// ACTIVATION STATUS
// =============================================================================

export type ActivationStatus =
  | 'not_started'
  | 'identity_verified'
  | 'terms_accepted'
  | 'credentials_created'
  | 'mfa_enrolled'
  | 'device_registered'
  | 'completed'
  | 'locked'       // Too many failed attempts
  | 'expired';     // Session timed out

export type ActivationStepId =
  | 'identity'
  | 'terms'
  | 'credentials'
  | 'mfa'
  | 'device'
  | 'complete';

export interface ActivationStep {
  id: ActivationStepId;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  required: boolean;
}

// =============================================================================
// TENANT ACTIVATION CONFIGURATION (backend-driven)
// =============================================================================

/** Tenant-configurable identity verification fields */
export interface IdentityVerificationConfig {
  /** Which fields are required for identity verification */
  requiredFields: IdentityField[];
  /** Maximum failed verification attempts before lockout */
  maxAttempts: number;
  /** Lockout duration in minutes after max attempts */
  lockoutMinutes: number;
}

export type IdentityField =
  | 'accountNumber'
  | 'ssn'        // Last 4 or full, per tenant config
  | 'dateOfBirth'
  | 'email'
  | 'phone'
  | 'zipCode'
  | 'lastName';

/** Tenant-configurable credential (username/password) rules */
export interface CredentialRulesConfig {
  /** Username format rules */
  username: {
    minLength: number;
    maxLength: number;
    /** Whether email can be used as username */
    allowEmail: boolean;
    /** Regex pattern for allowed characters */
    pattern: string;
    /** Human-readable description of pattern */
    patternDescription: string;
  };
  /** Password strength rules */
  password: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigit: boolean;
    requireSpecialChar: boolean;
    /** Characters considered "special" */
    specialChars: string;
    /** Disallow username in password */
    disallowUsername: boolean;
    /** Number of previous passwords to check against */
    historyCount: number;
  };
  /** Passkey / passwordless sign-in options */
  passkey: PasskeyConfig;
}

/** Tenant-configurable passkey & biometric authentication */
export interface PasskeyConfig {
  /** Whether passkey registration is offered during activation */
  enabled: boolean;
  /** Allow passkey as primary sign-in (passwordless) */
  allowPasswordless: boolean;
  /** Relying party ID (typically the tenant's domain) */
  rpId: string;
  /** Relying party display name */
  rpName: string;
  /** Supported authenticator attachment: platform (biometric), cross-platform (security key), or both */
  authenticatorAttachment: 'platform' | 'cross-platform' | 'all';
  /** Require resident key (discoverable credential) */
  requireResidentKey: boolean;
  /** User verification preference */
  userVerification: 'required' | 'preferred' | 'discouraged';
  /** Attestation conveyance preference */
  attestation: 'none' | 'indirect' | 'direct';
}

/** Tenant-configurable MFA enrollment rules */
export interface MFAConfig {
  /** Whether MFA is required during activation */
  required: boolean;
  /** Allowed MFA methods */
  allowedMethods: MFAMethod[];
  /** Default method if multiple are available */
  defaultMethod: MFAMethod;
  /** Whether to allow backup codes */
  allowBackupCodes: boolean;
  /** Number of backup codes to generate */
  backupCodeCount: number;
}

export type MFAMethod = 'sms' | 'email' | 'totp' | 'push' | 'passkey' | 'biometric';

/** Tenant-configurable device registration rules */
export interface DeviceRegistrationConfig {
  /** Whether device registration is required */
  required: boolean;
  /** Maximum registered devices per member */
  maxDevices: number;
  /** Whether to collect device fingerprint */
  collectFingerprint: boolean;
  /** Days before device trust expires */
  trustDurationDays: number;
}

/** Full tenant activation configuration — returned by activation.config */
export interface ActivationConfig {
  tenantId: string;
  tenantName: string;
  identity: IdentityVerificationConfig;
  credentials: CredentialRulesConfig;
  mfa: MFAConfig;
  /** Passkey / biometric authentication config */
  passkey: PasskeyConfig;
  device: DeviceRegistrationConfig;
  /** Active terms/disclosures the member must accept */
  terms: TermsDocument[];
  /** Session timeout for activation flow in minutes */
  sessionTimeoutMinutes: number;
}

// =============================================================================
// TERMS & DISCLOSURES (versioned, admin-managed)
// =============================================================================

export type TermsDocumentType =
  | 'digital_banking_agreement'
  | 'electronic_disclosure'
  | 'privacy_policy'
  | 'data_sharing_consent';

export interface TermsDocument {
  id: string;
  tenantId: string;
  type: TermsDocumentType;
  title: string;
  /** The full document content (HTML or plain text) */
  content: string;
  /** Semantic version (e.g. "2.1.0") */
  version: string;
  /** Whether this version is the currently active version */
  isActive: boolean;
  /** Whether acceptance is mandatory for digital activation */
  mandatory: boolean;
  /** When this version was published */
  publishedAt: string;
  /** Admin who published this version */
  publishedBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Admin view: version history for a terms document */
export interface TermsVersionSummary {
  id: string;
  version: string;
  isActive: boolean;
  publishedAt: string;
  publishedBy: string;
  /** Number of members who accepted this version */
  acceptanceCount: number;
}

/** Member's acceptance record */
export interface TermsAcceptance {
  id: string;
  userId: string;
  tenantId: string;
  documentId: string;
  documentType: TermsDocumentType;
  /** The version that was accepted */
  versionAccepted: string;
  /** Whether this acceptance is still current (not superseded by a new version) */
  isCurrent: boolean;
  acceptedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

// =============================================================================
// IDENTITY VERIFICATION
// =============================================================================

/** @classification restricted — contains PII */
export interface IdentityVerificationRequest {
  /** @pii Last 4 of SSN or full SSN depending on tenant config */
  ssn?: string;
  /** @pii Account number at the institution */
  accountNumber?: string;
  /** @pii Date of birth (YYYY-MM-DD) */
  dateOfBirth?: string;
  /** @pii Email on file */
  email?: string;
  /** @pii Phone on file */
  phone?: string;
  /** @pii ZIP code */
  zipCode?: string;
  /** @pii Last name */
  lastName?: string;
}

export interface IdentityVerificationResult {
  verified: boolean;
  /** Masked member info returned on success for confirmation */
  memberInfo?: {
    firstNameInitial: string;
    lastNameMasked: string;
    emailMasked: string;
    accountNumberMasked: string;
  };
  /** Remaining attempts before lockout */
  attemptsRemaining: number;
  /** If locked out, when the lockout expires */
  lockedUntil?: string;
  /** Activation token for subsequent steps (only on success) */
  activationToken?: string;
}

// =============================================================================
// CREDENTIAL CREATION
// =============================================================================

export interface CredentialCreateRequest {
  activationToken: string;
  username: string;
  password: string;
}

export interface CredentialCreateResult {
  success: boolean;
  /** Validation errors if any */
  errors?: {
    field: 'username' | 'password';
    message: string;
  }[];
}

// =============================================================================
// MFA ENROLLMENT
// =============================================================================

export interface MFAEnrollRequest {
  activationToken: string;
  method: MFAMethod;
  /** Phone number for SMS, email for email method */
  destination?: string;
}

export interface MFAEnrollResult {
  enrollmentId: string;
  method: MFAMethod;
  /** For TOTP: the provisioning URI / secret */
  totpSecret?: string;
  totpUri?: string;
  /** For SMS/email: masked destination showing where code was sent */
  destinationMasked?: string;
  /** Backup codes (only returned once, on initial enrollment) */
  backupCodes?: string[];
}

export interface MFAVerifyRequest {
  activationToken: string;
  enrollmentId: string;
  code: string;
}

export interface MFAVerifyResult {
  verified: boolean;
  attemptsRemaining: number;
}

// =============================================================================
// PASSKEY / WEBAUTHN ENROLLMENT
// =============================================================================

/** WebAuthn credential creation options sent from server */
export interface PasskeyRegistrationOptions {
  /** Base64url-encoded challenge from the server */
  challenge: string;
  /** Relying party info */
  rp: { id: string; name: string };
  /** User entity (id is opaque, no PII) */
  user: { id: string; name: string; displayName: string };
  /** Allowed public key credential parameters */
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
  /** Timeout in milliseconds */
  timeout: number;
  /** Authenticator selection criteria */
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    residentKey: 'required' | 'preferred' | 'discouraged';
    userVerification: 'required' | 'preferred' | 'discouraged';
  };
  /** Attestation preference */
  attestation: 'none' | 'indirect' | 'direct';
  /** Exclude existing credentials to prevent re-registration */
  excludeCredentials: Array<{ type: 'public-key'; id: string }>;
}

/** Client sends this after navigator.credentials.create() succeeds */
export interface PasskeyRegistrationResponse {
  activationToken: string;
  credentialId: string;
  /** Base64url-encoded attestation object */
  attestationObject: string;
  /** Base64url-encoded client data JSON */
  clientDataJSON: string;
  /** Authenticator attachment used */
  authenticatorAttachment?: 'platform' | 'cross-platform';
  /** Transports supported by the authenticator */
  transports?: Array<'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid'>;
  /** Human-friendly name for this passkey */
  deviceName: string;
}

export interface PasskeyRegistrationResult {
  credentialId: string;
  registered: boolean;
  /** Whether this credential supports biometric verification */
  isBiometric: boolean;
  /** Display name for the registered passkey */
  deviceName: string;
}

// =============================================================================
// DEVICE REGISTRATION
// =============================================================================

/** @classification confidential */
export interface DeviceFingerprint {
  /** Browser/app-generated device ID */
  deviceId: string;
  /** User agent string */
  userAgent: string;
  /** Platform (web, ios, android) */
  platform: 'web' | 'ios' | 'android';
  /** Screen resolution */
  screenResolution?: string;
  /** Timezone */
  timezone?: string;
  /** Language */
  language?: string;
}

export interface DeviceRegisterRequest {
  activationToken: string;
  device: DeviceFingerprint;
  /** Human-friendly device name (e.g. "Chrome on MacBook") */
  deviceName: string;
}

export interface DeviceRegisterResult {
  deviceId: string;
  trusted: boolean;
  trustedUntil: string;
}

// =============================================================================
// ACTIVATION SESSION
// =============================================================================

/** Tracks the overall activation flow progress */
export interface ActivationSession {
  activationToken: string;
  status: ActivationStatus;
  currentStep: ActivationStepId;
  steps: ActivationStep[];
  /** Member info (masked) after identity verification */
  memberInfo?: IdentityVerificationResult['memberInfo'];
  /** Expires at ISO timestamp */
  expiresAt: string;
  createdAt: string;
}
