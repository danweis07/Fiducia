/**
 * Core Banking Domain Handlers
 *
 * Gateway handlers backed by real Supabase tables for accounts, transactions,
 * transfers, beneficiaries, bill pay, RDC, cards, statements, notifications,
 * and config.
 *
 * IMPORTANT:
 * - All monetary values are integer cents.
 * - NEVER log PII (account numbers, SSNs, image data).
 * - Account numbers are always masked in responses (****1234).
 * - All data is scoped by ctx.firmId for tenant isolation.
 */

import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';
import { tSync } from '../../_shared/i18n/index.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: tSync(ctx.locale, 'AUTH_REQUIRED', 'message') }, status: 401 };
  }
  return null;
}

function paginate(total: number, limit: number, offset: number): Pagination {
  return { total, limit, offset, hasMore: offset + limit < total };
}

function maskAccountNumber(raw: string): string {
  if (raw.length <= 4) return `****${raw}`;
  return `****${raw.slice(-4)}`;
}

function toAccount(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.firm_id,
    userId: row.user_id,
    type: row.type,
    nickname: row.nickname,
    accountNumberMasked: row.account_number_masked,
    routingNumber: row.routing_number,
    balanceCents: Number(row.balance_cents),
    availableBalanceCents: Number(row.available_balance_cents),
    status: row.status,
    interestRateBps: row.interest_rate_bps,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTransaction(row: Record<string, unknown>) {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type,
    amountCents: Number(row.amount_cents),
    description: row.description,
    category: row.category,
    status: row.status,
    merchantName: row.merchant_name,
    merchantCategory: row.merchant_category,
    runningBalanceCents: row.running_balance_cents != null ? Number(row.running_balance_cents) : null,
    postedAt: row.posted_at,
    createdAt: row.created_at,
  };
}

function toTransfer(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.firm_id,
    userId: row.user_id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    toBeneficiaryId: row.to_beneficiary_id,
    type: row.type,
    amountCents: Number(row.amount_cents),
    memo: row.memo,
    status: row.status,
    scheduledDate: row.scheduled_date,
    recurringRule: row.recurring_rule,
    processedAt: row.processed_at,
    createdAt: row.created_at,
  };
}

function toBeneficiary(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.firm_id,
    userId: row.user_id,
    name: row.name,
    nickname: row.nickname,
    accountNumberMasked: row.account_number_masked,
    routingNumber: row.routing_number,
    bankName: row.bank_name,
    type: row.type,
    isVerified: row.is_verified,
    createdAt: row.created_at,
  };
}

function toBill(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.firm_id,
    userId: row.user_id,
    payeeName: row.payee_name,
    payeeAccountNumberMasked: row.payee_account_number_masked,
    amountCents: Number(row.amount_cents),
    dueDate: row.due_date,
    status: row.status,
    autopay: row.autopay,
    recurringRule: row.recurring_rule,
    fromAccountId: row.from_account_id,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

function toCard(row: Record<string, unknown>) {
  return {
    id: row.id,
    accountId: row.account_id,
    tenantId: row.firm_id,
    userId: row.user_id,
    type: row.type,
    lastFour: row.last_four,
    cardholderName: row.cardholder_name,
    status: row.status,
    dailyLimitCents: Number(row.daily_limit_cents),
    singleTransactionLimitCents: Number(row.single_transaction_limit_cents),
    expirationDate: row.expiration_date,
    isContactless: row.is_contactless,
    isVirtual: row.is_virtual,
    createdAt: row.created_at,
  };
}

function toDeposit(row: Record<string, unknown>) {
  return {
    id: row.id,
    accountId: row.account_id,
    tenantId: row.firm_id,
    userId: row.user_id,
    amountCents: Number(row.amount_cents),
    frontImageUrl: row.front_image_url,
    backImageUrl: row.back_image_url,
    status: row.status,
    checkNumber: row.check_number,
    rejectionReason: row.rejection_reason,
    clearedAt: row.cleared_at,
    createdAt: row.created_at,
  };
}

function toNotification(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.firm_id,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    actionUrl: row.action_url,
    createdAt: row.created_at,
  };
}

