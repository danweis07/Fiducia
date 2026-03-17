/**
 * Wire Transfer Domain Handlers
 *
 * Gateway handlers for domestic and international wire transfers.
 * Supports creation, listing, cancellation, fee schedules, and limits.
 *
 * All monetary values are integer cents.
 * Account numbers are always masked in responses (****1234).
 */

import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

function paginate(total: number, limit: number, offset: number): Pagination {
  return { total, limit, offset, hasMore: offset + limit < total };
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return `****${accountNumber}`;
  return `****${accountNumber.slice(-4)}`;
}

function generateReferenceNumber(): string {
  const prefix = 'WR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function isValidRoutingNumber(routing: string): boolean {
  return /^\d{9}$/.test(routing);
}

function isValidSwiftCode(swift: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift.toUpperCase());
}

// =============================================================================
// HANDLERS
// =============================================================================

/** Create a domestic wire transfer */
export async function createDomesticWire(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const {
    fromAccountId, beneficiaryName, bankName, routingNumber,
    accountNumber, amountCents, memo, purpose,
  } = ctx.params as {
    fromAccountId: string; beneficiaryName: string; bankName: string;
    routingNumber: string; accountNumber: string; amountCents: number;
    memo?: string; purpose: string;
  };

  if (!fromAccountId || !beneficiaryName || !bankName || !routingNumber || !accountNumber || !amountCents || !purpose) {
    return { error: { code: 'VALIDATION_ERROR', message: 'fromAccountId, beneficiaryName, bankName, routingNumber, accountNumber, amountCents, and purpose are required' }, status: 400 };
  }

  if (!isValidRoutingNumber(routingNumber)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Routing number must be exactly 9 digits' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'amountCents must be positive' }, status: 400 };
  }

  // Fetch wire limits for this user
  const { data: limitsData } = await ctx.db
    .from('wire_fees')
    .select('daily_limit_cents, per_transaction_limit_cents')
    .eq('firm_id', ctx.firmId)
    .limit(1)
    .single();

  const perTxnLimit = limitsData?.per_transaction_limit_cents ?? 25000000; // $250k default
  const dailyLimit = limitsData?.daily_limit_cents ?? 50000000; // $500k default

  if (amountCents > perTxnLimit) {
    return { error: { code: 'LIMIT_EXCEEDED', message: `Amount exceeds per-transaction limit of ${perTxnLimit} cents` }, status: 400 };
  }

  // Check daily usage
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayWires } = await ctx.db
    .from('wire_transfers')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .gte('created_at', todayStart.toISOString())
    .not('status', 'in', '("cancelled","failed")');

  const usedToday = (todayWires ?? []).reduce((sum: number, w: { amount_cents: number }) => sum + w.amount_cents, 0);
  if (usedToday + amountCents > dailyLimit) {
    return { error: { code: 'DAILY_LIMIT_EXCEEDED', message: 'Wire would exceed your daily transfer limit' }, status: 400 };
  }

  // Fetch fee
  const feeCents = limitsData ? 2500 : 2500; // $25 domestic fee default

  // Verify from account belongs to user
  const { data: account } = await ctx.db
    .from('accounts')
    .select('id, account_number_masked')
    .eq('id', fromAccountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!account) {
    return { error: { code: 'NOT_FOUND', message: 'Source account not found' }, status: 404 };
  }

  const referenceNumber = generateReferenceNumber();
  const estimatedCompletion = new Date();
  estimatedCompletion.setDate(estimatedCompletion.getDate() + 1);

  const { data: wire, error } = await ctx.db
    .from('wire_transfers')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      type: 'domestic',
      from_account_id: fromAccountId,
      from_account_masked: account.account_number_masked,
      beneficiary_name: beneficiaryName,
      bank_name: bankName,
      routing_number: routingNumber,
      account_number_masked: maskAccountNumber(accountNumber),
      amount_cents: amountCents,
      fee_cents: feeCents,
      currency: 'USD',
      memo: memo ?? null,
      purpose,
      reference_number: referenceNumber,
      status: 'pending',
      estimated_completion_date: estimatedCompletion.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create wire transfer' }, status: 500 };
  }

  return {
    data: {
      wire: {
        id: wire.id,
        type: wire.type,
        fromAccountId: wire.from_account_id,
        fromAccountMasked: wire.from_account_masked,
        beneficiaryName: wire.beneficiary_name,
        bankName: wire.bank_name,
        routingNumber: wire.routing_number,
        accountNumberMasked: wire.account_number_masked,
        amountCents: wire.amount_cents,
        feeCents: wire.fee_cents,
        currency: wire.currency,
        memo: wire.memo,
        purpose: wire.purpose,
        referenceNumber: wire.reference_number,
        status: wire.status,
        estimatedCompletionDate: wire.estimated_completion_date,
        completedAt: wire.completed_at,
        failureReason: wire.failure_reason,
        createdAt: wire.created_at,
        updatedAt: wire.updated_at,
      },
    },
  };
}

