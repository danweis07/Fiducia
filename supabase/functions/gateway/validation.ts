/**
 * Gateway Input Validation
 *
 * Zod-based schema validation for all gateway handler params.
 * Prevents arbitrary data from reaching handlers and provides
 * structured field-level error messages to clients.
 *
 * Usage:
 *   import { validateParams, ValidationError } from './validation.ts';
 *   const parsed = validateParams('accounts.list', rawParams);
 */

import { z, ZodError, ZodType } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =============================================================================
// CUSTOM ERROR CLASS
// =============================================================================

export interface FieldError {
  field: string;
  message: string;
  code: string;
}

export class ValidationError extends Error {
  public readonly fieldErrors: FieldError[];
  public readonly action: string;

  constructor(action: string, zodError: ZodError) {
    const fieldErrors: FieldError[] = zodError.issues.map((issue) => ({
      field: issue.path.join('.') || '_root',
      message: issue.message,
      code: issue.code,
    }));

    const summary = fieldErrors
      .map((e) => `${e.field}: ${e.message}`)
      .join('; ');

    super(`Validation failed for "${action}": ${summary}`);
    this.name = 'ValidationError';
    this.action = action;
    this.fieldErrors = fieldErrors;
  }
}

// =============================================================================
// SHARED PRIMITIVES
// =============================================================================

/**
 * Coerces string-encoded numbers to actual numbers.
 * Query params and JSON from loose clients sometimes arrive as strings.
 */
const coercedNumber = z.union([z.number(), z.string().pipe(z.coerce.number())]);

/** Optional coerced number (undefined passthrough). */
const optionalNumber = coercedNumber.optional();

/** Optional coerced number with a default. */
function numberWithDefault(defaultVal: number) {
  return coercedNumber.default(defaultVal);
}

/** UUID or other string ID, trimmed. */
const requiredId = z.string().trim().min(1, { message: 'Required' });

/** Optional string that is trimmed. */
const optionalString = z.string().trim().optional();

// =============================================================================
// SCHEMAS BY ACTION
// =============================================================================

