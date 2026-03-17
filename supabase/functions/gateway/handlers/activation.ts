/**
 * Digital Activation Handlers
 *
 * Gateway handlers for the digital banking activation flow.
 * This is for EXISTING bank members activating online/digital banking access —
 * it is NOT account opening.
 *
 * IMPORTANT: PII (SSN, account numbers, passwords, email, phone, DOB) is NEVER logged
 * or returned unmasked in responses.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { tSync } from '../../_shared/i18n/index.ts';

// =============================================================================
// HELPERS
// =============================================================================

/** Mask an SSN to show only last 4 digits. */
function maskSSN(ssn: string): string {
  if (!ssn || ssn.length < 4) return '****';
  return `***-**-${ssn.slice(-4)}`;
}

/** Mask an account number to show only last 4 digits. */
function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return `****${accountNumber.slice(-4)}`;
}

/** Mask an email address. */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '****@****.***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2
    ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
    : '*'.repeat(local.length);
  return `${maskedLocal}@${domain}`;
}

/** Mask a phone number to show only last 4 digits. */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '****';
  return `***-***-${phone.replace(/\D/g, '').slice(-4)}`;
}

/** Structured JSON log entry — NEVER includes PII. */
function log(
  level: 'info' | 'warn' | 'error',
  handler: string,
  userId: string | undefined,
  extra: Record<string, unknown> = {}
): void {
  console.warn(JSON.stringify({
    level,
    handler,
    userId: userId ?? null,
    timestamp: new Date().toISOString(),
    ...extra,
  }));
}

// FIXME: In-memory mock stores — lost on serverless cold start and not shared
// across instances. Migrate to PostgreSQL tables before production deployment.
const activationSessions = new Map<string, {
  verified: boolean;
  termsAccepted: boolean;
  credentialsCreated: boolean;
  mfaEnrolled: boolean;
  deviceRegistered: boolean;
  firmId?: string;
  userId?: string;
  createdAt: string;
}>();

const termsDocuments = new Map<string, {
  id: string;
  type: string;
  title: string;
  content: string;
  version: string;
  mandatory: boolean;
  active: boolean;
  createdAt: string;
  firmId: string;
}>();

const termsAcceptances = new Map<string, {
  userId: string;
  documentId: string;
  version: string;
  acceptedAt: string;
}[]>();

// =============================================================================
// PASSWORD POLICY (loaded from DB, with hardcoded fallback)
// =============================================================================

interface PasswordPolicyRow {
  username_min_length: number;
  username_max_length: number;
  username_allow_email: boolean;
  username_pattern: string;
  username_pattern_description: string;
  password_min_length: number;
  password_max_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_digit: boolean;
  require_special_char: boolean;
  special_chars: string;
  disallow_username: boolean;
  password_history_count: number;
  password_expiry_days: number;
  max_failed_attempts: number;
  lockout_duration_minutes: number;
}

const DEFAULT_POLICY: PasswordPolicyRow = {
  username_min_length: 6,
  username_max_length: 32,
  username_allow_email: false,
  username_pattern: '^[a-zA-Z0-9_]+$',
  username_pattern_description: 'Alphanumeric characters and underscores only',
  password_min_length: 8,
  password_max_length: 128,
  require_uppercase: true,
  require_lowercase: true,
  require_digit: true,
  require_special_char: true,
  special_chars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  disallow_username: true,
  password_history_count: 0,
  password_expiry_days: 0,
  max_failed_attempts: 5,
  lockout_duration_minutes: 30,
};

/** Load password policy from DB, fall back to defaults */
async function loadPasswordPolicy(ctx: GatewayContext): Promise<PasswordPolicyRow> {
  if (!ctx.firmId) return DEFAULT_POLICY;

  const { data } = await ctx.db
    .from('banking_password_policies')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .single();

  if (!data) return DEFAULT_POLICY;
  return data as PasswordPolicyRow;
}

