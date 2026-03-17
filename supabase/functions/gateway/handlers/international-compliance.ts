/**
 * International Compliance Handlers
 *
 * Covers 5 feature areas:
 *   1. International Consent Dashboard (GDPR, LGPD, PIPL, etc.)
 *   2. Strong Customer Authentication (SCA / PSD2)
 *   3. Localized eKYC (document + liveness verification)
 *   4. International Payments (VPA / Pix / UPI / QR)
 *   5. Open Finance (multi-bank aggregation + alt credit)
 */

import type { GatewayContext, GatewayResponse } from '../index.ts';

// =============================================================================
// AUTH GUARD
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

// =============================================================================
// 1. INTERNATIONAL CONSENT DASHBOARD
// =============================================================================

/**
 * List international consents with optional status and regulation filter.
 */
export async function listInternationalConsents(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const status = ctx.params.status as string | undefined;
  const regulation = ctx.params.regulation as string | undefined;
  const limit = (ctx.params.limit as number) ?? 50;
  const offset = (ctx.params.offset as number) ?? 0;

  let query = ctx.supabase
    .from('international_consents')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }
  if (regulation) {
    query = query.eq('regulation', regulation);
  }

  const { data: rows, error, count } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { consents: (rows ?? []).map(toInternationalConsent) },
    meta: {
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
    },
  };
}

/**
 * Get a single international consent by ID.
 */
export async function getInternationalConsent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const consentId = ctx.params.consentId as string;
  if (!consentId) return { error: { code: 'INVALID_PARAMS', message: 'consentId required' }, status: 400 };

  const { data: row, error } = await ctx.supabase
    .from('international_consents')
    .select('*')
    .eq('id', consentId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .single();

  if (error || !row) return { error: { code: 'NOT_FOUND', message: 'Consent not found' }, status: 404 };

  return { data: { consent: toInternationalConsent(row) } };
}

/**
 * Revoke an international consent — sets status to 'revoked'.
 */
export async function revokeInternationalConsent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const consentId = ctx.params.consentId as string;
  if (!consentId) return { error: { code: 'INVALID_PARAMS', message: 'consentId required' }, status: 400 };

  const now = new Date().toISOString();

  const { data: row, error } = await ctx.supabase
    .from('international_consents')
    .update({
      status: 'revoked',
      revoked_at: now,
      updated_at: now,
    })
    .eq('id', consentId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'active')
    .select()
    .single();

  if (error || !row) {
    return { error: { code: 'NOT_FOUND', message: 'Active consent not found' }, status: 404 };
  }

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.consent.revoke',
      success: true,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { consent: toInternationalConsent(row) } };
}

/**
 * Revoke a specific scope from an international consent (remove from scopes array).
 */
export async function revokeInternationalConsentScope(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const consentId = ctx.params.consentId as string;
  const scope = ctx.params.scope as string;
  if (!consentId || !scope) {
    return { error: { code: 'INVALID_PARAMS', message: 'consentId and scope required' }, status: 400 };
  }

  // Fetch the current consent
  const { data: existing, error: fetchErr } = await ctx.supabase
    .from('international_consents')
    .select('*')
    .eq('id', consentId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'active')
    .single();

  if (fetchErr || !existing) {
    return { error: { code: 'NOT_FOUND', message: 'Active consent not found' }, status: 404 };
  }

  const currentScopes = (existing.scopes as string[]) ?? [];
  const updatedScopes = currentScopes.filter((s: string) => s !== scope);

  if (updatedScopes.length === currentScopes.length) {
    return { error: { code: 'INVALID_PARAMS', message: 'Scope not found on consent' }, status: 400 };
  }

  const now = new Date().toISOString();

  const { data: row, error } = await ctx.supabase
    .from('international_consents')
    .update({
      scopes: updatedScopes,
      updated_at: now,
    })
    .eq('id', consentId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .select()
    .single();

  if (error || !row) {
    return { error: { code: 'DB_ERROR', message: 'Failed to update consent scopes' }, status: 500 };
  }

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.consent.revokeScope',
      success: true,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { consent: toInternationalConsent(row) } };
}

/**
 * List access logs for international consents.
 */
export async function listInternationalConsentAccessLogs(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const consentId = ctx.params.consentId as string | undefined;
  const limit = (ctx.params.limit as number) ?? 50;
  const offset = (ctx.params.offset as number) ?? 0;

  let query = ctx.supabase
    .from('international_consent_access_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .order('accessed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (consentId) {
    query = query.eq('consent_id', consentId);
  }

  const { data: rows, error, count } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { accessLogs: (rows ?? []).map(toInternationalConsentAccessLog) },
    meta: {
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
    },
  };
}