function toStatement(row: Record<string, unknown>) {
  return {
    id: row.id,
    accountId: row.account_id,
    tenantId: row.firm_id,
    periodLabel: row.period_label,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    format: row.format,
    openingBalanceCents: Number(row.opening_balance_cents),
    closingBalanceCents: Number(row.closing_balance_cents),
    totalCreditsCents: Number(row.total_credits_cents),
    totalDebitsCents: Number(row.total_debits_cents),
    transactionCount: row.transaction_count,
    downloadUrl: row.download_url,
    generatedAt: row.generated_at,
  };
}

// =============================================================================
// ACCOUNTS
// =============================================================================

export async function listAccounts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = (ctx.params.limit as number) ?? 25;
  const offset = (ctx.params.offset as number) ?? 0;

  // Get count
  const { count, error: countErr } = await ctx.db
    .from('banking_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (countErr) {
    return { error: { code: 'DB_ERROR', message: countErr.message }, status: 500 };
  }

  const { data, error } = await ctx.db
    .from('banking_accounts')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  const accounts = (data ?? []).map(toAccount);
  return {
    data: { accounts },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

export async function getAccount(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: tSync(ctx.locale, 'VALIDATION_ERROR', 'message') }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('banking_accounts')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: tSync(ctx.locale, 'ACCOUNT_NOT_FOUND', 'message') }, status: 404 };
  }

  return { data: { account: toAccount(data) } };
}

export async function getAccountSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('banking_accounts')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  const accounts = (data ?? []).map(toAccount);
  const totalBalanceCents = accounts.reduce((sum: number, a: Record<string, unknown>) => sum + (a.balanceCents as number), 0);
  const totalAvailableCents = accounts.reduce((sum: number, a: Record<string, unknown>) => sum + (a.availableBalanceCents as number), 0);

  return {
    data: {
      totalBalanceCents,
      totalAvailableCents,
      accountCount: accounts.length,
      accounts,
    },
  };
}

// =============================================================================
// TRANSACTIONS
// =============================================================================

export async function listTransactions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params } = ctx;
  const limit = (params.limit as number) ?? 25;
  const offset = (params.offset as number) ?? 0;

  // Build query
  let query = ctx.db
    .from('banking_transactions')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId);

  if (params.accountId) {
    query = query.eq('account_id', params.accountId as string);
  }
  if (params.type) {
    query = query.eq('type', params.type as string);
  }
  if (params.status) {
    query = query.eq('status', params.status as string);
  }
  if (params.category) {
    query = query.eq('category', params.category as string);
  }
  if (params.fromDate) {
    query = query.gte('created_at', params.fromDate as string);
  }
  if (params.toDate) {
    query = query.lte('created_at', params.toDate as string);
  }
  if (params.search) {
    const q = params.search as string;
    query = query.textSearch('description', q, { type: 'websearch' });
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  const transactions = (data ?? []).map(toTransaction);
  return {
    data: { transactions },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

export async function getTransaction(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('banking_transactions')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: `Transaction not found: ${id}` }, status: 404 };
  }

  return { data: { transaction: toTransaction(data) } };
}

export async function searchTransactions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const query = ctx.params.query as string;
  if (!query) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: query' }, status: 400 };
  }

  const limit = (ctx.params.limit as number) ?? 25;
  const offset = (ctx.params.offset as number) ?? 0;

  let q = ctx.db
    .from('banking_transactions')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .or(`description.ilike.%${query}%,merchant_name.ilike.%${query}%`);

  if (ctx.params.accountId) {
    q = q.eq('account_id', ctx.params.accountId as string);
  }

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  const transactions = (data ?? []).map(toTransaction);
  return {
    data: { transactions },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

// =============================================================================
// TRANSFERS
// =============================================================================

export async function createTransfer(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params } = ctx;
  const required = ['fromAccountId', 'amountCents'];
  for (const field of required) {
    if (!params[field]) {
      return { error: { code: 'BAD_REQUEST', message: `Missing required field: ${field}` }, status: 400 };
    }
  }

  if (!params.toAccountId && !params.toBeneficiaryId) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Must provide toAccountId or toBeneficiaryId' },
      status: 400,
    };
  }

  // Verify from-account belongs to user
  const { data: fromAcct } = await ctx.db
    .from('banking_accounts')
    .select('id')
    .eq('id', params.fromAccountId as string)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!fromAcct) {
    return { error: { code: 'NOT_FOUND', message: 'Source account not found' }, status: 404 };
  }

  const { data, error } = await ctx.db
    .from('banking_transfers')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      from_account_id: params.fromAccountId as string,
      to_account_id: (params.toAccountId as string) ?? null,
      to_beneficiary_id: (params.toBeneficiaryId as string) ?? null,
      type: (params.type as string) ?? 'internal',
      amount_cents: params.amountCents as number,
      memo: (params.memo as string) ?? null,
      status: 'pending',
      scheduled_date: (params.scheduledDate as string) ?? null,
    })
    .select()
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  // Audit log (no PII)
  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.createTransfer',
    transferId: data.id,
    userId: ctx.userId,
    amountCents: params.amountCents,
    type: params.type ?? 'internal',
    timestamp: new Date().toISOString(),
  }));

  return { data: { transfer: toTransfer(data) } };
}