/** Convert DB policy row to the credential rules config shape for the frontend */
function policyToCredentialRules(policy: PasswordPolicyRow) {
  return {
    username: {
      minLength: policy.username_min_length,
      maxLength: policy.username_max_length,
      allowEmail: policy.username_allow_email,
      pattern: policy.username_pattern,
      patternDescription: policy.username_pattern_description,
    },
    password: {
      minLength: policy.password_min_length,
      maxLength: policy.password_max_length,
      requireUppercase: policy.require_uppercase,
      requireLowercase: policy.require_lowercase,
      requireDigit: policy.require_digit,
      requireSpecial: policy.require_special_char,
      specialCharacters: policy.special_chars,
      disallowUsername: policy.disallow_username,
      historyCount: policy.password_history_count,
      expiryDays: policy.password_expiry_days,
    },
  };
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

async function getDefaultConfig(ctx: GatewayContext) {
  const policy = await loadPasswordPolicy(ctx);
  const credentialRules = policyToCredentialRules(policy);

  return {
    tenantId: ctx.firmId ?? 'default',
    identityVerification: {
      requiredFields: ['accountNumber', 'ssn', 'dateOfBirth', 'lastName'],
      maxAttempts: policy.max_failed_attempts,
      lockoutDurationMinutes: policy.lockout_duration_minutes,
    },
    credentialRules,
    mfa: {
      required: true,
      allowedMethods: ['sms', 'email', 'totp'] as string[],
      defaultMethod: 'sms',
      backupCodes: {
        enabled: true,
        count: 10,
      },
    },
    deviceRegistration: {
      required: true,
      maxDevices: 5,
      fingerprintCollection: true,
      trustDurationDays: 90,
    },
    terms: [
      {
        documentId: 'digital_banking_agreement',
        type: 'digital_banking_agreement',
        title: 'Digital Banking Agreement',
        version: '1.0.0',
        mandatory: true,
        content: 'By enrolling in Digital Banking, you agree to the terms and conditions governing electronic access to your accounts. This agreement covers online and mobile banking services, electronic statements, and related features provided by your financial institution.',
      },
      {
        documentId: 'electronic_disclosure',
        type: 'electronic_disclosure',
        title: 'Electronic Disclosure and Consent',
        version: '1.0.0',
        mandatory: true,
        content: 'You consent to receive account statements, notices, disclosures, and other communications electronically. You confirm that you have the hardware and software necessary to access electronic communications and that you may withdraw this consent at any time by contacting your financial institution.',
      },
    ],
    sessionTimeoutMinutes: 15,
  };
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * activation.getConfig — Returns tenant-configurable activation settings
 */
export async function getActivationConfig(ctx: GatewayContext): Promise<GatewayResponse> {
  log('info', 'activation.getConfig', ctx.userId, { firmId: ctx.firmId ?? null });

  const config = await getDefaultConfig(ctx);

  return {
    data: config,
  };
}

/**
 * activation.verifyIdentity — Validates member identity against core banking records
 *
 * NEVER logs raw PII — only masked values.
 */
export async function verifyIdentity(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const config = await getDefaultConfig(ctx);
  const requiredFields = config.identityVerification.requiredFields;

  // Validate required fields are present
  const missingFields: string[] = [];
  for (const field of requiredFields) {
    if (!params[field]) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    log('warn', 'activation.verifyIdentity', ctx.userId, {
      event: 'missing_fields',
      missingFields,
    });
    return {
      error: {
        code: 'BAD_REQUEST',
        message: `Missing required fields: ${missingFields.join(', ')}`,
      },
      status: 400,
    };
  }

  // Log verification attempt WITHOUT PII
  const logExtra: Record<string, unknown> = {
    event: 'identity_verification_attempt',
    firmId: ctx.firmId ?? null,
  };
  if (params.ssn) {
    logExtra.ssnMasked = maskSSN(params.ssn as string);
  }
  if (params.accountNumber) {
    logExtra.accountNumberMasked = maskAccountNumber(params.accountNumber as string);
  }
  log('info', 'activation.verifyIdentity', ctx.userId, logExtra);

  // Mock mode: accept any input as valid
  const activationToken = crypto.randomUUID();
  const lastName = (params.lastName as string) ?? '';
  const email = (params.email as string) ?? '';
  const accountNumber = (params.accountNumber as string) ?? '';

  // Store session state
  activationSessions.set(activationToken, {
    verified: true,
    termsAccepted: false,
    credentialsCreated: false,
    mfaEnrolled: false,
    deviceRegistered: false,
    firmId: ctx.firmId,
    userId: ctx.userId,
    createdAt: new Date().toISOString(),
  });

  log('info', 'activation.verifyIdentity', ctx.userId, {
    event: 'identity_verified',
    activationToken,
  });

  return {
    data: {
      verified: true,
      memberInfo: {
        firstNameInitial: params.firstName
          ? (params.firstName as string).charAt(0).toUpperCase()
          : undefined,
        lastNameMasked: lastName.length > 1
          ? `${lastName.charAt(0)}${'*'.repeat(lastName.length - 1)}`
          : lastName,
        emailMasked: email ? maskEmail(email) : undefined,
        accountNumberMasked: accountNumber ? maskAccountNumber(accountNumber) : undefined,
      },
      attemptsRemaining: config.identityVerification.maxAttempts - 1,
      activationToken,
    },
  };
}

/**
 * activation.acceptTerms — Records member acceptance of terms/disclosures
 */
export async function acceptTerms(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const activationToken = params.activationToken as string;
  const acceptances = params.acceptances as Array<{ documentId: string; version: string }>;

  if (!activationToken) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required field: activationToken' },
      status: 400,
    };
  }

  const session = activationSessions.get(activationToken);
  if (!session) {
    return {
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired activation token' },
      status: 401,
    };
  }

  if (!acceptances || !Array.isArray(acceptances) || acceptances.length === 0) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required field: acceptances' },
      status: 400,
    };
  }

  const now = new Date().toISOString();
  const acceptedDocuments = acceptances.map((a) => ({
    documentId: a.documentId,
    version: a.version,
    acceptedAt: now,
  }));

  // Update session
  session.termsAccepted = true;
  activationSessions.set(activationToken, session);

  // Store acceptances for later query
  const userId = session.userId ?? activationToken;
  const existing = termsAcceptances.get(userId) ?? [];
  for (const doc of acceptedDocuments) {
    existing.push({
      userId,
      documentId: doc.documentId,
      version: doc.version,
      acceptedAt: doc.acceptedAt,
    });
  }
  termsAcceptances.set(userId, existing);

  // Audit log
  log('info', 'activation.acceptTerms', ctx.userId, {
    event: 'terms_accepted',
    activationToken,
    documents: acceptedDocuments.map((d) => ({
      documentId: d.documentId,
      version: d.version,
    })),
  });

  return {
    data: {
      accepted: true,
      documents: acceptedDocuments,
    },
  };
}