/**
 * Get aggregate consent summary counts.
 */
export async function getInternationalConsentSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: consents, error } = await ctx.supabase
    .from('international_consents')
    .select('status, regulation')
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const rows = consents ?? [];
  const active = rows.filter(r => r.status === 'active').length;
  const revoked = rows.filter(r => r.status === 'revoked').length;
  const expired = rows.filter(r => r.status === 'expired').length;

  // Group by regulation
  const byRegulation: Record<string, number> = {};
  for (const r of rows) {
    const reg = (r.regulation as string) ?? 'unknown';
    byRegulation[reg] = (byRegulation[reg] ?? 0) + 1;
  }

  // Count recent access (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentAccessCount } = await ctx.supabase
    .from('international_consent_access_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .gte('accessed_at', thirtyDaysAgo);

  return {
    data: {
      summary: {
        totalConsents: rows.length,
        activeConsents: active,
        revokedConsents: revoked,
        expiredConsents: expired,
        byRegulation,
        recentAccessCount: recentAccessCount ?? 0,
      },
    },
  };
}

// =============================================================================
// 2. STRONG CUSTOMER AUTHENTICATION (SCA)
// =============================================================================

/**
 * Get SCA configuration for the tenant.
 */
export async function getSCAConfig(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: row, error } = await ctx.supabase
    .from('sca_config')
    .select('*')
    .eq('tenant_id', ctx.firmId)
    .single();

  if (error || !row) return { error: { code: 'NOT_FOUND', message: 'SCA config not found' }, status: 404 };

  return { data: { config: toSCAConfig(row) } };
}

/**
 * Create a new SCA challenge with required factors and dynamic linking data.
 */