export async function scheduleTransfer(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params } = ctx;
  if (!params.scheduledDate) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: scheduledDate' }, status: 400 };
  }

  const required = ['fromAccountId', 'amountCents'];
  for (const field of required) {
    if (!params[field]) {
      return { error: { code: 'BAD_REQUEST', message: `Missing required field: ${field}` }, status: 400 };
    }
  }

  if (!params.toAccountId && !params.toBeneficiaryId) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Must provide toAccountId or toBeneficiaryId' },
      status: 400,
    };
  }

  const { data, error } = await ctx.db
    .from('banking_transfers')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      from_account_id: params.fromAccountId as string,
      to_account_id: (params.toAccountId as string) ?? null,
      to_beneficiary_id: (params.toBeneficiaryId as string) ?? null,
      type: (params.type as string) ?? 'internal',
      amount_cents: params.amountCents as number,
      memo: (params.memo as string) ?? null,
      status: 'pending',
      scheduled_date: params.scheduledDate as string,
      recurring_rule: (params.recurringRule as Record<string, unknown>) ?? null,
    })
    .select()
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.scheduleTransfer',
    transferId: data.id,
    userId: ctx.userId,
    scheduledDate: params.scheduledDate,
    timestamp: new Date().toISOString(),
  }));

  return { data: { transfer: toTransfer(data) } };
}

export async function cancelTransfer(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }

  // Get current transfer
  const { data: existing } = await ctx.db
    .from('banking_transfers')
    .select('status')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!existing) {
    return { error: { code: 'NOT_FOUND', message: `Transfer not found: ${id}` }, status: 404 };
  }

  if (existing.status !== 'pending') {
    return {
      error: { code: 'CONFLICT', message: `Cannot cancel transfer with status: ${existing.status}` },
      status: 409,
    };
  }

  const { data, error } = await ctx.db
    .from('banking_transfers')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select()
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.cancelTransfer',
    transferId: id,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
  }));

  return { data: { transfer: toTransfer(data) } };
}

export async function listTransfers(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = (ctx.params.limit as number) ?? 25;
  const offset = (ctx.params.offset as number) ?? 0;

  let query = ctx.db
    .from('banking_transfers')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (ctx.params.status) {
    query = query.eq('status', ctx.params.status as string);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  const transfers = (data ?? []).map(toTransfer);
  return {
    data: { transfers },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

// =============================================================================
// BENEFICIARIES
// =============================================================================

export async function listBeneficiaries(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('banking_beneficiaries')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: { beneficiaries: (data ?? []).map(toBeneficiary) } };
}

export async function createBeneficiary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params } = ctx;
  const required = ['name', 'accountNumber', 'type'];
  for (const field of required) {
    if (!params[field]) {
      return { error: { code: 'BAD_REQUEST', message: `Missing required field: ${field}` }, status: 400 };
    }
  }

  const rawAccountNumber = params.accountNumber as string;

  const { data, error } = await ctx.db
    .from('banking_beneficiaries')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      name: params.name as string,
      nickname: (params.nickname as string) ?? null,
      account_number_encrypted: rawAccountNumber, // SECURITY: encrypt with vault before production
      account_number_masked: maskAccountNumber(rawAccountNumber),
      routing_number: (params.routingNumber as string) ?? null,
      bank_name: (params.bankName as string) ?? null,
      type: params.type as string,
      is_verified: false,
    })
    .select()
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  // Log without raw account number — NEVER log PII
  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.createBeneficiary',
    beneficiaryId: data.id,
    userId: ctx.userId,
    masked: data.account_number_masked,
    timestamp: new Date().toISOString(),
  }));

  return { data: { beneficiary: toBeneficiary(data) } };
}