/**
 * activation.createCredentials — Sets up username and password
 *
 * NEVER logs the password.
 */
export async function createCredentials(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const activationToken = params.activationToken as string;
  const username = params.username as string;
  const password = params.password as string;

  if (!activationToken) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required field: activationToken' },
      status: 400,
    };
  }

  const session = activationSessions.get(activationToken);
  if (!session) {
    return {
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired activation token' },
      status: 401,
    };
  }

  const config = await getDefaultConfig(ctx);
  const errors: Array<{ field: string; code: string; message: string }> = [];

  // --- Username validation ---
  if (!username) {
    errors.push({ field: 'username', code: 'REQUIRED', message: 'Username is required' });
  } else {
    const rules = config.credentialRules.username;
    if (username.length < rules.minLength) {
      errors.push({
        field: 'username',
        code: 'TOO_SHORT',
        message: `Username must be at least ${rules.minLength} characters`,
      });
    }
    if (username.length > rules.maxLength) {
      errors.push({
        field: 'username',
        code: 'TOO_LONG',
        message: `Username must be at most ${rules.maxLength} characters`,
      });
    }
    if (!new RegExp(rules.pattern).test(username)) {
      errors.push({
        field: 'username',
        code: 'INVALID_FORMAT',
        message: rules.patternDescription,
      });
    }
    // Mock availability check
    if (username.toLowerCase() === 'taken') {
      errors.push({
        field: 'username',
        code: 'UNAVAILABLE',
        message: 'This username is already taken',
      });
    }
  }

  // --- Password validation ---
  if (!password) {
    errors.push({ field: 'password', code: 'REQUIRED', message: 'Password is required' });
  } else {
    const rules = config.credentialRules.password;
    if (password.length < rules.minLength) {
      errors.push({
        field: 'password',
        code: 'TOO_SHORT',
        message: `Password must be at least ${rules.minLength} characters`,
      });
    }
    if (password.length > rules.maxLength) {
      errors.push({
        field: 'password',
        code: 'TOO_LONG',
        message: `Password must be at most ${rules.maxLength} characters`,
      });
    }
    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        code: 'MISSING_UPPERCASE',
        message: 'Password must contain at least one uppercase letter',
      });
    }
    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        code: 'MISSING_LOWERCASE',
        message: 'Password must contain at least one lowercase letter',
      });
    }
    if (rules.requireDigit && !/[0-9]/.test(password)) {
      errors.push({
        field: 'password',
        code: 'MISSING_DIGIT',
        message: 'Password must contain at least one digit',
      });
    }
    if (rules.requireSpecial) {
      // Build regex from configured special characters
      const specialChars = rules.specialCharacters ?? '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const escaped = specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const specialRegex = new RegExp(`[${escaped}]`);
      if (!specialRegex.test(password)) {
        errors.push({
          field: 'password',
          code: 'MISSING_SPECIAL',
          message: `Password must contain at least one special character (${specialChars})`,
        });
      }
    }
    if (rules.disallowUsername && username && password.toLowerCase().includes(username.toLowerCase())) {
      errors.push({
        field: 'password',
        code: 'CONTAINS_USERNAME',
        message: 'Password must not contain your username',
      });
    }
  }

  if (errors.length > 0) {
    // Log failure WITHOUT the password
    log('warn', 'activation.createCredentials', ctx.userId, {
      event: 'credential_validation_failed',
      activationToken,
      errorCodes: errors.map((e) => e.code),
    });

    return {
      data: {
        success: false,
        errors,
      },
    };
  }

  // Update session
  session.credentialsCreated = true;
  activationSessions.set(activationToken, session);

  // Log success WITHOUT the password
  log('info', 'activation.createCredentials', ctx.userId, {
    event: 'credentials_created',
    activationToken,
    usernameLength: username.length,
  });

  return {
    data: {
      success: true,
    },
  };
}