export async function createSCAChallenge(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const requiredFactors = ctx.params.requiredFactors as string[];
  const actionType = ctx.params.actionType as string;
  const dynamicLinkingData = ctx.params.dynamicLinkingData as Record<string, unknown> | undefined;

  if (!requiredFactors?.length || !actionType) {
    return { error: { code: 'INVALID_PARAMS', message: 'requiredFactors and actionType required' }, status: 400 };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 min expiry

  const { data: row, error } = await ctx.supabase
    .from('sca_challenges')
    .insert({
      tenant_id: ctx.firmId,
      user_id: ctx.userId,
      action_type: actionType,
      required_factors: requiredFactors,
      completed_factors: [],
      dynamic_linking_data: dynamicLinkingData ?? {},
      status: 'pending',
      expires_at: expiresAt,
      resource_id: (ctx.params.resourceId as string) ?? null,
      amount_cents: (ctx.params.amountCents as number) ?? null,
      currency: (ctx.params.currency as string) ?? null,
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.sca.createChallenge',
      success: true,
      ip_address: null,
      created_at: now.toISOString(),
    })
    .then(() => {});

  return { data: { challenge: toSCAChallenge(row) } };
}

/**
 * Verify a single SCA factor — adds factor to completed_factors on the challenge.
 */
export async function verifySCAFactor(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const challengeId = ctx.params.challengeId as string;
  const factor = ctx.params.factor as string;
  const _factorData = ctx.params.factorData as Record<string, unknown> | undefined;

  if (!challengeId || !factor) {
    return { error: { code: 'INVALID_PARAMS', message: 'challengeId and factor required' }, status: 400 };
  }

  // Fetch the current challenge
  const { data: existing, error: fetchErr } = await ctx.supabase
    .from('sca_challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'pending')
    .single();

  if (fetchErr || !existing) {
    return { error: { code: 'NOT_FOUND', message: 'Pending challenge not found' }, status: 404 };
  }

  // Check expiry
  if (new Date(existing.expires_at as string) < new Date()) {
    await ctx.supabase
      .from('sca_challenges')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', challengeId);
    return { error: { code: 'EXPIRED', message: 'Challenge has expired' }, status: 410 };
  }

  const completedFactors = [...((existing.completed_factors as string[]) ?? []), factor];
  const requiredFactors = (existing.required_factors as string[]) ?? [];
  const allComplete = requiredFactors.every((f: string) => completedFactors.includes(f));

  const now = new Date().toISOString();

  const { data: row, error } = await ctx.supabase
    .from('sca_challenges')
    .update({
      completed_factors: completedFactors,
      status: allComplete ? 'completed' : 'pending',
      verified_at: allComplete ? now : null,
      updated_at: now,
    })
    .eq('id', challengeId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .select()
    .single();

  if (error || !row) {
    return { error: { code: 'DB_ERROR', message: 'Failed to verify factor' }, status: 500 };
  }

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.sca.verifyFactor',
      success: true,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { challenge: toSCAChallenge(row) } };
}

/**
 * List SCA trusted devices for the authenticated user.
 */
export async function listSCATrustedDevices(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.supabase
    .from('sca_trusted_devices')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .order('created_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { devices: (rows ?? []).map(toSCATrustedDevice) } };
}

/**
 * Bind a new trusted device.
 */
export async function bindSCADevice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const deviceName = ctx.params.deviceName as string;
  const deviceFingerprint = ctx.params.deviceFingerprint as string;
  const deviceType = ctx.params.deviceType as string;

  if (!deviceName || !deviceFingerprint || !deviceType) {
    return { error: { code: 'INVALID_PARAMS', message: 'deviceName, deviceFingerprint, and deviceType required' }, status: 400 };
  }

  const now = new Date().toISOString();

  const { data: row, error } = await ctx.supabase
    .from('sca_trusted_devices')
    .insert({
      tenant_id: ctx.firmId,
      user_id: ctx.userId,
      device_name: deviceName,
      device_fingerprint: deviceFingerprint,
      device_type: deviceType,
      platform: (ctx.params.platform as string) ?? null,
      last_used_at: now,
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.sca.bindDevice',
      success: true,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { device: toSCATrustedDevice(row) } };
}

/**
 * Remove a trusted device binding.
 */
export async function unbindSCADevice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const deviceId = ctx.params.deviceId as string;
  if (!deviceId) return { error: { code: 'INVALID_PARAMS', message: 'deviceId required' }, status: 400 };

  const { error } = await ctx.supabase
    .from('sca_trusted_devices')
    .delete()
    .eq('id', deviceId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const now = new Date().toISOString();

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.sca.unbindDevice',
      success: true,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { success: true } };
}

// =============================================================================
// 3. LOCALIZED eKYC
// =============================================================================

/**
 * List eKYC providers filtered by country code.
 */
export async function listEKYCProviders(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const countryCode = ctx.params.countryCode as string | undefined;

  let query = ctx.supabase
    .from('ekyc_providers')
    .select('*')
    .eq('tenant_id', ctx.firmId)
    .eq('active', true)
    .order('name', { ascending: true });

  if (countryCode) {
    query = query.contains('supported_countries', [countryCode]);
  }

  const { data: rows, error } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { providers: (rows ?? []).map(toEKYCProvider) } };
}

/**
 * Initiate an eKYC verification.
 */
export async function initiateEKYC(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const providerId = ctx.params.providerId as string;
  const documentType = ctx.params.documentType as string;
  const countryCode = ctx.params.countryCode as string;

  if (!providerId || !documentType || !countryCode) {
    return { error: { code: 'INVALID_PARAMS', message: 'providerId, documentType, and countryCode required' }, status: 400 };
  }

  const { data: row, error } = await ctx.supabase
    .from('ekyc_verifications')
    .insert({
      tenant_id: ctx.firmId,
      user_id: ctx.userId,
      provider_id: providerId,
      document_type: documentType,
      country_code: countryCode,
      status: 'initiated',
      metadata: (ctx.params.metadata as Record<string, unknown>) ?? {},
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.ekyc.initiate',
      success: true,
      ip_address: null,
      created_at: new Date().toISOString(),
    })
    .then(() => {});

  return { data: { verification: toEKYCVerification(row) } };
}

/**
 * Get the status of a single eKYC verification.
 */
export async function getEKYCStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const verificationId = ctx.params.verificationId as string;
  if (!verificationId) return { error: { code: 'INVALID_PARAMS', message: 'verificationId required' }, status: 400 };

  const { data: row, error } = await ctx.supabase
    .from('ekyc_verifications')
    .select('*')
    .eq('id', verificationId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .single();

  if (error || !row) return { error: { code: 'NOT_FOUND', message: 'Verification not found' }, status: 404 };

  return { data: { verification: toEKYCVerification(row) } };
}

/**
 * Start a liveness check for an eKYC verification.
 */
export async function startLivenessCheck(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const verificationId = ctx.params.verificationId as string;
  const challengeType = ctx.params.challengeType as string;

  if (!verificationId || !challengeType) {
    return { error: { code: 'INVALID_PARAMS', message: 'verificationId and challengeType required' }, status: 400 };
  }

  const { data: row, error } = await ctx.supabase
    .from('liveness_challenges')
    .insert({
      tenant_id: ctx.firmId,
      user_id: ctx.userId,
      verification_id: verificationId,
      challenge_type: challengeType,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { livenessChallenge: toLivenessChallenge(row) } };
}

/**
 * Complete a liveness check — update status with result.
 */
export async function completeLivenessCheck(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const challengeId = ctx.params.challengeId as string;
  const passed = ctx.params.passed as boolean;

  if (!challengeId || typeof passed !== 'boolean') {
    return { error: { code: 'INVALID_PARAMS', message: 'challengeId and passed (boolean) required' }, status: 400 };
  }

  const now = new Date().toISOString();

  const { data: row, error } = await ctx.supabase
    .from('liveness_challenges')
    .update({
      status: passed ? 'passed' : 'failed',
      completed_at: now,
      confidence_score: (ctx.params.confidenceScore as number) ?? null,
      updated_at: now,
    })
    .eq('id', challengeId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !row) {
    return { error: { code: 'NOT_FOUND', message: 'Pending liveness challenge not found' }, status: 404 };
  }

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.ekyc.livenessComplete',
      success: passed,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { livenessChallenge: toLivenessChallenge(row) } };
}

/**
 * List all eKYC verifications for the authenticated user.
 */
export async function listEKYCVerifications(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = (ctx.params.limit as number) ?? 50;
  const offset = (ctx.params.offset as number) ?? 0;

  const { data: rows, error, count } = await ctx.supabase
    .from('ekyc_verifications')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { verifications: (rows ?? []).map(toEKYCVerification) },
    meta: {
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
    },
  };
}