/** Create an international wire transfer */
export async function createInternationalWire(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const {
    fromAccountId, beneficiaryName, swiftCode, iban, bankName,
    bankCountry, amountCents, currency, memo, purpose,
  } = ctx.params as {
    fromAccountId: string; beneficiaryName: string; swiftCode: string;
    iban: string; bankName: string; bankCountry: string;
    amountCents: number; currency: string; memo?: string; purpose: string;
  };

  if (!fromAccountId || !beneficiaryName || !swiftCode || !iban || !bankName || !bankCountry || !amountCents || !currency || !purpose) {
    return { error: { code: 'VALIDATION_ERROR', message: 'fromAccountId, beneficiaryName, swiftCode, iban, bankName, bankCountry, amountCents, currency, and purpose are required' }, status: 400 };
  }

  if (!isValidSwiftCode(swiftCode)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'SWIFT code must be 8 or 11 alphanumeric characters' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'amountCents must be positive' }, status: 400 };
  }

  // Fetch wire limits
  const { data: limitsData } = await ctx.db
    .from('wire_fees')
    .select('daily_limit_cents, per_transaction_limit_cents')
    .eq('firm_id', ctx.firmId)
    .limit(1)
    .single();

  const perTxnLimit = limitsData?.per_transaction_limit_cents ?? 25000000;
  const dailyLimit = limitsData?.daily_limit_cents ?? 50000000;

  if (amountCents > perTxnLimit) {
    return { error: { code: 'LIMIT_EXCEEDED', message: `Amount exceeds per-transaction limit of ${perTxnLimit} cents` }, status: 400 };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayWires } = await ctx.db
    .from('wire_transfers')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .gte('created_at', todayStart.toISOString())
    .not('status', 'in', '("cancelled","failed")');

  const usedToday = (todayWires ?? []).reduce((sum: number, w: { amount_cents: number }) => sum + w.amount_cents, 0);
  if (usedToday + amountCents > dailyLimit) {
    return { error: { code: 'DAILY_LIMIT_EXCEEDED', message: 'Wire would exceed your daily transfer limit' }, status: 400 };
  }

  const feeCents = 4500; // $45 international fee default

  const { data: account } = await ctx.db
    .from('accounts')
    .select('id, account_number_masked')
    .eq('id', fromAccountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!account) {
    return { error: { code: 'NOT_FOUND', message: 'Source account not found' }, status: 404 };
  }

  const referenceNumber = generateReferenceNumber();
  const estimatedCompletion = new Date();
  estimatedCompletion.setDate(estimatedCompletion.getDate() + 3);

  const { data: wire, error } = await ctx.db
    .from('wire_transfers')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      type: 'international',
      from_account_id: fromAccountId,
      from_account_masked: account.account_number_masked,
      beneficiary_name: beneficiaryName,
      bank_name: bankName,
      swift_code: swiftCode.toUpperCase(),
      iban,
      bank_country: bankCountry,
      account_number_masked: maskAccountNumber(iban),
      amount_cents: amountCents,
      fee_cents: feeCents,
      currency: currency.toUpperCase(),
      memo: memo ?? null,
      purpose,
      reference_number: referenceNumber,
      status: 'pending',
      estimated_completion_date: estimatedCompletion.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create wire transfer' }, status: 500 };
  }

  return {
    data: {
      wire: {
        id: wire.id,
        type: wire.type,
        fromAccountId: wire.from_account_id,
        fromAccountMasked: wire.from_account_masked,
        beneficiaryName: wire.beneficiary_name,
        bankName: wire.bank_name,
        swiftCode: wire.swift_code,
        iban: wire.iban,
        bankCountry: wire.bank_country,
        accountNumberMasked: wire.account_number_masked,
        amountCents: wire.amount_cents,
        feeCents: wire.fee_cents,
        currency: wire.currency,
        memo: wire.memo,
        purpose: wire.purpose,
        referenceNumber: wire.reference_number,
        status: wire.status,
        estimatedCompletionDate: wire.estimated_completion_date,
        completedAt: wire.completed_at,
        failureReason: wire.failure_reason,
        createdAt: wire.created_at,
        updatedAt: wire.updated_at,
      },
    },
  };
}