/**
 * activation.enrollMFA — Initiates MFA enrollment
 */
export async function enrollMFA(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const activationToken = params.activationToken as string;
  const method = params.method as string;
  const destination = params.destination as string | undefined;

  if (!activationToken) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required field: activationToken' },
      status: 400,
    };
  }

  const session = activationSessions.get(activationToken);
  if (!session) {
    return {
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired activation token' },
      status: 401,
    };
  }

  const config = await getDefaultConfig(ctx);

  if (!method || !config.mfa.allowedMethods.includes(method)) {
    return {
      error: {
        code: 'BAD_REQUEST',
        message: `Invalid MFA method. Allowed: ${config.mfa.allowedMethods.join(', ')}`,
      },
      status: 400,
    };
  }

  const enrollmentId = crypto.randomUUID();
  const responseData: Record<string, unknown> = {
    enrollmentId,
    method,
  };

  if (method === 'sms') {
    if (!destination) {
      return {
        error: { code: 'BAD_REQUEST', message: 'Phone number is required for SMS MFA' },
        status: 400,
      };
    }
    // Basic phone validation
    const digits = destination.replace(/\D/g, '');
    if (digits.length < 10) {
      return {
        error: { code: 'BAD_REQUEST', message: 'Invalid phone number format' },
        status: 400,
      };
    }
    responseData.destination = maskPhone(destination);
    responseData.codeSent = true;
  } else if (method === 'email') {
    if (!destination) {
      return {
        error: { code: 'BAD_REQUEST', message: 'Email address is required for email MFA' },
        status: 400,
      };
    }
    if (!destination.includes('@')) {
      return {
        error: { code: 'BAD_REQUEST', message: 'Invalid email address format' },
        status: 400,
      };
    }
    responseData.destination = maskEmail(destination);
    responseData.codeSent = true;
  } else if (method === 'totp') {
    // Generate mock TOTP secret and provisioning URI
    // DEMO ONLY: Well-known example TOTP secret. Never use in production — generate per-user secrets via a TOTP library.
    const mockSecret = 'JBSWY3DPEHPK3PXP';
    responseData.secret = mockSecret;
    responseData.provisioningUri = `otpauth://totp/DigitalBanking:member?secret=${mockSecret}&issuer=DigitalBanking`;
  }

  // Generate backup codes if enabled
  if (config.mfa.backupCodes.enabled) {
    const backupCodes: string[] = [];
    for (let i = 0; i < config.mfa.backupCodes.count; i++) {
      const code = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
      backupCodes.push(code);
    }
    responseData.backupCodes = backupCodes;
  }

  // Log WITHOUT PII
  log('info', 'activation.enrollMFA', ctx.userId, {
    event: 'mfa_enrollment_initiated',
    activationToken,
    method,
    enrollmentId,
  });

  return {
    data: responseData,
  };
}