// =============================================================================
// 4. INTERNATIONAL PAYMENTS (VPA / Pix / UPI / QR)
// =============================================================================

/**
 * List payment aliases (VPA, Pix key, UPI ID, etc.) for the authenticated user.
 */
export async function listPaymentAliases(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.supabase
    .from('payment_aliases')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { aliases: (rows ?? []).map(toPaymentAlias) } };
}

/**
 * Create a new payment alias.
 */
export async function createPaymentAlias(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const aliasType = ctx.params.aliasType as string;
  const aliasValue = ctx.params.aliasValue as string;
  const accountId = ctx.params.accountId as string;

  if (!aliasType || !aliasValue || !accountId) {
    return { error: { code: 'INVALID_PARAMS', message: 'aliasType, aliasValue, and accountId required' }, status: 400 };
  }

  const { data: row, error } = await ctx.supabase
    .from('payment_aliases')
    .insert({
      tenant_id: ctx.firmId,
      user_id: ctx.userId,
      alias_type: aliasType,
      alias_value: aliasValue,
      account_id: accountId,
      currency: (ctx.params.currency as string) ?? null,
      label: (ctx.params.label as string) ?? null,
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.payments.createAlias',
      success: true,
      ip_address: null,
      created_at: new Date().toISOString(),
    })
    .then(() => {});

  return { data: { alias: toPaymentAlias(row) } };
}

/**
 * Soft-delete a payment alias.
 */
export async function deletePaymentAlias(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const aliasId = ctx.params.aliasId as string;
  if (!aliasId) return { error: { code: 'INVALID_PARAMS', message: 'aliasId required' }, status: 400 };

  const now = new Date().toISOString();

  const { data: row, error } = await ctx.supabase
    .from('payment_aliases')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', aliasId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error || !row) {
    return { error: { code: 'NOT_FOUND', message: 'Payment alias not found' }, status: 404 };
  }

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.payments.deleteAlias',
      success: true,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { success: true } };
}

/**
 * Confirm a payee — look up in payee directory or return mock confirmation.
 */
export async function confirmPayee(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const aliasValue = ctx.params.aliasValue as string;
  const aliasType = ctx.params.aliasType as string;

  if (!aliasValue || !aliasType) {
    return { error: { code: 'INVALID_PARAMS', message: 'aliasValue and aliasType required' }, status: 400 };
  }

  const { data: row, error } = await ctx.supabase
    .from('payee_directory')
    .select('*')
    .eq('alias_value', aliasValue)
    .eq('alias_type', aliasType)
    .eq('tenant_id', ctx.firmId)
    .single();

  if (error || !row) {
    // Return mock confirmation when directory entry not found
    return {
      data: {
        confirmation: {
          aliasValue,
          aliasType,
          confirmed: false,
          maskedName: null,
          message: 'Payee not found in directory — proceed with caution',
        },
      },
    };
  }

  return {
    data: {
      confirmation: {
        aliasValue,
        aliasType,
        confirmed: true,
        maskedName: row.masked_name ?? null,
        institution: row.institution ?? null,
      },
    },
  };
}