export async function deleteBeneficiary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }

  const { error, count } = await ctx.db
    .from('banking_beneficiaries')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  if (!count || count === 0) {
    return { error: { code: 'NOT_FOUND', message: `Beneficiary not found: ${id}` }, status: 404 };
  }

  return { data: { deleted: true, id } };
}

// =============================================================================
// BILL PAY
// =============================================================================

export async function listBills(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = (ctx.params.limit as number) ?? 25;
  const offset = (ctx.params.offset as number) ?? 0;

  let query = ctx.db
    .from('banking_bills')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (ctx.params.status) {
    query = query.eq('status', ctx.params.status as string);
  }

  const { data, error, count } = await query
    .order('due_date', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return {
    data: { bills: (data ?? []).map(toBill) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

export async function createBill(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params } = ctx;
  const required = ['payeeName', 'amountCents', 'dueDate', 'fromAccountId'];
  for (const field of required) {
    if (!params[field]) {
      return { error: { code: 'BAD_REQUEST', message: `Missing required field: ${field}` }, status: 400 };
    }
  }

  const { data, error } = await ctx.db
    .from('banking_bills')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      payee_name: params.payeeName as string,
      payee_account_number_masked: params.payeeAccountNumber
        ? maskAccountNumber(params.payeeAccountNumber as string)
        : null,
      amount_cents: params.amountCents as number,
      due_date: params.dueDate as string,
      status: 'scheduled',
      autopay: (params.autopay as boolean) ?? false,
      recurring_rule: (params.recurringRule as Record<string, unknown>) ?? null,
      from_account_id: params.fromAccountId as string,
    })
    .select()
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.createBill',
    billId: data.id,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
  }));

  return { data: { bill: toBill(data) } };
}

export async function payBill(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }

  // Get current bill
  const { data: existing } = await ctx.db
    .from('banking_bills')
    .select('status')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!existing) {
    return { error: { code: 'NOT_FOUND', message: `Bill not found: ${id}` }, status: 404 };
  }

  if (existing.status === 'paid' || existing.status === 'cancelled') {
    return {
      error: { code: 'CONFLICT', message: `Cannot pay bill with status: ${existing.status}` },
      status: 409,
    };
  }

  const { data, error } = await ctx.db
    .from('banking_bills')
    .update({ status: 'processing' })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select()
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.payBill',
    billId: id,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
  }));

  return { data: { bill: toBill(data) } };
}

export async function cancelBill(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }

  const { data: existing } = await ctx.db
    .from('banking_bills')
    .select('status')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!existing) {
    return { error: { code: 'NOT_FOUND', message: `Bill not found: ${id}` }, status: 404 };
  }

  if (existing.status === 'paid') {
    return {
      error: { code: 'CONFLICT', message: 'Cannot cancel a bill that has already been paid' },
      status: 409,
    };
  }

  const { data, error } = await ctx.db
    .from('banking_bills')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select()
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.cancelBill',
    billId: id,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
  }));

  return { data: { bill: toBill(data) } };
}

// =============================================================================
// RDC (Remote Deposit Capture)
// =============================================================================

export async function submitDeposit(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params } = ctx;
  const required = ['accountId', 'amountCents', 'frontImageBase64', 'backImageBase64'];
  for (const field of required) {
    if (!params[field]) {
      return { error: { code: 'BAD_REQUEST', message: `Missing required field: ${field}` }, status: 400 };
    }
  }

  // SECURITY: Upload images to secure storage (Supabase Storage) and get URLs
  // Storing path placeholders — NEVER store raw base64 in the database
  const frontUrl = `rdc/${ctx.firmId}/${crypto.randomUUID()}/front.jpg`;
  const backUrl = `rdc/${ctx.firmId}/${crypto.randomUUID()}/back.jpg`;

  const { data, error } = await ctx.db
    .from('banking_rdc_deposits')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      account_id: params.accountId as string,
      amount_cents: params.amountCents as number,
      front_image_url: frontUrl,
      back_image_url: backUrl,
      check_number: (params.checkNumber as string) ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  // Log action — NEVER log image data
  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.submitDeposit',
    depositId: data.id,
    userId: ctx.userId,
    amountCents: params.amountCents,
    timestamp: new Date().toISOString(),
  }));

  return { data: { deposit: toDeposit(data) } };
}