/**
 * activation.verifyMFA — Verifies the MFA code during enrollment
 */
export async function verifyMFA(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const activationToken = params.activationToken as string;
  const enrollmentId = params.enrollmentId as string;
  const code = params.code as string;

  if (!activationToken) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required field: activationToken' },
      status: 400,
    };
  }

  const session = activationSessions.get(activationToken);
  if (!session) {
    return {
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired activation token' },
      status: 401,
    };
  }

  if (!enrollmentId) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required field: enrollmentId' },
      status: 400,
    };
  }

  if (!code) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required field: code' },
      status: 400,
    };
  }

  // Mock verification: accept "123456" or any 6-digit code
  const isValid = /^\d{6}$/.test(code);

  if (isValid) {
    session.mfaEnrolled = true;
    activationSessions.set(activationToken, session);
  }

  log('info', 'activation.verifyMFA', ctx.userId, {
    event: isValid ? 'mfa_verified' : 'mfa_verification_failed',
    activationToken,
    enrollmentId,
    verified: isValid,
  });

  return {
    data: {
      verified: isValid,
      attemptsRemaining: isValid ? undefined : 4,
    },
  };
}

/**
 * activation.registerDevice — Registers the member's device
 */
export async function registerDevice(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const activationToken = params.activationToken as string;
  const device = params.device as Record<string, unknown> | undefined;
  const deviceName = params.deviceName as string | undefined;

  if (!activationToken) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required field: activationToken' },
      status: 400,
    };
  }

  const session = activationSessions.get(activationToken);
  if (!session) {
    return {
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired activation token' },
      status: 401,
    };
  }

  if (!device || !device.deviceId || !device.userAgent || !device.platform) {
    return {
      error: {
        code: 'BAD_REQUEST',
        message: 'Device must include deviceId, userAgent, and platform',
      },
      status: 400,
    };
  }

  const config = await getDefaultConfig(ctx);
  const trustedUntil = new Date();
  trustedUntil.setDate(trustedUntil.getDate() + config.deviceRegistration.trustDurationDays);

  // Update session
  session.deviceRegistered = true;
  activationSessions.set(activationToken, session);

  log('info', 'activation.registerDevice', ctx.userId, {
    event: 'device_registered',
    activationToken,
    deviceId: device.deviceId,
    platform: device.platform,
    deviceName: deviceName ?? null,
  });

  return {
    data: {
      deviceId: device.deviceId as string,
      trusted: true,
      trustedUntil: trustedUntil.toISOString(),
    },
  };
}