/**
 * Send an international payment.
 */
export async function sendInternationalPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const fromAccountId = ctx.params.fromAccountId as string;
  const toAlias = ctx.params.toAlias as string;
  const toAliasType = ctx.params.toAliasType as string;
  const amountCents = ctx.params.amountCents as number;
  const currency = ctx.params.currency as string;

  if (!fromAccountId || !toAlias || !toAliasType || !amountCents || !currency) {
    return {
      error: { code: 'INVALID_PARAMS', message: 'fromAccountId, toAlias, toAliasType, amountCents, and currency required' },
      status: 400,
    };
  }

  if (typeof amountCents !== 'number' || amountCents <= 0) {
    return { error: { code: 'INVALID_PARAMS', message: 'amountCents must be a positive integer' }, status: 400 };
  }

  const { data: row, error } = await ctx.supabase
    .from('international_payments')
    .insert({
      tenant_id: ctx.firmId,
      user_id: ctx.userId,
      from_account_id: fromAccountId,
      to_alias: toAlias,
      to_alias_type: toAliasType,
      amount_cents: amountCents,
      currency,
      status: 'pending',
      payment_rail: (ctx.params.paymentRail as string) ?? null,
      description: (ctx.params.description as string) ?? null,
      metadata: (ctx.params.metadata as Record<string, unknown>) ?? {},
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  // Audit log: fire-and-forget
  const now = new Date().toISOString();
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.payments.send',
      success: true,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { payment: toInternationalPayment(row) } };
}

/**
 * Parse a QR payment data string.
 */
export async function parseQRPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const qrData = ctx.params.qrData as string;
  if (!qrData) return { error: { code: 'INVALID_PARAMS', message: 'qrData required' }, status: 400 };

  // Parse common QR formats (Pix EMV, UPI deep link, etc.)
  // Format: scheme://alias?amount=X&currency=Y&description=Z
  try {
    const parsed: Record<string, string | number | null> = {
      raw: qrData,
      alias: null,
      aliasType: null,
      amountCents: null,
      currency: null,
      description: null,
      merchantName: null,
    };

    // Attempt UPI-style parsing: upi://pay?pa=alias&pn=name&am=amount&cu=currency
    if (qrData.startsWith('upi://')) {
      const url = new URL(qrData);
      parsed.alias = url.searchParams.get('pa');
      parsed.aliasType = 'upi';
      parsed.merchantName = url.searchParams.get('pn');
      const am = url.searchParams.get('am');
      parsed.amountCents = am ? Math.round(parseFloat(am) * 100) : null;
      parsed.currency = url.searchParams.get('cu') ?? 'INR';
      parsed.description = url.searchParams.get('tn');
    }
    // Attempt Pix-style parsing (simplified EMV)
    else if (qrData.startsWith('pix://') || qrData.includes('br.gov.bcb.pix')) {
      parsed.aliasType = 'pix';
      // Simplified: extract key from known position
      parsed.alias = qrData;
      parsed.currency = 'BRL';
    }
    // Generic fallback
    else {
      parsed.alias = qrData;
      parsed.aliasType = 'unknown';
    }

    return { data: { parsed } };
  } catch {
    return { error: { code: 'PARSE_ERROR', message: 'Unable to parse QR data' }, status: 400 };
  }
}

/**
 * Generate a QR payment data string for a given alias.
 */
