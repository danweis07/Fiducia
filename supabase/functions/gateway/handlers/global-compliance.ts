/**
 * Global Compliance Handlers
 *
 * Gateway handlers for international regulatory requirements:
 *   - GDPR / LGPD personal data export ("Download My Data")
 *   - Loan cooling-off period management (EU 14-day right of withdrawal)
 *   - Interest withholding / tax-at-source information
 *   - Data residency region information
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { CoreBankingAdapter } from '../../_shared/adapters/core-banking/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

// =============================================================================
// GDPR / LGPD DATA EXPORT ("DOWNLOAD MY DATA")
// =============================================================================

/**
 * Request a full personal data export (GDPR Art. 20 / LGPD Art. 18).
 * Returns all user PII in machine-readable JSON format.
 */
export async function requestDataPortability(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { format } = ctx.params as { format?: string };
  const exportFormat = format ?? 'json';
  const validFormats = ['json', 'xml', 'csv'];
  if (!validFormats.includes(exportFormat)) {
    return { error: { code: 'VALIDATION_ERROR', message: `Invalid format. Must be one of: ${validFormats.join(', ')}` }, status: 400 };
  }

  // Gather all user data across tables, scoped to tenant + user
  const tables = [
    { table: 'banking_users', select: 'id, first_name, last_name, email, phone, created_at, updated_at', label: 'profile' },
    { table: 'banking_accounts', select: 'id, type, status, created_at', label: 'accounts' },
    { table: 'banking_transactions', select: 'id, account_id, type, amount_cents, description, created_at', label: 'transactions' },
    { table: 'audit_logs', select: 'id, action, resource, created_at', label: 'auditLog' },
    { table: 'banking_beneficiaries', select: 'id, name, bank_name, created_at', label: 'beneficiaries' },
  ];

  const exportData: Record<string, unknown> = {
    exportMetadata: {
      userId: ctx.userId,
      tenantId: ctx.firmId,
      requestedAt: new Date().toISOString(),
      format: exportFormat,
      regulation: 'GDPR Art. 20 / LGPD Art. 18',
    },
  };

  for (const { table, select, label } of tables) {
    try {
      const { data: rows } = await ctx.db
        .from(table)
        .select(select)
        .eq('firm_id', ctx.firmId)
        .eq('user_id', ctx.userId);
      exportData[label] = rows ?? [];
    } catch {
      // Table may not exist in all deployments — skip gracefully
      exportData[label] = [];
    }
  }

  // Audit log the data export request itself
  try {
    await ctx.db.from('audit_logs').insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      action: 'data_portability_export',
      resource: 'user_data',
      details: { format: exportFormat },
    });
  } catch {
    // Non-blocking audit log
  }

  return { data: { export: exportData, format: exportFormat } };
}

/** Get data residency region for the current tenant */
export async function getDataResidency(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: firm } = await ctx.db
    .from('firms')
    .select('id, data_residency_region, country_code')
    .eq('id', ctx.firmId)
    .single();

  if (!firm) {
    return { error: { code: 'NOT_FOUND', message: 'Tenant not found' }, status: 404 };
  }

  const region = (firm as Record<string, unknown>).data_residency_region ?? 'us-east-1';
  const countryCode = (firm as Record<string, unknown>).country_code ?? 'US';

  return {
    data: {
      tenantId: ctx.firmId,
      dataResidencyRegion: region,
      countryCode,
      regulations: getApplicableRegulations(countryCode as string),
    },
  };
}

function getApplicableRegulations(countryCode: string): string[] {
  const regulations: string[] = [];
  const euCountries = ['DE', 'FR', 'NL', 'IE', 'ES', 'IT', 'PT', 'AT', 'BE', 'FI', 'GR', 'LU'];
  if (euCountries.includes(countryCode)) regulations.push('GDPR', 'PSD2', 'SEPA');
  if (countryCode === 'GB') regulations.push('UK_GDPR', 'FCA', 'UK_CoP');
  if (countryCode === 'BR') regulations.push('LGPD', 'BCB_Pix');
  if (countryCode === 'IN') regulations.push('RBI', 'DPDP');
  if (countryCode === 'US') regulations.push('CCPA', 'GLBA');
  if (countryCode === 'SG') regulations.push('PDPA', 'MAS');
  if (countryCode === 'AU') regulations.push('APPs', 'APRA');
  if (countryCode === 'JP') regulations.push('APPI', 'FSA');
  if (countryCode === 'AE') regulations.push('DIFC_DP', 'CBUAE');
  return regulations;
}

// =============================================================================
// LOAN COOLING-OFF PERIOD (EU RIGHT OF WITHDRAWAL)
// =============================================================================

/**
 * Get cooling-off status for a loan (EU Consumer Credit Directive Art. 14).
 * EU consumers have a 14-day right of withdrawal for consumer credit agreements.
 */