/**
 * activation.complete — Finalizes the activation flow
 */
export async function completeActivation(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const activationToken = params.activationToken as string;

  if (!activationToken) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required field: activationToken' },
      status: 400,
    };
  }

  const session = activationSessions.get(activationToken);
  if (!session) {
    return {
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired activation token' },
      status: 401,
    };
  }

  // Verify all required steps are completed
  const incompleteSteps: string[] = [];
  if (!session.verified) incompleteSteps.push('identity_verification');
  if (!session.termsAccepted) incompleteSteps.push('terms_acceptance');
  if (!session.credentialsCreated) incompleteSteps.push('credentials');

  const config = await getDefaultConfig(ctx);
  if (config.mfa.required && !session.mfaEnrolled) incompleteSteps.push('mfa_enrollment');
  if (config.deviceRegistration.required && !session.deviceRegistered) {
    incompleteSteps.push('device_registration');
  }

  if (incompleteSteps.length > 0) {
    log('warn', 'activation.complete', ctx.userId, {
      event: 'activation_incomplete',
      activationToken,
      incompleteSteps,
    });

    return {
      error: {
        code: 'ACTIVATION_INCOMPLETE',
        message: `The following steps must be completed: ${incompleteSteps.join(', ')}`,
      },
      status: 400,
    };
  }

  // Clean up session
  activationSessions.delete(activationToken);

  log('info', 'activation.complete', ctx.userId, {
    event: 'activation_completed',
    activationToken,
    firmId: session.firmId ?? null,
  });

  return {
    data: {
      status: 'completed',
      message: 'Digital banking access activated',
    },
  };
}

/**
 * activation.getTermsDocuments — Returns current active terms documents for a tenant
 */
export async function getTermsDocuments(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const typeFilter = params.type as string | undefined;

  log('info', 'activation.getTermsDocuments', ctx.userId, {
    firmId: ctx.firmId ?? null,
    typeFilter: typeFilter ?? null,
  });

  // Check for stored terms; fall back to defaults from config
  const config = await getDefaultConfig(ctx);
  let documents = config.terms.map((t) => ({
    id: t.documentId,
    type: t.type,
    title: t.title,
    content: t.content,
    version: t.version,
    mandatory: t.mandatory,
    active: true,
    createdAt: new Date().toISOString(),
  }));

  // Include any custom terms stored for this tenant
  for (const [, doc] of termsDocuments) {
    if (doc.firmId === (ctx.firmId ?? 'default') && doc.active) {
      documents.push({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        content: doc.content,
        version: doc.version,
        mandatory: doc.mandatory,
        active: doc.active,
        createdAt: doc.createdAt,
      });
    }
  }

  if (typeFilter) {
    documents = documents.filter((d) => d.type === typeFilter);
  }

  return {
    data: {
      documents,
    },
  };
}

/**
 * activation.createTermsVersion — Admin handler to create a new version of a terms document
 */
export async function createTermsVersion(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const type = params.type as string;
  const title = params.title as string;
  const content = params.content as string;
  const version = params.version as string;
  const mandatory = params.mandatory as boolean | undefined;

  if (!type || !title || !content || !version) {
    return {
      error: {
        code: 'BAD_REQUEST',
        message: 'Missing required fields: type, title, content, version',
      },
      status: 400,
    };
  }

  const firmId = ctx.firmId ?? 'default';

  // Deactivate previous active versions of this type for this tenant
  for (const [key, doc] of termsDocuments) {
    if (doc.firmId === firmId && doc.type === type && doc.active) {
      doc.active = false;
      termsDocuments.set(key, doc);
    }
  }

  const newDocId = crypto.randomUUID();
  const newDoc = {
    id: newDocId,
    type,
    title,
    content,
    version,
    mandatory: mandatory ?? true,
    active: true,
    createdAt: new Date().toISOString(),
    firmId,
  };

  termsDocuments.set(newDocId, newDoc);

  log('info', 'activation.createTermsVersion', ctx.userId, {
    event: 'terms_version_created',
    documentId: newDocId,
    type,
    version,
    firmId,
  });

  return {
    data: {
      id: newDoc.id,
      type: newDoc.type,
      title: newDoc.title,
      content: newDoc.content,
      version: newDoc.version,
      mandatory: newDoc.mandatory,
      active: newDoc.active,
      createdAt: newDoc.createdAt,
    },
  };
}