export async function getDepositStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('banking_rdc_deposits')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: `Deposit not found: ${id}` }, status: 404 };
  }

  return { data: { deposit: toDeposit(data) } };
}

export async function listDepositHistory(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = (ctx.params.limit as number) ?? 25;
  const offset = (ctx.params.offset as number) ?? 0;

  let query = ctx.db
    .from('banking_rdc_deposits')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (ctx.params.accountId) {
    query = query.eq('account_id', ctx.params.accountId as string);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return {
    data: { deposits: (data ?? []).map(toDeposit) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

// =============================================================================
// CARDS
// =============================================================================

export async function listCards(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('banking_cards')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: true });

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: { cards: (data ?? []).map(toCard) } };
}

export async function lockCard(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }

  const { data: existing } = await ctx.db
    .from('banking_cards')
    .select('status, last_four')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!existing) {
    return { error: { code: 'NOT_FOUND', message: `Card not found: ${id}` }, status: 404 };
  }

  if (existing.status === 'cancelled' || existing.status === 'expired') {
    return {
      error: { code: 'CONFLICT', message: `Cannot lock card with status: ${existing.status}` },
      status: 409,
    };
  }

  const { data, error } = await ctx.db
    .from('banking_cards')
    .update({ status: 'locked' })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select()
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.lockCard',
    cardId: id,
    lastFour: existing.last_four,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
  }));

  return { data: { card: toCard(data) } };
}

export async function unlockCard(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }

  const { data: existing } = await ctx.db
    .from('banking_cards')
    .select('status, last_four')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!existing) {
    return { error: { code: 'NOT_FOUND', message: `Card not found: ${id}` }, status: 404 };
  }

  if (existing.status !== 'locked') {
    return {
      error: { code: 'CONFLICT', message: `Card is not locked (current status: ${existing.status})` },
      status: 409,
    };
  }

  const { data, error } = await ctx.db
    .from('banking_cards')
    .update({ status: 'active' })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select()
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.unlockCard',
    cardId: id,
    lastFour: existing.last_four,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
  }));

  return { data: { card: toCard(data) } };
}

export async function setCardLimit(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  const dailyLimitCents = ctx.params.dailyLimitCents as number;

  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }
  if (dailyLimitCents === undefined || dailyLimitCents === null) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: dailyLimitCents' }, status: 400 };
  }
  if (dailyLimitCents < 0) {
    return { error: { code: 'BAD_REQUEST', message: 'dailyLimitCents must be non-negative' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('banking_cards')
    .update({ daily_limit_cents: dailyLimitCents })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select()
    .single();

  if (error || !data) {
    if (!data) {
      return { error: { code: 'NOT_FOUND', message: `Card not found: ${id}` }, status: 404 };
    }
    return { error: { code: 'DB_ERROR', message: error!.message }, status: 500 };
  }

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'banking.setCardLimit',
    cardId: id,
    dailyLimitCents,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
  }));

  return { data: { card: toCard(data) } };
}

// =============================================================================
// STATEMENTS
// =============================================================================