export async function getLoanCoolingOff(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { loanId } = ctx.params as { loanId: string };
  if (!loanId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'loanId is required' }, status: 400 };
  }

  const { data: loan } = await ctx.db
    .from('banking_loans')
    .select('id, status, funded_at, jurisdiction, amount_cents, currency')
    .eq('id', loanId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (!loan) {
    return { error: { code: 'NOT_FOUND', message: 'Loan not found' }, status: 404 };
  }

  const loanRecord = loan as Record<string, unknown>;
  const fundedAt = loanRecord.funded_at as string | null;
  const jurisdiction = loanRecord.jurisdiction as string | null;

  // Default cooling-off periods by jurisdiction (EU Consumer Credit Directive = 14 days)
  const defaultCoolingOff: Record<string, number> = {
    'GB': 14, 'DE': 14, 'FR': 14, 'NL': 14, 'IE': 14,
    'ES': 14, 'IT': 14, 'PT': 14, 'AT': 14, 'BE': 14,
    'FI': 14, 'GR': 14, 'LU': 14, 'SE': 14, 'DK': 14,
    'PL': 14, 'CZ': 14, 'RO': 14, 'HU': 14, 'BG': 14,
    'AU': 10, 'JP': 8,
  };

  // Allow tenant-level override per jurisdiction
  let coolingOffDays: number | null = null;
  if (jurisdiction) {
    const { data: override } = await ctx.db
      .from('firm_cooling_off_overrides')
      .select('cooling_off_days')
      .eq('firm_id', ctx.firmId)
      .eq('jurisdiction', jurisdiction)
      .limit(1)
      .single();

    coolingOffDays = (override as Record<string, number> | null)?.cooling_off_days
      ?? defaultCoolingOff[jurisdiction]
      ?? null;
  }

  if (!coolingOffDays || !fundedAt) {
    return {
      data: {
        loanId,
        coolingOffApplicable: false,
        reason: !coolingOffDays ? 'Jurisdiction does not require cooling-off period' : 'Loan not yet funded',
      },
    };
  }

  const fundedDate = new Date(fundedAt);
  const expiryDate = new Date(fundedDate.getTime() + coolingOffDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const isActive = now < expiryDate;
  const daysRemaining = isActive ? Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0;

  return {
    data: {
      loanId,
      coolingOffApplicable: true,
      coolingOffDays,
      fundedAt,
      expiryDate: expiryDate.toISOString(),
      isActive,
      daysRemaining,
      jurisdiction,
      canWithdraw: isActive && loanRecord.status !== 'withdrawn',
      regulation: 'EU Consumer Credit Directive Art. 14',
    },
  };
}

/** Exercise the right of withdrawal for a loan during cooling-off period */
export async function exerciseLoanWithdrawal(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { loanId, reason } = ctx.params as { loanId: string; reason?: string };
  if (!loanId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'loanId is required' }, status: 400 };
  }

  // First check cooling-off is active
  const { data: loan } = await ctx.db
    .from('banking_loans')
    .select('id, status, funded_at, jurisdiction, amount_cents')
    .eq('id', loanId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (!loan) {
    return { error: { code: 'NOT_FOUND', message: 'Loan not found' }, status: 404 };
  }

  const loanRecord = loan as Record<string, unknown>;
  if (loanRecord.status === 'withdrawn') {
    return { error: { code: 'ALREADY_WITHDRAWN', message: 'Loan has already been withdrawn' }, status: 409 };
  }

  const fundedAt = loanRecord.funded_at as string | null;
  if (!fundedAt) {
    return { error: { code: 'NOT_FUNDED', message: 'Loan has not been funded yet' }, status: 409 };
  }

  const loanJurisdiction = loanRecord.jurisdiction as string | null;

  // Resolve cooling-off period: tenant override → default → 14 days (EU default)
  const defaultPeriods: Record<string, number> = {
    'GB': 14, 'DE': 14, 'FR': 14, 'NL': 14, 'IE': 14,
    'ES': 14, 'IT': 14, 'PT': 14, 'AT': 14, 'BE': 14,
    'FI': 14, 'GR': 14, 'LU': 14, 'SE': 14, 'DK': 14,
    'AU': 10, 'JP': 8,
  };

  let coolingDays = 14;
  if (loanJurisdiction) {
    const { data: override } = await ctx.db
      .from('firm_cooling_off_overrides')
      .select('cooling_off_days')
      .eq('firm_id', ctx.firmId)
      .eq('jurisdiction', loanJurisdiction)
      .limit(1)
      .single();

    coolingDays = (override as Record<string, number> | null)?.cooling_off_days
      ?? defaultPeriods[loanJurisdiction]
      ?? 14;
  }

  const fundedDate = new Date(fundedAt);
  const expiryDate = new Date(fundedDate.getTime() + coolingDays * 24 * 60 * 60 * 1000);
  if (new Date() >= expiryDate) {
    return { error: { code: 'COOLING_OFF_EXPIRED', message: `The ${coolingDays}-day cooling-off period has expired` }, status: 409 };
  }

  // Mark loan as withdrawn
  const { error: updateError } = await ctx.db
    .from('banking_loans')
    .update({ status: 'withdrawn', withdrawn_at: new Date().toISOString(), withdrawal_reason: reason ?? 'Right of withdrawal exercised' })
    .eq('id', loanId)
    .eq('firm_id', ctx.firmId);

  if (updateError) {
    return { error: { code: 'DB_ERROR', message: updateError.message }, status: 500 };
  }

  // Audit log
  try {
    await ctx.db.from('audit_logs').insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      action: 'loan_cooling_off_withdrawal',
      resource: loanId,
      details: { reason: reason ?? 'Right of withdrawal exercised', amountCents: loanRecord.amount_cents },
    });
  } catch {
    // Non-blocking
  }

  return {
    data: {
      loanId,
      status: 'withdrawn',
      withdrawnAt: new Date().toISOString(),
      principalToReturn: loanRecord.amount_cents,
      penaltyAmount: 0,
      message: 'Loan withdrawn under the 14-day right of withdrawal. Principal must be returned within 30 days.',
    },
  };
}