/**
 * activation.getTermsAcceptances — Admin handler to check member terms acceptances
 */
export async function getTermsAcceptances(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const documentId = params.documentId as string | undefined;
  const currentOnly = params.currentOnly as boolean | undefined;

  log('info', 'activation.getTermsAcceptances', ctx.userId, {
    event: 'query_terms_acceptances',
    documentId: documentId ?? null,
    currentOnly: currentOnly ?? false,
    firmId: ctx.firmId ?? null,
  });

  // Gather all acceptances
  let allAcceptances: Array<{
    userId: string;
    documentId: string;
    version: string;
    acceptedAt: string;
  }> = [];

  for (const [, records] of termsAcceptances) {
    allAcceptances = allAcceptances.concat(records);
  }

  // Filter by documentId if provided
  if (documentId) {
    allAcceptances = allAcceptances.filter((a) => a.documentId === documentId);
  }

  // If currentOnly, compare against current active versions
  const config = await getDefaultConfig(ctx);
  const currentVersions = new Map<string, string>();
  for (const term of config.terms) {
    currentVersions.set(term.documentId, term.version);
  }
  for (const [, doc] of termsDocuments) {
    if (doc.firmId === (ctx.firmId ?? 'default') && doc.active) {
      currentVersions.set(doc.id, doc.version);
    }
  }

  if (currentOnly) {
    allAcceptances = allAcceptances.filter((a) => {
      const currentVersion = currentVersions.get(a.documentId);
      return currentVersion && a.version === currentVersion;
    });
  }

  // Flag members with outdated acceptances
  const acceptanceRecords = allAcceptances.map((a) => {
    const currentVersion = currentVersions.get(a.documentId);
    return {
      ...a,
      isCurrent: currentVersion ? a.version === currentVersion : false,
    };
  });

  return {
    data: {
      acceptances: acceptanceRecords,
      currentVersions: Object.fromEntries(currentVersions),
    },
  };
}

/**
 * activation.checkTermsStatus — Checks if authenticated member needs to accept new terms
 */
export async function checkTermsStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  if (!ctx.userId) {
    return {
      error: { code: 'UNAUTHORIZED', message: tSync(ctx.locale, 'AUTH_REQUIRED', 'message') },
      status: 401,
    };
  }

  log('info', 'activation.checkTermsStatus', ctx.userId, {
    firmId: ctx.firmId ?? null,
  });

  // Get current active terms
  const config = await getDefaultConfig(ctx);
  const currentTerms = config.terms.map((t) => ({
    documentId: t.documentId,
    version: t.version,
    title: t.title,
    mandatory: t.mandatory,
  }));

  // Include custom terms for this tenant
  for (const [, doc] of termsDocuments) {
    if (doc.firmId === (ctx.firmId ?? 'default') && doc.active) {
      currentTerms.push({
        documentId: doc.id,
        version: doc.version,
        title: doc.title,
        mandatory: doc.mandatory,
      });
    }
  }

  // Get member's accepted terms
  const memberAcceptances = termsAcceptances.get(ctx.userId) ?? [];
  const acceptedMap = new Map<string, string>();
  for (const a of memberAcceptances) {
    // Keep the latest acceptance per document
    acceptedMap.set(a.documentId, a.version);
  }

  // Find pending documents
  const pendingDocuments = currentTerms.filter((term) => {
    const acceptedVersion = acceptedMap.get(term.documentId);
    return !acceptedVersion || acceptedVersion !== term.version;
  });

  return {
    data: {
      upToDate: pendingDocuments.length === 0,
      pendingDocuments,
    },
  };
}