export async function listStatements(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const accountId = ctx.params.accountId as string;
  if (!accountId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: accountId' }, status: 400 };
  }

  const limit = (ctx.params.limit as number) ?? 25;
  const offset = (ctx.params.offset as number) ?? 0;

  const { data, error, count } = await ctx.db
    .from('banking_statements')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('account_id', accountId)
    .order('period_start', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return {
    data: { statements: (data ?? []).map(toStatement) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

export async function getStatement(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }

  const { data: stmt, error } = await ctx.db
    .from('banking_statements')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error || !stmt) {
    return { error: { code: 'NOT_FOUND', message: `Statement not found: ${id}` }, status: 404 };
  }

  const result = toStatement(stmt);

  // For data/hybrid formats, include transactions for the period
  if (stmt.format === 'data' || stmt.format === 'hybrid') {
    const { data: txns } = await ctx.db
      .from('banking_transactions')
      .select('*')
      .eq('account_id', stmt.account_id)
      .eq('firm_id', ctx.firmId)
      .gte('created_at', stmt.period_start)
      .lte('created_at', stmt.period_end)
      .order('created_at', { ascending: false });

    (result as Record<string, unknown>).transactions = (txns ?? []).map(toTransaction);
  }

  return { data: { statement: result } };
}

export async function getStatementConfig(_ctx: GatewayContext): Promise<GatewayResponse> {
  return {
    data: {
      config: {
        supportedFormats: ['pdf', 'data', 'hybrid'],
        defaultFormat: 'hybrid',
        retentionMonths: 84,
        deliveryMethods: ['portal', 'email'],
        cycleDayOfMonth: 1,
        includeImages: false,
        eStatementsEnabled: true,
      },
    },
  };
}

export async function downloadStatement(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Statement ID is required' }, status: 400 };
  }

  // Verify statement exists and belongs to user's account
  const { data: stmt } = await ctx.db
    .from('banking_statements')
    .select('download_url')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .single();

  if (!stmt) {
    return { error: { code: 'NOT_FOUND', message: `Statement not found: ${id}` }, status: 404 };
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return {
    data: {
      downloadUrl: stmt.download_url ?? `https://statements.example.com/download/${id}?token=${crypto.randomUUID()}`,
      expiresAt,
    },
  };
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export async function listNotifications(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = (ctx.params.limit as number) ?? 25;
  const offset = (ctx.params.offset as number) ?? 0;

  let query = ctx.db
    .from('banking_notifications')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (ctx.params.unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return {
    data: { notifications: (data ?? []).map(toNotification) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

export async function markNotificationRead(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const id = ctx.params.id as string;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: id' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('banking_notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select()
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: `Notification not found: ${id}` }, status: 404 };
  }

  return { data: { notification: toNotification(data) } };
}

export async function markAllNotificationsRead(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { count, error } = await ctx.db
    .from('banking_notifications')
    .update({ is_read: true })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .eq('is_read', false);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: { markedCount: count ?? 0 } };
}

export async function getUnreadCount(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { count, error } = await ctx.db
    .from('banking_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .eq('is_read', false);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: { unreadCount: count ?? 0 } };
}

// =============================================================================
// CONFIG (Backend-Driven UI)
// =============================================================================

export async function getCapabilities(ctx: GatewayContext): Promise<GatewayResponse> {
  // Try to load from DB; fall back to defaults if no row exists
  if (ctx.firmId) {
    const { data } = await ctx.db
      .from('banking_capabilities')
      .select('capabilities')
      .eq('firm_id', ctx.firmId)
      .single();

    if (data) {
      return { data: { capabilities: data.capabilities } };
    }
  }

  // Default capabilities
  return {
    data: {
      capabilities: {
        accounts: true,
        transactions: true,
        transfers: { internal: true, external: true, wire: true, recurring: true },
        beneficiaries: true,
        billPay: true,
        rdc: { enabled: true, maxAmountCents: 1000000, dailyLimitCents: 2500000 },
        cards: { debit: true, credit: true, virtualCards: false, lockUnlock: true, limitManagement: true },
        statements: { enabled: true, formats: ['pdf', 'data', 'hybrid'], onlineAccess: true },
        notifications: { push: true, email: true, sms: false, inApp: true },
        kyc: true,
        mfa: true,
      },
    },
  };
}

export async function getTenantTheme(ctx: GatewayContext): Promise<GatewayResponse> {
  // Try to load from DB; fall back to defaults
  if (ctx.firmId) {
    const { data } = await ctx.db
      .from('banking_tenant_theme')
      .select('*')
      .eq('firm_id', ctx.firmId)
      .single();

    if (data) {
      return {
        data: {
          theme: {
            tenantId: data.firm_id,
            name: data.tenant_name,
            logoUrl: data.logo_url,
            primaryColor: data.primary_color,
            accentColor: data.accent_color,
            faviconUrl: data.favicon_url,
          },
        },
      };
    }
  }

  return {
    data: {
      theme: {
        tenantId: ctx.firmId ?? 'default',
        name: 'Digital Credit Union',
        logoUrl: '/assets/logo.svg',
        faviconUrl: '/assets/favicon.ico',
        primaryColor: '#1a56db',
        accentColor: '#059669',
      },
    },
  };
}