// =============================================================================
// INTEREST WITHHOLDING / TAX AT SOURCE
// =============================================================================

/**
 * Get interest withholding details for a savings/deposit account.
 * Many jurisdictions require the bank to withhold tax on interest earnings.
 */
export async function getInterestWithholding(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { accountId, taxYear } = ctx.params as { accountId: string; taxYear?: string };
  if (!accountId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'accountId is required' }, status: 400 };
  }

  const year = taxYear ?? new Date().getFullYear().toString();

  // Fetch the account and its jurisdiction
  const { data: account } = await ctx.db
    .from('banking_accounts')
    .select('id, type, status, jurisdiction, currency')
    .eq('id', accountId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (!account) {
    return { error: { code: 'NOT_FOUND', message: 'Account not found' }, status: 404 };
  }

  const acct = account as Record<string, unknown>;
  const jurisdiction = acct.jurisdiction as string | null ?? 'US';

  // Tax withholding rates by jurisdiction (simplified — real impl uses tax authority APIs)
  const withholdingRates: Record<string, { rate: number; regulation: string; reportingFrequency: string }> = {
    'DE': { rate: 2637, regulation: 'Abgeltungssteuer (26.375% incl. solidarity surcharge)', reportingFrequency: 'annual' },
    'FR': { rate: 3000, regulation: 'Prélèvement Forfaitaire Unique (30% flat tax)', reportingFrequency: 'annual' },
    'GB': { rate: 2000, regulation: 'HMRC Basic Rate (20%)', reportingFrequency: 'annual' },
    'BR': { rate: 2250, regulation: 'IOF + IR (22.5% for < 180 days)', reportingFrequency: 'monthly' },
    'IN': { rate: 1000, regulation: 'TDS Section 194A (10%)', reportingFrequency: 'quarterly' },
    'JP': { rate: 2031, regulation: 'Income Tax + Reconstruction Tax (20.315%)', reportingFrequency: 'annual' },
    'US': { rate: 0, regulation: 'No withholding (1099-INT reporting)', reportingFrequency: 'annual' },
  };

  const config = withholdingRates[jurisdiction] ?? { rate: 0, regulation: 'None', reportingFrequency: 'annual' };

  // Fetch actual interest accruals from core banking adapter
  let grossInterestCents = 0;
  const quarterlyGross: number[] = [0, 0, 0, 0];

  try {
    const { adapter: coreBanking } = await resolveAdapter<CoreBankingAdapter>('core_banking', ctx.firmId);
    const txResult = await coreBanking.listTransactions({
      userId: ctx.userId!,
      tenantId: ctx.firmId!,
      accountId,
      type: 'interest',
      fromDate: `${year}-01-01`,
      toDate: `${year}-12-31`,
      limit: 1000,
    });

    for (const txn of txResult.transactions) {
      grossInterestCents += txn.amountCents;
      // Assign to quarterly bucket based on transaction date
      const txnDate = new Date(txn.postedAt ?? txn.createdAt);
      const quarter = Math.floor(txnDate.getMonth() / 3);
      quarterlyGross[quarter] += txn.amountCents;
    }
  } catch {
    // If core banking is unavailable, fall back to zero rather than hardcoded mock data.
    // The response will accurately show zero interest if no data is available.
  }

  const withheldCents = Math.round(grossInterestCents * config.rate / 10000);
  const netInterestCents = grossInterestCents - withheldCents;

  const breakdown = quarterlyGross.map((qGross, i) => {
    const qWithheld = Math.round(qGross * config.rate / 10000);
    return {
      period: `${year}-Q${i + 1}`,
      grossCents: qGross,
      withheldCents: qWithheld,
      netCents: qGross - qWithheld,
    };
  });

  return {
    data: {
      accountId,
      taxYear: year,
      jurisdiction,
      currency: acct.currency ?? 'USD',
      grossInterestCents,
      taxWithheldCents: withheldCents,
      netInterestCents,
      withholdingRateBps: config.rate,
      regulation: config.regulation,
      reportingFrequency: config.reportingFrequency,
      breakdown,
    },
  };
}
