/**
 * Password Policy Admin Handlers
 *
 * CRUD for per-tenant password and username rules.
 * Only admins/owners can update; all authenticated users can read
 * (needed for frontend validation UI during activation).
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';

// =============================================================================
// HELPERS
// =============================================================================

function toPolicy(row: Record<string, unknown>) {
  return {
    id: row.id,
    firmId: row.firm_id,
    username: {
      minLength: row.username_min_length,
      maxLength: row.username_max_length,
      allowEmail: row.username_allow_email,
      pattern: row.username_pattern,
      patternDescription: row.username_pattern_description,
    },
    password: {
      minLength: row.password_min_length,
      maxLength: row.password_max_length,
      requireUppercase: row.require_uppercase,
      requireLowercase: row.require_lowercase,
      requireDigit: row.require_digit,
      requireSpecialChar: row.require_special_char,
      specialChars: row.special_chars,
      disallowUsername: row.disallow_username,
      historyCount: row.password_history_count,
      expiryDays: row.password_expiry_days,
    },
    lockout: {
      maxFailedAttempts: row.max_failed_attempts,
      lockoutDurationMinutes: row.lockout_duration_minutes,
    },
    updatedAt: row.updated_at,
  };
}

// Default policy returned when no DB row exists
const DEFAULTS = {
  id: null,
  firmId: null,
  username: {
    minLength: 6,
    maxLength: 32,
    allowEmail: false,
    pattern: '^[a-zA-Z0-9_]+$',
    patternDescription: 'Alphanumeric characters and underscores only',
  },
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireSpecialChar: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    disallowUsername: true,
    historyCount: 0,
    expiryDays: 0,
  },
  lockout: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
  },
  updatedAt: null,
};

// =============================================================================
// GET — any authenticated user can read (needed for activation UI)
// =============================================================================

export async function getPasswordPolicy(ctx: GatewayContext): Promise<GatewayResponse> {
  if (!ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }

  const { data } = await ctx.db
    .from('banking_password_policies')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .single();

  if (!data) {
    return { data: { policy: { ...DEFAULTS, firmId: ctx.firmId } } };
  }

  return { data: { policy: toPolicy(data) } };
}

// =============================================================================
// UPDATE — admin/owner only
// =============================================================================

export async function updatePasswordPolicy(ctx: GatewayContext): Promise<GatewayResponse> {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }

  const { params } = ctx;

  // Validate numeric bounds
  const passwordMin = params.passwordMinLength as number | undefined;
  const passwordMax = params.passwordMaxLength as number | undefined;
  if (passwordMin !== undefined && (passwordMin < 6 || passwordMin > 128)) {
    return { error: { code: 'BAD_REQUEST', message: 'passwordMinLength must be between 6 and 128' }, status: 400 };
  }
  if (passwordMax !== undefined && (passwordMax < 8 || passwordMax > 256)) {
    return { error: { code: 'BAD_REQUEST', message: 'passwordMaxLength must be between 8 and 256' }, status: 400 };
  }
  if (passwordMin !== undefined && passwordMax !== undefined && passwordMin > passwordMax) {
    return { error: { code: 'BAD_REQUEST', message: 'passwordMinLength cannot exceed passwordMaxLength' }, status: 400 };
  }

  const usernameMin = params.usernameMinLength as number | undefined;
  const usernameMax = params.usernameMaxLength as number | undefined;
  if (usernameMin !== undefined && (usernameMin < 3 || usernameMin > 64)) {
    return { error: { code: 'BAD_REQUEST', message: 'usernameMinLength must be between 3 and 64' }, status: 400 };
  }
  if (usernameMax !== undefined && (usernameMax < 6 || usernameMax > 128)) {
    return { error: { code: 'BAD_REQUEST', message: 'usernameMaxLength must be between 6 and 128' }, status: 400 };
  }

  // Build update payload — only include fields that were explicitly sent
  const updates: Record<string, unknown> = {};
  if (params.usernameMinLength !== undefined) updates.username_min_length = params.usernameMinLength;
  if (params.usernameMaxLength !== undefined) updates.username_max_length = params.usernameMaxLength;
  if (params.usernameAllowEmail !== undefined) updates.username_allow_email = params.usernameAllowEmail;
  if (params.usernamePattern !== undefined) updates.username_pattern = params.usernamePattern;
  if (params.usernamePatternDescription !== undefined) updates.username_pattern_description = params.usernamePatternDescription;

  if (params.passwordMinLength !== undefined) updates.password_min_length = params.passwordMinLength;
  if (params.passwordMaxLength !== undefined) updates.password_max_length = params.passwordMaxLength;
  if (params.requireUppercase !== undefined) updates.require_uppercase = params.requireUppercase;
  if (params.requireLowercase !== undefined) updates.require_lowercase = params.requireLowercase;
  if (params.requireDigit !== undefined) updates.require_digit = params.requireDigit;
  if (params.requireSpecialChar !== undefined) updates.require_special_char = params.requireSpecialChar;
  if (params.specialChars !== undefined) updates.special_chars = params.specialChars;
  if (params.disallowUsername !== undefined) updates.disallow_username = params.disallowUsername;
  if (params.passwordHistoryCount !== undefined) updates.password_history_count = params.passwordHistoryCount;
  if (params.passwordExpiryDays !== undefined) updates.password_expiry_days = params.passwordExpiryDays;

  if (params.maxFailedAttempts !== undefined) updates.max_failed_attempts = params.maxFailedAttempts;
  if (params.lockoutDurationMinutes !== undefined) updates.lockout_duration_minutes = params.lockoutDurationMinutes;

  if (Object.keys(updates).length === 0) {
    return { error: { code: 'BAD_REQUEST', message: 'No fields to update' }, status: 400 };
  }

  // Upsert: create if doesn't exist, update if it does
  const { data: existing } = await ctx.db
    .from('banking_password_policies')
    .select('id')
    .eq('firm_id', ctx.firmId)
    .single();

  let result;
  if (existing) {
    const { data, error } = await ctx.db
      .from('banking_password_policies')
      .update(updates)
      .eq('firm_id', ctx.firmId)
      .select()
      .single();
    if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
    result = data;
  } else {
    const { data, error } = await ctx.db
      .from('banking_password_policies')
      .insert({ firm_id: ctx.firmId, ...updates })
      .select()
      .single();
    if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
    result = data;
  }

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'passwordPolicy.update',
    userId: ctx.userId,
    firmId: ctx.firmId,
    updatedFields: Object.keys(updates),
    timestamp: new Date().toISOString(),
  }));

  return { data: { policy: toPolicy(result) } };
}