export async function generateQRPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const aliasId = ctx.params.aliasId as string;
  const amountCents = ctx.params.amountCents as number | undefined;
  const description = ctx.params.description as string | undefined;

  if (!aliasId) return { error: { code: 'INVALID_PARAMS', message: 'aliasId required' }, status: 400 };

  const { data: alias, error } = await ctx.supabase
    .from('payment_aliases')
    .select('*')
    .eq('id', aliasId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .is('deleted_at', null)
    .single();

  if (error || !alias) return { error: { code: 'NOT_FOUND', message: 'Payment alias not found' }, status: 404 };

  // Generate QR data based on alias type
  let qrData = '';
  const aliasType = alias.alias_type as string;
  const aliasValue = alias.alias_value as string;

  if (aliasType === 'upi') {
    const params = new URLSearchParams({ pa: aliasValue });
    if (amountCents) params.set('am', (amountCents / 100).toFixed(2));
    if (description) params.set('tn', description);
    params.set('cu', (alias.currency as string) ?? 'INR');
    qrData = `upi://pay?${params.toString()}`;
  } else if (aliasType === 'pix') {
    qrData = `pix://${aliasValue}`;
    if (amountCents) qrData += `?amount=${(amountCents / 100).toFixed(2)}`;
  } else {
    qrData = aliasValue;
  }

  return {
    data: {
      qrData,
      aliasType,
      aliasValue,
      amountCents: amountCents ?? null,
      currency: (alias.currency as string) ?? null,
    },
  };
}

/**
 * List international payments with optional filters.
 */
export async function listInternationalPayments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const status = ctx.params.status as string | undefined;
  const currency = ctx.params.currency as string | undefined;
  const limit = (ctx.params.limit as number) ?? 50;
  const offset = (ctx.params.offset as number) ?? 0;

  let query = ctx.supabase
    .from('international_payments')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }
  if (currency) {
    query = query.eq('currency', currency);
  }

  const { data: rows, error, count } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { payments: (rows ?? []).map(toInternationalPayment) },
    meta: {
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
    },
  };
}

/**
 * Get payment limits for the user's tenant and currency.
 */
export async function getInternationalPaymentLimits(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const currency = ctx.params.currency as string | undefined;

  let query = ctx.supabase
    .from('payment_limits')
    .select('*')
    .eq('tenant_id', ctx.firmId);

  if (currency) {
    query = query.eq('currency', currency);
  }

  const { data: rows, error } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { limits: (rows ?? []).map(toPaymentLimit) } };
}

// =============================================================================
// 5. OPEN FINANCE
// =============================================================================

/**
 * List open finance connections for the authenticated user.
 */
export async function listOpenFinanceConnections(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.supabase
    .from('open_finance_connections')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { connections: (rows ?? []).map(toOpenFinanceConnection) } };
}

/**
 * Create a new open finance connection.
 */
export async function createOpenFinanceConnection(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const institutionId = ctx.params.institutionId as string;
  const institutionName = ctx.params.institutionName as string;
  const consentId = ctx.params.consentId as string | undefined;

  if (!institutionId || !institutionName) {
    return { error: { code: 'INVALID_PARAMS', message: 'institutionId and institutionName required' }, status: 400 };
  }

  const now = new Date().toISOString();

  const { data: row, error } = await ctx.supabase
    .from('open_finance_connections')
    .insert({
      tenant_id: ctx.firmId,
      user_id: ctx.userId,
      institution_id: institutionId,
      institution_name: institutionName,
      consent_id: consentId ?? null,
      status: 'active',
      last_synced_at: now,
      metadata: (ctx.params.metadata as Record<string, unknown>) ?? {},
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.openFinance.createConnection',
      success: true,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { connection: toOpenFinanceConnection(row) } };
}

/**
 * Refresh an open finance connection — update last_synced_at.
 */
export async function refreshOpenFinanceConnection(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const connectionId = ctx.params.connectionId as string;
  if (!connectionId) return { error: { code: 'INVALID_PARAMS', message: 'connectionId required' }, status: 400 };

  const now = new Date().toISOString();

  const { data: row, error } = await ctx.supabase
    .from('open_finance_connections')
    .update({ last_synced_at: now, updated_at: now })
    .eq('id', connectionId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error || !row) {
    return { error: { code: 'NOT_FOUND', message: 'Connection not found' }, status: 404 };
  }

  return { data: { connection: toOpenFinanceConnection(row) } };
}

/**
 * Soft-delete an open finance connection.
 */
export async function removeOpenFinanceConnection(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const connectionId = ctx.params.connectionId as string;
  if (!connectionId) return { error: { code: 'INVALID_PARAMS', message: 'connectionId required' }, status: 400 };

  const now = new Date().toISOString();

  const { data: row, error } = await ctx.supabase
    .from('open_finance_connections')
    .update({ deleted_at: now, status: 'disconnected', updated_at: now })
    .eq('id', connectionId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error || !row) {
    return { error: { code: 'NOT_FOUND', message: 'Connection not found' }, status: 404 };
  }

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'internationalCompliance.openFinance.removeConnection',
      success: true,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { success: true } };
}