/** List wire transfers with pagination and filters */
export async function listWires(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status, type, fromDate, toDate, limit = 20, offset = 0 } = ctx.params as {
    status?: string; type?: string; fromDate?: string; toDate?: string;
    limit?: number; offset?: number;
  };

  let query = ctx.db
    .from('wire_transfers')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);
  if (fromDate) query = query.gte('created_at', fromDate);
  if (toDate) query = query.lte('created_at', toDate);

  const { data: wires, count, error } = await query;

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list wire transfers' }, status: 500 };
  }

  const total = count ?? 0;

  return {
    data: {
      wires: (wires ?? []).map((w: Record<string, unknown>) => ({
        id: w.id,
        type: w.type,
        fromAccountId: w.from_account_id,
        fromAccountMasked: w.from_account_masked,
        beneficiaryName: w.beneficiary_name,
        bankName: w.bank_name,
        routingNumber: w.routing_number,
        accountNumberMasked: w.account_number_masked,
        swiftCode: w.swift_code,
        iban: w.iban,
        bankCountry: w.bank_country,
        amountCents: w.amount_cents,
        feeCents: w.fee_cents,
        currency: w.currency,
        memo: w.memo,
        purpose: w.purpose,
        referenceNumber: w.reference_number,
        status: w.status,
        estimatedCompletionDate: w.estimated_completion_date,
        completedAt: w.completed_at,
        failureReason: w.failure_reason,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      })),
    },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

/** Get a single wire transfer by ID */
export async function getWire(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as { id: string };
  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  const { data: w, error } = await ctx.db
    .from('wire_transfers')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (error || !w) {
    return { error: { code: 'NOT_FOUND', message: 'Wire transfer not found' }, status: 404 };
  }

  return {
    data: {
      wire: {
        id: w.id,
        type: w.type,
        fromAccountId: w.from_account_id,
        fromAccountMasked: w.from_account_masked,
        beneficiaryName: w.beneficiary_name,
        bankName: w.bank_name,
        routingNumber: w.routing_number,
        accountNumberMasked: w.account_number_masked,
        swiftCode: w.swift_code,
        iban: w.iban,
        bankCountry: w.bank_country,
        amountCents: w.amount_cents,
        feeCents: w.fee_cents,
        currency: w.currency,
        memo: w.memo,
        purpose: w.purpose,
        referenceNumber: w.reference_number,
        status: w.status,
        estimatedCompletionDate: w.estimated_completion_date,
        completedAt: w.completed_at,
        failureReason: w.failure_reason,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      },
    },
  };
}

/** Cancel a pending wire transfer */
export async function cancelWire(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as { id: string };
  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  const { data: wire } = await ctx.db
    .from('wire_transfers')
    .select('id, status')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!wire) {
    return { error: { code: 'NOT_FOUND', message: 'Wire transfer not found' }, status: 404 };
  }

  if (wire.status !== 'pending') {
    return { error: { code: 'INVALID_STATE', message: 'Only pending wire transfers can be cancelled' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('wire_transfers')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel wire transfer' }, status: 500 };
  }

  return { data: { success: true } };
}

/** Get wire fee schedule for the tenant */
export async function getWireFees(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: fees } = await ctx.db
    .from('wire_fees')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .limit(1)
    .single();

  return {
    data: {
      fees: {
        domesticFeeCents: fees?.domestic_fee_cents ?? 2500,
        internationalFeeCents: fees?.international_fee_cents ?? 4500,
        expeditedDomesticFeeCents: fees?.expedited_domestic_fee_cents ?? 3500,
        expeditedInternationalFeeCents: fees?.expedited_international_fee_cents ?? 6500,
      },
    },
  };
}

/** Get current user's wire transfer limits and remaining daily allowance */
export async function getWireLimits(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: fees } = await ctx.db
    .from('wire_fees')
    .select('daily_limit_cents, per_transaction_limit_cents')
    .eq('firm_id', ctx.firmId)
    .limit(1)
    .single();

  const dailyLimitCents = fees?.daily_limit_cents ?? 50000000;
  const perTransactionLimitCents = fees?.per_transaction_limit_cents ?? 25000000;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayWires } = await ctx.db
    .from('wire_transfers')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .gte('created_at', todayStart.toISOString())
    .not('status', 'in', '("cancelled","failed")');

  const usedTodayCents = (todayWires ?? []).reduce((sum: number, w: { amount_cents: number }) => sum + w.amount_cents, 0);

  return {
    data: {
      limits: {
        dailyLimitCents,
        perTransactionLimitCents,
        usedTodayCents,
        remainingDailyCents: Math.max(0, dailyLimitCents - usedTodayCents),
      },
    },
  };
}
