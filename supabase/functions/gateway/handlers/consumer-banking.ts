/**
 * Consumer Banking Domain Handlers
 *
 * Gateway handlers for member-facing consumer banking features:
 * - Member profile (addresses, documents, identifiers)
 * - Account products
 * - CD maturity
 * - Loans (accounts, schedule, payments)
 * - Charges & fees
 * - Standing instructions
 *
 * IMPORTANT:
 * - All monetary values are integer cents.
 * - NEVER log PII (SSNs, account numbers, document numbers).
 * - Masked values only in responses.
 * - All data scoped by ctx.firmId + ctx.userId for tenant isolation.
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

// =============================================================================
// ROW MAPPERS
// =============================================================================

function toAddress(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    isPrimary: row.is_primary,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    zip: row.zip,
    country: row.country,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDocument(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    label: row.label,
    documentNumberMasked: row.document_number_masked,
    issuingAuthority: row.issuing_authority,
    issuedDate: row.issued_date,
    expirationDate: row.expiration_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toIdentifier(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    valueMasked: row.value_masked,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

function toAccountProduct(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    description: row.description,
    type: row.type,
    interestRateBps: row.interest_rate_bps,
    interestCompounding: row.interest_compounding,
    interestPosting: row.interest_posting,
    interestCalculation: row.interest_calculation,
    minimumOpeningBalanceCents: Number(row.minimum_opening_balance_cents),
    minimumBalanceCents: Number(row.minimum_balance_cents),
    maximumBalanceCents: row.maximum_balance_cents != null ? Number(row.maximum_balance_cents) : null,
    withdrawalLimitPerMonth: row.withdrawal_limit_per_month,
    termMonths: row.term_months,
    earlyWithdrawalPenaltyBps: row.early_withdrawal_penalty_bps,
    autoRenew: row.auto_renew,
    isActive: row.is_active,
  };
}

function toLoanProduct(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    description: row.description,
    loanType: row.loan_type,
    interestRateBps: row.interest_rate_bps,
    rateType: row.rate_type,
    minTermMonths: row.min_term_months,
    maxTermMonths: row.max_term_months,
    minAmountCents: Number(row.min_amount_cents),
    maxAmountCents: Number(row.max_amount_cents),
    originationFeeBps: row.origination_fee_bps,
    latePaymentFeeCents: Number(row.late_payment_fee_cents),
    latePaymentGraceDays: row.late_payment_grace_days,
    isActive: row.is_active,
  };
}

function toLoan(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    loanNumberMasked: row.loan_number_masked,
    principalCents: Number(row.principal_cents),
    interestRateBps: row.interest_rate_bps,
    termMonths: row.term_months,
    disbursedAt: row.disbursed_at,
    outstandingBalanceCents: Number(row.outstanding_balance_cents),
    principalPaidCents: Number(row.principal_paid_cents),
    interestPaidCents: Number(row.interest_paid_cents),
    nextPaymentDueDate: row.next_payment_due_date,
    nextPaymentAmountCents: row.next_payment_amount_cents != null ? Number(row.next_payment_amount_cents) : null,
    paymentsRemaining: row.payments_remaining,
    autopayAccountId: row.autopay_account_id,
    status: row.status,
    daysPastDue: row.days_past_due,
    firstPaymentDate: row.first_payment_date,
    maturityDate: row.maturity_date,
    paidOffAt: row.paid_off_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLoanScheduleItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    loanId: row.loan_id,
    installmentNumber: row.installment_number,
    dueDate: row.due_date,
    principalCents: Number(row.principal_cents),
    interestCents: Number(row.interest_cents),
    feeCents: Number(row.fee_cents),
    totalCents: Number(row.total_cents),
    paidCents: Number(row.paid_cents),
    paidAt: row.paid_at,
    status: row.status,
  };
}

function toLoanPayment(row: Record<string, unknown>) {
  return {
    id: row.id,
    loanId: row.loan_id,
    amountCents: Number(row.amount_cents),
    principalPortionCents: Number(row.principal_portion_cents),
    interestPortionCents: Number(row.interest_portion_cents),
    feePortionCents: Number(row.fee_portion_cents),
    extraPrincipalCents: Number(row.extra_principal_cents),
    fromAccountId: row.from_account_id,
    paymentMethod: row.payment_method,
    status: row.status,
    scheduledDate: row.scheduled_date,
    processedAt: row.processed_at,
    createdAt: row.created_at,
  };
}

function toChargeDefinition(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    chargeType: row.charge_type,
    appliesTo: row.applies_to,
    amountCents: Number(row.amount_cents),
    isPercentage: row.is_percentage,
    frequency: row.frequency,
    waivable: row.waivable,
    waiveIfBalanceAboveCents: row.waive_if_balance_above_cents != null ? Number(row.waive_if_balance_above_cents) : null,
    maxPerDay: row.max_per_day,
    isActive: row.is_active,
  };
}

function toCharge(row: Record<string, unknown>) {
  return {
    id: row.id,
    accountId: row.account_id,
    loanId: row.loan_id,
    chargeDefinitionId: row.charge_definition_id,
    amountCents: Number(row.amount_cents),
    status: row.status,
    waivedReason: row.waived_reason,
    waivedAt: row.waived_at,
    appliedAt: row.applied_at,
    createdAt: row.created_at,
  };
}

function toStandingInstruction(row: Record<string, unknown>) {
  return {
    id: row.id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    toBeneficiaryId: row.to_beneficiary_id,
    toLoanId: row.to_loan_id,
    transferType: row.transfer_type,
    amountCents: Number(row.amount_cents),
    name: row.name,
    frequency: row.frequency,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    startDate: row.start_date,
    endDate: row.end_date,
    nextExecutionDate: row.next_execution_date,
    status: row.status,
    totalExecutions: row.total_executions,
    lastExecutedAt: row.last_executed_at,
    lastFailureReason: row.last_failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// MEMBER ADDRESSES
// =============================================================================

export async function listAddresses(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('banking_member_addresses')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { addresses: (data || []).map(toAddress) } };
}

export async function updateAddress(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id, ...updates } = ctx.params;
  if (!id) return { error: { code: 'BAD_REQUEST', message: 'Address id required' }, status: 400 };

  const dbUpdates: Record<string, unknown> = {};
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.isPrimary !== undefined) dbUpdates.is_primary = updates.isPrimary;
  if (updates.line1 !== undefined) dbUpdates.line1 = updates.line1;
  if (updates.line2 !== undefined) dbUpdates.line2 = updates.line2;
  if (updates.city !== undefined) dbUpdates.city = updates.city;
  if (updates.state !== undefined) dbUpdates.state = updates.state;
  if (updates.zip !== undefined) dbUpdates.zip = updates.zip;
  if (updates.country !== undefined) dbUpdates.country = updates.country;

  if (Object.keys(dbUpdates).length === 0) {
    return { error: { code: 'BAD_REQUEST', message: 'No fields to update' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('banking_member_addresses')
    .update(dbUpdates)
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  if (!data) return { error: { code: 'NOT_FOUND', message: 'Address not found' }, status: 404 };

  return { data: { address: toAddress(data) } };
}

// =============================================================================
// MEMBER DOCUMENTS
// =============================================================================

export async function listDocuments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('banking_member_documents')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { documents: (data || []).map(toDocument) } };
}

// =============================================================================
// MEMBER IDENTIFIERS
// =============================================================================

export async function listIdentifiers(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // Never return encrypted values — only masked
  const { data, error } = await ctx.db
    .from('banking_member_identifiers')
    .select('id, user_id, firm_id, type, value_masked, is_primary, created_at')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('is_primary', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { identifiers: (data || []).map(toIdentifier) } };
}

// =============================================================================
// ACCOUNT PRODUCTS
// =============================================================================

export async function listAccountProducts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  let query = ctx.db
    .from('banking_account_products')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('is_active', true);

  const productType = ctx.params.type as string | undefined;
  if (productType) {
    query = query.eq('type', productType);
  }

  const { data, error } = await query.order('type').order('name');

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { products: (data || []).map(toAccountProduct) } };
}

export async function getAccountProduct(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params;
  if (!id) return { error: { code: 'BAD_REQUEST', message: 'Product id required' }, status: 400 };

  const { data, error } = await ctx.db
    .from('banking_account_products')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error || !data) return { error: { code: 'NOT_FOUND', message: 'Product not found' }, status: 404 };

  return { data: { product: toAccountProduct(data) } };
}

// =============================================================================
// LOAN PRODUCTS
// =============================================================================

export async function listLoanProducts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  let query = ctx.db
    .from('banking_loan_products')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('is_active', true);

  const loanType = ctx.params.loanType as string | undefined;
  if (loanType) {
    query = query.eq('loan_type', loanType);
  }

  const { data, error } = await query.order('loan_type').order('name');

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { products: (data || []).map(toLoanProduct) } };
}

// =============================================================================
// LOANS
// =============================================================================

export async function listLoans(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  let query = ctx.db
    .from('banking_loans')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  const status = ctx.params.status as string | undefined;
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { loans: (data || []).map(toLoan) } };
}

export async function getLoan(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params;
  if (!id) return { error: { code: 'BAD_REQUEST', message: 'Loan id required' }, status: 400 };

  const { data, error } = await ctx.db
    .from('banking_loans')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (error || !data) return { error: { code: 'NOT_FOUND', message: 'Loan not found' }, status: 404 };

  return { data: { loan: toLoan(data) } };
}

// =============================================================================
// LOAN SCHEDULE
// =============================================================================

export async function getLoanSchedule(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { loanId } = ctx.params;
  if (!loanId) return { error: { code: 'BAD_REQUEST', message: 'loanId required' }, status: 400 };

  // Verify the member owns this loan
  const { data: loan } = await ctx.db
    .from('banking_loans')
    .select('id')
    .eq('id', loanId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!loan) return { error: { code: 'NOT_FOUND', message: 'Loan not found' }, status: 404 };

  const limit = Math.min(Number(ctx.params.limit) || 50, 200);
  const offset = Number(ctx.params.offset) || 0;

  const { data, error, count } = await ctx.db
    .from('banking_loan_schedule')
    .select('*', { count: 'exact' })
    .eq('loan_id', loanId)
    .eq('firm_id', ctx.firmId)
    .order('installment_number', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { schedule: (data || []).map(toLoanScheduleItem) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

// =============================================================================
// LOAN PAYMENTS
// =============================================================================

export async function listLoanPayments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { loanId } = ctx.params;
  if (!loanId) return { error: { code: 'BAD_REQUEST', message: 'loanId required' }, status: 400 };

  // Verify ownership
  const { data: loan } = await ctx.db
    .from('banking_loans')
    .select('id')
    .eq('id', loanId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!loan) return { error: { code: 'NOT_FOUND', message: 'Loan not found' }, status: 404 };

  const limit = Math.min(Number(ctx.params.limit) || 25, 100);
  const offset = Number(ctx.params.offset) || 0;

  const { data, error, count } = await ctx.db
    .from('banking_loan_payments')
    .select('*', { count: 'exact' })
    .eq('loan_id', loanId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { payments: (data || []).map(toLoanPayment) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

export async function makeLoanPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { loanId, amountCents, fromAccountId, extraPrincipalCents } = ctx.params;
  if (!loanId || !amountCents || !fromAccountId) {
    return { error: { code: 'BAD_REQUEST', message: 'loanId, amountCents, and fromAccountId required' }, status: 400 };
  }

  if (Number(amountCents) <= 0) {
    return { error: { code: 'BAD_REQUEST', message: 'amountCents must be positive' }, status: 400 };
  }

  // Verify loan ownership
  const { data: loan } = await ctx.db
    .from('banking_loans')
    .select('id, status')
    .eq('id', loanId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!loan) return { error: { code: 'NOT_FOUND', message: 'Loan not found' }, status: 404 };
  if (loan.status !== 'active') {
    return { error: { code: 'BAD_REQUEST', message: 'Loan is not active' }, status: 400 };
  }

  // Verify account ownership
  const { data: account } = await ctx.db
    .from('banking_accounts')
    .select('id')
    .eq('id', fromAccountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!account) return { error: { code: 'NOT_FOUND', message: 'Source account not found' }, status: 404 };

  const { data, error } = await ctx.db
    .from('banking_loan_payments')
    .insert({
      loan_id: loanId,
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      amount_cents: amountCents,
      from_account_id: fromAccountId,
      extra_principal_cents: Number(extraPrincipalCents) || 0,
      payment_method: 'internal',
      status: 'pending',
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'loans.makePayment',
    userId: ctx.userId,
    firmId: ctx.firmId,
    loanId,
    amountCents,
    timestamp: new Date().toISOString(),
  }));

  return { data: { payment: toLoanPayment(data) } };
}

// =============================================================================
// CHARGE DEFINITIONS (fee schedule — members can read for transparency)
// =============================================================================

export async function listChargeDefinitions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  let query = ctx.db
    .from('banking_charge_definitions')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('is_active', true);

  const appliesTo = ctx.params.appliesTo as string | undefined;
  if (appliesTo) {
    query = query.or(`applies_to.eq.${appliesTo},applies_to.eq.all`);
  }

  const { data, error } = await query.order('charge_type').order('name');

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { chargeDefinitions: (data || []).map(toChargeDefinition) } };
}

// =============================================================================
// CHARGES (fees applied to member accounts)
// =============================================================================

export async function listCharges(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = Math.min(Number(ctx.params.limit) || 25, 100);
  const offset = Number(ctx.params.offset) || 0;

  let query = ctx.db
    .from('banking_charges')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  const accountId = ctx.params.accountId as string | undefined;
  if (accountId) query = query.eq('account_id', accountId);

  const status = ctx.params.status as string | undefined;
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { charges: (data || []).map(toCharge) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

// =============================================================================
// STANDING INSTRUCTIONS
// =============================================================================

export async function listStandingInstructions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  let query = ctx.db
    .from('banking_standing_instructions')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  const status = ctx.params.status as string | undefined;
  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { instructions: (data || []).map(toStandingInstruction) } };
}

export async function createStandingInstruction(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { fromAccountId, toAccountId, toBeneficiaryId, toLoanId, transferType, amountCents, name, frequency, dayOfWeek, dayOfMonth, startDate } = ctx.params;

  if (!fromAccountId || !transferType || !amountCents || !name || !frequency || !startDate) {
    return { error: { code: 'BAD_REQUEST', message: 'fromAccountId, transferType, amountCents, name, frequency, and startDate are required' }, status: 400 };
  }

  if (Number(amountCents) <= 0) {
    return { error: { code: 'BAD_REQUEST', message: 'amountCents must be positive' }, status: 400 };
  }

  // Verify source account
  const { data: sourceAccount } = await ctx.db
    .from('banking_accounts')
    .select('id')
    .eq('id', fromAccountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!sourceAccount) {
    return { error: { code: 'NOT_FOUND', message: 'Source account not found' }, status: 404 };
  }

  const { data, error } = await ctx.db
    .from('banking_standing_instructions')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      from_account_id: fromAccountId,
      to_account_id: toAccountId || null,
      to_beneficiary_id: toBeneficiaryId || null,
      to_loan_id: toLoanId || null,
      transfer_type: transferType,
      amount_cents: amountCents,
      name,
      frequency,
      day_of_week: dayOfWeek ?? null,
      day_of_month: dayOfMonth ?? null,
      start_date: startDate,
      next_execution_date: startDate,
      status: 'active',
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'standingInstructions.create',
    userId: ctx.userId,
    firmId: ctx.firmId,
    transferType,
    frequency,
    timestamp: new Date().toISOString(),
  }));

  return { data: { instruction: toStandingInstruction(data) } };
}

export async function updateStandingInstruction(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id, ...updates } = ctx.params;
  if (!id) return { error: { code: 'BAD_REQUEST', message: 'Instruction id required' }, status: 400 };

  const dbUpdates: Record<string, unknown> = {};
  if (updates.amountCents !== undefined) {
    if (Number(updates.amountCents) <= 0) {
      return { error: { code: 'BAD_REQUEST', message: 'amountCents must be positive' }, status: 400 };
    }
    dbUpdates.amount_cents = updates.amountCents;
  }
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
  if (updates.dayOfWeek !== undefined) dbUpdates.day_of_week = updates.dayOfWeek;
  if (updates.dayOfMonth !== undefined) dbUpdates.day_of_month = updates.dayOfMonth;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  if (Object.keys(dbUpdates).length === 0) {
    return { error: { code: 'BAD_REQUEST', message: 'No fields to update' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('banking_standing_instructions')
    .update(dbUpdates)
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  if (!data) return { error: { code: 'NOT_FOUND', message: 'Instruction not found' }, status: 404 };

  return { data: { instruction: toStandingInstruction(data) } };
}

// =============================================================================
// CD MATURITY INFO (embedded in accounts — additional data when type='cd')
// =============================================================================

export async function getCDMaturity(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { accountId } = ctx.params;
  if (!accountId) return { error: { code: 'BAD_REQUEST', message: 'accountId required' }, status: 400 };

  const { data, error } = await ctx.db
    .from('banking_accounts')
    .select('id, type, maturity_date, maturity_action, maturity_transfer_account_id, original_term_months, penalty_withdrawn_cents, product_id')
    .eq('id', accountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (error || !data) return { error: { code: 'NOT_FOUND', message: 'Account not found' }, status: 404 };
  if (data.type !== 'cd') return { error: { code: 'BAD_REQUEST', message: 'Account is not a CD' }, status: 400 };

  return {
    data: {
      maturity: {
        accountId: data.id,
        maturityDate: data.maturity_date,
        maturityAction: data.maturity_action,
        maturityTransferAccountId: data.maturity_transfer_account_id,
        originalTermMonths: data.original_term_months,
        penaltyWithdrawnCents: Number(data.penalty_withdrawn_cents ?? 0),
        productId: data.product_id,
      },
    },
  };
}

export async function updateCDMaturityAction(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { accountId, maturityAction, maturityTransferAccountId } = ctx.params;
  if (!accountId || !maturityAction) {
    return { error: { code: 'BAD_REQUEST', message: 'accountId and maturityAction required' }, status: 400 };
  }

  const validActions = ['renew_same_term', 'renew_new_term', 'transfer_to_savings', 'transfer_to_checking', 'notify_only'];
  if (!validActions.includes(maturityAction as string)) {
    return { error: { code: 'BAD_REQUEST', message: `maturityAction must be one of: ${validActions.join(', ')}` }, status: 400 };
  }

  // Verify it's a CD owned by the user
  const { data: acct } = await ctx.db
    .from('banking_accounts')
    .select('id, type')
    .eq('id', accountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!acct) return { error: { code: 'NOT_FOUND', message: 'Account not found' }, status: 404 };
  if (acct.type !== 'cd') return { error: { code: 'BAD_REQUEST', message: 'Account is not a CD' }, status: 400 };

  const updates: Record<string, unknown> = { maturity_action: maturityAction };
  if (maturityTransferAccountId !== undefined) {
    updates.maturity_transfer_account_id = maturityTransferAccountId || null;
  }

  const { error } = await ctx.db
    .from('banking_accounts')
    .update(updates)
    .eq('id', accountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'cd.updateMaturityAction',
    userId: ctx.userId,
    firmId: ctx.firmId,
    accountId,
    maturityAction,
    timestamp: new Date().toISOString(),
  }));

  return { data: { success: true } };
}