/**
 * List accounts from open finance connections.
 */
export async function listOpenFinanceAccounts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const connectionId = ctx.params.connectionId as string | undefined;

  let query = ctx.supabase
    .from('open_finance_accounts')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .order('created_at', { ascending: false });

  if (connectionId) {
    query = query.eq('connection_id', connectionId);
  }

  const { data: rows, error } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { accounts: (rows ?? []).map(toOpenFinanceAccount) } };
}

/**
 * Get net worth — aggregate balances across all open finance connections.
 */
export async function getOpenFinanceNetWorth(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: accounts, error } = await ctx.supabase
    .from('open_finance_accounts')
    .select('balance_cents, currency, account_type, connection_id')
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const rows = accounts ?? [];

  // Aggregate by currency
  const byCurrency: Record<string, { assetsCents: number; liabilitiesCents: number }> = {};
  for (const acct of rows) {
    const cur = (acct.currency as string) ?? 'USD';
    if (!byCurrency[cur]) byCurrency[cur] = { assetsCents: 0, liabilitiesCents: 0 };
    const balance = (acct.balance_cents as number) ?? 0;
    const acctType = acct.account_type as string;
    if (acctType === 'credit' || acctType === 'loan' || acctType === 'mortgage') {
      byCurrency[cur].liabilitiesCents += Math.abs(balance);
    } else {
      byCurrency[cur].assetsCents += balance;
    }
  }

  const netWorthByCurrency: Record<string, { assetsCents: number; liabilitiesCents: number; netWorthCents: number }> = {};
  for (const [cur, totals] of Object.entries(byCurrency)) {
    netWorthByCurrency[cur] = {
      ...totals,
      netWorthCents: totals.assetsCents - totals.liabilitiesCents,
    };
  }

  return {
    data: {
      totalAccounts: rows.length,
      netWorthByCurrency,
    },
  };
}

/**
 * Get alternative credit data — computed from aggregated transaction data.
 */
export async function getAlternativeCreditData(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // Fetch accounts to get connection context
  const { data: accounts, error: acctErr } = await ctx.supabase
    .from('open_finance_accounts')
    .select('id, balance_cents, currency, account_type, connection_id')
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId);

  if (acctErr) return { error: { code: 'DB_ERROR', message: acctErr.message }, status: 500 };

  const acctRows = accounts ?? [];
  const accountIds = acctRows.map(a => a.id as string);

  // Fetch recent transactions (last 90 days) across all open finance accounts
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: transactions, error: txnErr } = await ctx.supabase
    .from('open_finance_transactions')
    .select('amount_cents, category, created_at')
    .in('account_id', accountIds.length > 0 ? accountIds : ['__none__'])
    .gte('created_at', ninetyDaysAgo);

  if (txnErr) return { error: { code: 'DB_ERROR', message: txnErr.message }, status: 500 };

  const txnRows = transactions ?? [];

  // Compute simple alternative credit signals
  const totalIncomeCents = txnRows
    .filter(t => (t.amount_cents as number) > 0)
    .reduce((sum, t) => sum + (t.amount_cents as number), 0);

  const totalExpensesCents = txnRows
    .filter(t => (t.amount_cents as number) < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount_cents as number), 0);

  const categories: Record<string, number> = {};
  for (const t of txnRows) {
    const cat = (t.category as string) ?? 'uncategorized';
    categories[cat] = (categories[cat] ?? 0) + 1;
  }

  const avgMonthlyIncomeCents = Math.round(totalIncomeCents / 3);
  const avgMonthlyExpensesCents = Math.round(totalExpensesCents / 3);

  return {
    data: {
      periodDays: 90,
      totalAccounts: acctRows.length,
      totalTransactions: txnRows.length,
      totalIncomeCents,
      totalExpensesCents,
      avgMonthlyIncomeCents,
      avgMonthlyExpensesCents,
      savingsRateBps: totalIncomeCents > 0
        ? Math.round(((totalIncomeCents - totalExpensesCents) / totalIncomeCents) * 10000)
        : 0,
      categoryBreakdown: categories,
    },
  };
}

// =============================================================================
// ROW MAPPERS
// =============================================================================