export const schemas: Record<string, ZodType> = {
  // ---------------------------------------------------------------------------
  // Integrations
  // ---------------------------------------------------------------------------
  'integrations.providers': z.object({}),

  'integrations.connected': z.object({
    firmId: optionalString,
  }),

  'integrations.connect': z.object({
    providerId: requiredId,
    apiKey: z.string().min(1, { message: 'API key is required' }),
    firmId: optionalString,
  }),

  'integrations.disconnect': z.object({
    integrationId: requiredId,
  }),

  'integrations.health': z.object({
    firmId: optionalString,
  }),

  'integrations.syncLogs': z.object({
    integrationId: optionalString,
    firmId: optionalString,
    limit: optionalNumber,
  }),

  // ---------------------------------------------------------------------------
  // Accounts
  // ---------------------------------------------------------------------------
  'accounts.list': z.object({
    limit: numberWithDefault(50),
    offset: numberWithDefault(0),
  }),

  'accounts.get': z.object({
    id: requiredId,
  }).strict(),

  'accounts.summary': z.object({}),

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------
  'transactions.list': z.object({
    accountId: optionalString,
    type: optionalString,
    status: optionalString,
    category: optionalString,
    fromDate: optionalString,
    toDate: optionalString,
    search: optionalString,
    limit: numberWithDefault(50),
    offset: numberWithDefault(0),
  }),

  'transactions.get': z.object({
    id: requiredId,
  }).strict(),

  'transactions.search': z.object({
    query: z.string().trim().min(1, { message: 'Search query is required' }),
    accountId: optionalString,
    limit: numberWithDefault(50),
  }),

  // ---------------------------------------------------------------------------
  // Transfers
  // ---------------------------------------------------------------------------
  'transfers.create': z.object({
    fromAccountId: requiredId,
    toAccountId: optionalString,
    toBeneficiaryId: optionalString,
    type: z.string().trim().min(1),
    amountCents: coercedNumber.pipe(z.number().positive({ message: 'Amount must be positive' })),
    memo: optionalString,
    scheduledDate: optionalString,
  }).refine(
    (data) => data.toAccountId || data.toBeneficiaryId,
    { message: 'Either toAccountId or toBeneficiaryId is required', path: ['toAccountId'] }
  ),

  'transfers.schedule': z.object({
    fromAccountId: requiredId,
    toAccountId: optionalString,
    toBeneficiaryId: optionalString,
    type: z.string().trim().min(1),
    amountCents: coercedNumber.pipe(z.number().positive()),
    memo: optionalString,
    scheduledDate: z.string().trim().min(1, { message: 'Scheduled date is required' }),
    recurringRule: z.object({
      frequency: z.string(),
      endDate: optionalString,
    }).optional(),
  }),

  'transfers.cancel': z.object({
    id: requiredId,
  }).strict(),

  'transfers.list': z.object({
    status: optionalString,
    limit: numberWithDefault(50),
    offset: numberWithDefault(0),
  }),

  // ---------------------------------------------------------------------------
  // Beneficiaries
  // ---------------------------------------------------------------------------
  'beneficiaries.list': z.object({}),

  'beneficiaries.create': z.object({
    name: z.string().trim().min(1, { message: 'Name is required' }),
    nickname: optionalString,
    accountNumber: z.string().trim().min(1, { message: 'Account number is required' }),
    routingNumber: optionalString,
    bankName: optionalString,
    type: z.string().trim().min(1),
  }),

  'beneficiaries.delete': z.object({
    id: requiredId,
  }).strict(),

  // ---------------------------------------------------------------------------
  // Bill Pay
  // ---------------------------------------------------------------------------
  'bills.list': z.object({
    status: optionalString,
    limit: numberWithDefault(50),
    offset: numberWithDefault(0),
  }),

  'bills.create': z.object({
    payeeName: z.string().trim().min(1, { message: 'Payee name is required' }),
    payeeAccountNumber: z.string().trim().min(1, { message: 'Payee account number is required' }),
    amountCents: coercedNumber.pipe(z.number().positive()),
    dueDate: z.string().trim().min(1, { message: 'Due date is required' }),
    fromAccountId: requiredId,
    autopay: z.boolean().optional(),
    recurringRule: z.object({
      frequency: z.string(),
      endDate: optionalString,
    }).optional(),
  }),

  'bills.pay': z.object({
    id: requiredId,
  }).strict(),

  'bills.cancel': z.object({
    id: requiredId,
  }).strict(),

  // ---------------------------------------------------------------------------
  // RDC (Remote Deposit Capture)
  // ---------------------------------------------------------------------------
  'rdc.deposit': z.object({
    accountId: requiredId,
    amountCents: coercedNumber.pipe(z.number().positive()),
    frontImageBase64: z.string().min(1, { message: 'Front image is required' }),
    backImageBase64: z.string().min(1, { message: 'Back image is required' }),
    checkNumber: optionalString,
  }),

  'rdc.status': z.object({
    id: requiredId,
  }).strict(),

  'rdc.history': z.object({
    accountId: optionalString,
    limit: numberWithDefault(20),
  }),

  // ---------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------
  'cards.list': z.object({}),

  'cards.lock': z.object({
    id: requiredId,
  }).strict(),

  'cards.unlock': z.object({
    id: requiredId,
  }).strict(),

  'cards.setLimit': z.object({
    id: requiredId,
    dailyLimitCents: coercedNumber.pipe(z.number().positive()),
  }).strict(),

  // ---------------------------------------------------------------------------
  // Account Statements
  // ---------------------------------------------------------------------------
  'statements.list': z.object({
    accountId: requiredId,
    limit: numberWithDefault(12),
    offset: numberWithDefault(0),
  }),

  'statements.get': z.object({
    id: requiredId,
  }).strict(),

  'statements.config': z.object({}),

  'statements.download': z.object({
    id: requiredId,
  }).strict(),

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  'notifications.list': z.object({
    unreadOnly: z.boolean().optional(),
    limit: numberWithDefault(50),
    offset: numberWithDefault(0),
  }),

  'notifications.markRead': z.object({
    id: requiredId,
  }).strict(),

  'notifications.markAllRead': z.object({}),

  'notifications.unreadCount': z.object({}),

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------
  'config.capabilities': z.object({}),
  'config.theme': z.object({}),

  // ---------------------------------------------------------------------------
  // Digital Activation
  // ---------------------------------------------------------------------------
  'activation.config': z.object({}),

  'activation.verifyIdentity': z.object({
    accountNumber: optionalString,
    ssn: optionalString,
    dateOfBirth: optionalString,
    email: optionalString,
    phone: optionalString,
    zipCode: optionalString,
    lastName: optionalString,
  }),

  'activation.acceptTerms': z.object({
    activationToken: requiredId,
    acceptances: z.array(z.object({
      documentId: z.string().trim().min(1),
      version: z.string().trim().min(1),
    })).min(1, { message: 'At least one document acceptance is required' }),
  }).strict(),

  'activation.createCredentials': z.object({
    activationToken: requiredId,
    username: z.string().trim().min(1, { message: 'Username is required' }),
    password: z.string().min(1, { message: 'Password is required' }),
  }).strict(),

  'activation.enrollMFA': z.object({
    activationToken: requiredId,
    method: z.enum(['sms', 'email', 'totp', 'push', 'passkey', 'biometric']),
    destination: optionalString,
  }).strict(),

  'activation.verifyMFA': z.object({
    activationToken: requiredId,
    enrollmentId: requiredId,
    code: z.string().trim().min(1, { message: 'Verification code is required' }),
  }).strict(),

  'activation.passkeyOptions': z.object({
    activationToken: requiredId,
  }).strict(),

  'activation.registerPasskey': z.object({
    activationToken: requiredId,
    credentialId: z.string().trim().min(1),
    attestationObject: z.string().trim().min(1),
    clientDataJSON: z.string().trim().min(1),
    authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
    transports: z.array(z.string()).optional(),
    deviceName: z.string().trim().min(1),
  }).strict(),

  'activation.registerDevice': z.object({
    activationToken: requiredId,
    device: z.object({
      deviceId: z.string().trim().min(1),
      userAgent: z.string().trim().min(1),
      platform: z.enum(['web', 'ios', 'android']),
      screenResolution: optionalString,
      timezone: optionalString,
      language: optionalString,
    }),
    deviceName: z.string().trim().min(1, { message: 'Device name is required' }),
  }).strict(),

  'activation.complete': z.object({
    activationToken: requiredId,
  }).strict(),

  'activation.checkTermsStatus': z.object({}),

  'activation.getTerms': z.object({
    type: optionalString,
  }),

  'activation.createTermsVersion': z.object({
    type: z.enum([
      'digital_banking_agreement',
      'electronic_disclosure',
      'privacy_policy',
      'data_sharing_consent',
    ]),
    title: z.string().trim().min(1, { message: 'Title is required' }),
    content: z.string().min(1, { message: 'Content is required' }),
    version: z.string().trim().min(1, { message: 'Version is required' }),
    mandatory: z.boolean(),
  }).strict(),

  'activation.getTermsAcceptances': z.object({
    documentId: optionalString,
    currentOnly: z.boolean().optional(),
  }),

  // ---------------------------------------------------------------------------
  // ATM / Branch Locator
  // ---------------------------------------------------------------------------
  'locations.search': z.object({
    latitude: coercedNumber.pipe(
      z.number().min(-90, { message: 'Latitude must be >= -90' }).max(90, { message: 'Latitude must be <= 90' })
    ),
    longitude: coercedNumber.pipe(
      z.number().min(-180, { message: 'Longitude must be >= -180' }).max(180, { message: 'Longitude must be <= 180' })
    ),
    radiusMiles: numberWithDefault(25),
    type: z.enum(['atm', 'branch', 'shared_branch']).optional(),
    limit: numberWithDefault(20),
    offset: numberWithDefault(0),
  }),

  // ---------------------------------------------------------------------------
  // Password Policy
  // ---------------------------------------------------------------------------
  'passwordPolicy.get': z.object({}),

  'passwordPolicy.update': z.object({
    username: z.object({
      minLength: optionalNumber,
      maxLength: optionalNumber,
      allowEmail: z.boolean().optional(),
    }).optional(),
    password: z.object({
      minLength: optionalNumber,
      maxLength: optionalNumber,
      requireUppercase: z.boolean().optional(),
      requireLowercase: z.boolean().optional(),
      requireDigit: z.boolean().optional(),
      requireSpecialChar: z.boolean().optional(),
    }).optional(),
    lockout: z.object({
      maxFailedAttempts: optionalNumber,
      lockoutDurationMinutes: optionalNumber,
    }).optional(),
  }),

  // ---------------------------------------------------------------------------
  // Bill Pay (adapter-backed)
  // ---------------------------------------------------------------------------
  'billpay.billers.search': z.object({
    query: z.string().trim().min(1, { message: 'Search query is required' }),
    category: optionalString,
    zipCode: optionalString,
    limit: numberWithDefault(20),
  }),

  'billpay.payees.list': z.object({}),

  'billpay.payees.enroll': z.object({
    billerId: requiredId,
    accountNumber: z.string().trim().min(1, { message: 'Account number is required' }),
    nickname: optionalString,
    enrollmentFields: z.record(z.string()).optional(),
  }),

  'billpay.payments.schedule': z.object({
    payeeId: requiredId,
    fromAccountId: requiredId,
    amountCents: coercedNumber.pipe(z.number().positive({ message: 'Amount must be positive' })),
    scheduledDate: z.string().trim().min(1, { message: 'Scheduled date is required' }),
    method: optionalString,
    memo: optionalString,
    recurringRule: z.object({
      frequency: z.string(),
      dayOfMonth: optionalNumber,
      endDate: optionalString,
    }).optional(),
  }),

  'billpay.payments.cancel': z.object({
    paymentId: requiredId,
  }).strict(),

  'billpay.payments.status': z.object({
    paymentId: requiredId,
  }).strict(),

  'billpay.payments.list': z.object({
    payeeId: optionalString,
    status: optionalString,
    fromDate: optionalString,
    toDate: optionalString,
    limit: numberWithDefault(50),
    offset: numberWithDefault(0),
  }),

  'billpay.ebills.list': z.object({
    payeeId: optionalString,
    status: optionalString,
  }),

  // ---------------------------------------------------------------------------
  // Financial Data & Insights (adapter-backed)
  // ---------------------------------------------------------------------------
  'financial.enrich': z.object({
    transactions: z.array(z.object({
      transactionId: requiredId,
      description: z.string().trim().min(1),
      amountCents: coercedNumber,
      date: z.string().trim().min(1),
      type: z.enum(['debit', 'credit']),
    })).min(1, { message: 'At least one transaction is required' }),
  }),

  'financial.spending': z.object({
    periodStart: optionalString,
    periodEnd: optionalString,
    accountIds: z.array(z.string()).optional(),
  }),

  'financial.trends': z.object({
    months: numberWithDefault(6),
    accountIds: z.array(z.string()).optional(),
  }),

  'financial.budgets.list': z.object({}),

  'financial.budgets.set': z.object({
    category: z.string().trim().min(1, { message: 'Category is required' }),
    limitCents: coercedNumber.pipe(z.number().positive({ message: 'Budget limit must be positive' })),
  }),

  'financial.networth': z.object({}),

  'financial.networth.history': z.object({
    months: numberWithDefault(12),
  }),

  'financial.recurring': z.object({}),

  // ---------------------------------------------------------------------------
  // Card-Linked Offers (adapter-backed)
  // ---------------------------------------------------------------------------
  'offers.list': z.object({
    cardId: optionalString,
    status: optionalString,
    category: optionalString,
    latitude: optionalNumber,
    longitude: optionalNumber,
    radiusMiles: optionalNumber,
    limit: numberWithDefault(20),
    offset: numberWithDefault(0),
  }),

  'offers.activate': z.object({
    offerId: requiredId,
    cardId: requiredId,
  }).strict(),

  'offers.deactivate': z.object({
    offerId: requiredId,
  }).strict(),

  'offers.redemptions': z.object({
    fromDate: optionalString,
    toDate: optionalString,
    limit: numberWithDefault(50),
  }),

  'offers.summary': z.object({}),
};

// =============================================================================
// VALIDATE FUNCTION
// =============================================================================

/**
 * Validates and parses handler params against the registered Zod schema.
 *
 * - If a schema exists for the action, params are parsed and defaults applied.
 * - If no schema exists (unknown/new action), params pass through unchanged
 *   for backwards compatibility.
 * - Throws `ValidationError` with field-level details on invalid input.
 *
 * @param action  The gateway action string, e.g. "accounts.list"
 * @param params  Raw params from the request body
 * @returns       Parsed and validated params (with defaults applied)
 * @throws        ValidationError on validation failure
 */
export function validateParams(action: string, params: unknown): Record<string, unknown> {
  const schema = schemas[action];

  // No schema registered — pass through for backwards compatibility
  if (!schema) {
    return (params ?? {}) as Record<string, unknown>;
  }

  const result = schema.safeParse(params ?? {});

  if (!result.success) {
    throw new ValidationError(action, result.error);
  }

  return result.data as Record<string, unknown>;
}