function toInternationalConsent(row: Record<string, unknown>) {
  return {
    id: row.id,
    regulation: row.regulation ?? null,
    status: row.status,
    scopes: row.scopes ?? [],
    dataController: row.data_controller ?? null,
    dataProcessor: row.data_processor ?? null,
    purpose: row.purpose ?? null,
    legalBasis: row.legal_basis ?? null,
    expiresAt: row.expires_at ?? null,
    revokedAt: row.revoked_at ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInternationalConsentAccessLog(row: Record<string, unknown>) {
  return {
    id: row.id,
    consentId: row.consent_id,
    accessorId: row.accessor_id ?? null,
    accessorName: row.accessor_name ?? null,
    scope: row.scope,
    action: row.action ?? null,
    ipAddress: row.ip_address ?? null,
    dataPoints: row.data_points ?? 0,
    accessedAt: row.accessed_at,
  };
}

function toSCAConfig(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    requiredFactors: row.required_factors ?? [],
    exemptionThresholdCents: row.exemption_threshold_cents ?? null,
    challengeTimeoutSeconds: row.challenge_timeout_seconds ?? 300,
    trustedDeviceMaxAge: row.trusted_device_max_age ?? null,
    dynamicLinkingEnabled: row.dynamic_linking_enabled ?? false,
    allowedFactorTypes: row.allowed_factor_types ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSCAChallenge(row: Record<string, unknown>) {
  return {
    id: row.id,
    actionType: row.action_type,
    status: row.status,
    requiredFactors: row.required_factors ?? [],
    completedFactors: row.completed_factors ?? [],
    dynamicLinkingData: row.dynamic_linking_data ?? {},
    resourceId: row.resource_id ?? null,
    amountCents: row.amount_cents ?? null,
    currency: row.currency ?? null,
    expiresAt: row.expires_at,
    verifiedAt: row.verified_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSCATrustedDevice(row: Record<string, unknown>) {
  return {
    id: row.id,
    deviceName: row.device_name,
    deviceFingerprint: row.device_fingerprint,
    deviceType: row.device_type,
    platform: row.platform ?? null,
    lastUsedAt: row.last_used_at ?? null,
    createdAt: row.created_at,
  };
}

function toEKYCProvider(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    supportedCountries: row.supported_countries ?? [],
    supportedDocuments: row.supported_documents ?? [],
    livenessSupported: row.liveness_supported ?? false,
    nfcSupported: row.nfc_supported ?? false,
    createdAt: row.created_at,
  };
}

function toEKYCVerification(row: Record<string, unknown>) {
  return {
    id: row.id,
    providerId: row.provider_id,
    documentType: row.document_type,
    countryCode: row.country_code,
    status: row.status,
    result: row.result ?? null,
    confidenceScore: row.confidence_score ?? null,
    rejectionReason: row.rejection_reason ?? null,
    metadata: row.metadata ?? {},
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLivenessChallenge(row: Record<string, unknown>) {
  return {
    id: row.id,
    verificationId: row.verification_id,
    challengeType: row.challenge_type,
    status: row.status,
    confidenceScore: row.confidence_score ?? null,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPaymentAlias(row: Record<string, unknown>) {
  return {
    id: row.id,
    aliasType: row.alias_type,
    aliasValue: row.alias_value,
    accountId: row.account_id,
    currency: row.currency ?? null,
    label: row.label ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInternationalPayment(row: Record<string, unknown>) {
  return {
    id: row.id,
    fromAccountId: row.from_account_id,
    toAlias: row.to_alias,
    toAliasType: row.to_alias_type,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    paymentRail: row.payment_rail ?? null,
    description: row.description ?? null,
    metadata: row.metadata ?? {},
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPaymentLimit(row: Record<string, unknown>) {
  return {
    id: row.id,
    currency: row.currency,
    dailyLimitCents: row.daily_limit_cents ?? null,
    perTransactionLimitCents: row.per_transaction_limit_cents ?? null,
    monthlyLimitCents: row.monthly_limit_cents ?? null,
    paymentRail: row.payment_rail ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toOpenFinanceConnection(row: Record<string, unknown>) {
  return {
    id: row.id,
    institutionId: row.institution_id,
    institutionName: row.institution_name,
    consentId: row.consent_id ?? null,
    status: row.status,
    lastSyncedAt: row.last_synced_at ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toOpenFinanceAccount(row: Record<string, unknown>) {
  return {
    id: row.id,
    connectionId: row.connection_id,
    accountType: row.account_type,
    accountName: row.account_name ?? null,
    maskedAccountNumber: row.masked_account_number ?? null,
    balanceCents: row.balance_cents ?? 0,
    currency: row.currency ?? 'USD',
    institution: row.institution ?? null,
    lastSyncedAt: row.last_synced_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
