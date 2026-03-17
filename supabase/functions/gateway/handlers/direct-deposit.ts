/**
 * Direct Deposit Switching Domain Handlers
 *
 * Gateway handlers for switching a user's direct deposit to this bank.
 * Integrates with payroll providers (Pinwheel/Atomic pattern).
 *
 * Tables: direct_deposit_switches, supported_employers
 * All monetary values are integer cents.
 * All queries scoped by firm_id + user_id.
 */

import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { DirectDepositAdapter } from '../../_shared/adapters/direct-deposit/types.ts';
import type { AllocationType } from '../../_shared/adapters/direct-deposit/types.ts';

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
// HANDLERS
// =============================================================================

/** Search/list supported employers */
export async function listEmployers(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { query, limit = 20, offset = 0 } = ctx.params as {
    query?: string; limit?: number; offset?: number;
  };

  let dbQuery = ctx.db
    .from('supported_employers')
    .select('*', { count: 'exact' })
    .eq('is_supported', true)
    .order('name')
    .range(offset, offset + limit - 1);

  if (query) {
    dbQuery = dbQuery.ilike('name', `%${query}%`);
  }

  const { data: rows, error, count } = await dbQuery;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const employers = (rows ?? []).map(toEmployer);
  return { data: { employers }, meta: { pagination: paginate(count ?? 0, limit, offset) } };
}

/** Initiate a direct deposit switch */
export async function initiateSwitch(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const {
    accountId, employerId, allocationType,
    allocationAmountCents, allocationPercentage,
  } = ctx.params as {
    accountId: string; employerId: string;
    allocationType: string;
    allocationAmountCents?: number; allocationPercentage?: number;
  };

  if (!accountId || !employerId || !allocationType) {
    return { error: { code: 'VALIDATION_ERROR', message: 'accountId, employerId, and allocationType are required' }, status: 400 };
  }

  const validTypes = ['full', 'partial', 'fixed_amount'];
  if (!validTypes.includes(allocationType)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'allocationType must be full, partial, or fixed_amount' }, status: 400 };
  }

  if (allocationType === 'fixed_amount' && (!allocationAmountCents || allocationAmountCents <= 0)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'allocationAmountCents is required for fixed_amount allocation' }, status: 400 };
  }

  if (allocationType === 'partial' && (!allocationPercentage || allocationPercentage <= 0 || allocationPercentage > 100)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'allocationPercentage must be between 1 and 100 for partial allocation' }, status: 400 };
  }

  // Verify account belongs to user
  const { data: account, error: acctErr } = await ctx.db
    .from('accounts')
    .select('id, account_number_masked')
    .eq('id', accountId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (acctErr || !account) {
    return { error: { code: 'NOT_FOUND', message: 'Account not found' }, status: 404 };
  }

  // Verify employer exists
  const { data: employer, error: empErr } = await ctx.db
    .from('supported_employers')
    .select('*')
    .eq('id', employerId)
    .eq('is_supported', true)
    .single();

  if (empErr || !employer) {
    return { error: { code: 'NOT_FOUND', message: 'Employer not found or not supported' }, status: 404 };
  }

  const now = new Date().toISOString();

  // Resolve the direct deposit adapter (Pinwheel, Argyle, or mock)
  const { adapter } = await resolveAdapter<DirectDepositAdapter>('direct_deposit', ctx.firmId);

  // Fetch full account details for routing/account number (restricted — never logged)
  const { data: fullAccount, error: fullAcctErr } = await ctx.db
    .from('accounts')
    .select('routing_number, account_number')
    .eq('id', accountId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (fullAcctErr || !fullAccount) {
    return { error: { code: 'NOT_FOUND', message: 'Account details not found' }, status: 404 };
  }

  // Create a link token via the adapter to initialize the payroll widget
  const linkResult = await adapter.createLinkToken({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    accountId,
    routingNumber: (fullAccount.routing_number as string) ?? '',
    accountNumber: (fullAccount.account_number as string) ?? '',
    allocationType: allocationType as AllocationType,
    allocationAmountCents: allocationAmountCents ?? undefined,
    allocationPercentage: allocationPercentage ?? undefined,
    employerPlatformId: (employer.platform_id as string) ?? undefined,
  });

  const { data: switchRow, error: insertErr } = await ctx.db
    .from('direct_deposit_switches')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      account_id: accountId,
      account_masked: account.account_number_masked,
      employer_id: employerId,
      employer_name: employer.name,
      allocation_type: allocationType,
      allocation_amount_cents: allocationAmountCents ?? null,
      allocation_percentage: allocationPercentage ?? null,
      status: 'awaiting_login',
      widget_url: linkResult.widgetUrl,
      provider_switch_id: linkResult.providerSwitchId,
      link_token: linkResult.linkToken,
      provider: linkResult.provider,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (insertErr) return { error: { code: 'DB_ERROR', message: insertErr.message }, status: 500 };

  return { data: { switch: toSwitch(switchRow), widgetUrl: linkResult.widgetUrl, linkToken: linkResult.linkToken } };
}

/** Get status of a specific switch request (polls adapter for live status) */
export async function getSwitchStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const switchId = ctx.params.switchId as string;
  if (!switchId) return { error: { code: 'VALIDATION_ERROR', message: 'switchId is required' }, status: 400 };

  const { data: row, error } = await ctx.db
    .from('direct_deposit_switches')
    .select('*')
    .eq('id', switchId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error || !row) return { error: { code: 'NOT_FOUND', message: 'Switch request not found' }, status: 404 };

  // If the switch is still in-progress, poll the adapter for live status
  const inProgress = ['awaiting_login', 'processing'];
  if (inProgress.includes(row.status as string) && row.provider_switch_id) {
    try {
      const { adapter } = await resolveAdapter<DirectDepositAdapter>('direct_deposit', ctx.firmId);
      const providerStatus = await adapter.getSwitchStatus({
        providerSwitchId: row.provider_switch_id as string,
      });

      // Update local record if provider status has changed
      if (providerStatus.status !== row.status) {
        const now = new Date().toISOString();
        const updateData: Record<string, unknown> = {
          status: providerStatus.status,
          updated_at: now,
        };
        if (providerStatus.providerConfirmationId) {
          updateData.provider_confirmation_id = providerStatus.providerConfirmationId;
        }
        if (providerStatus.completedAt) {
          updateData.completed_at = providerStatus.completedAt;
        }
        if (providerStatus.failureReason) {
          updateData.failure_reason = providerStatus.failureReason;
        }

        await ctx.db
          .from('direct_deposit_switches')
          .update(updateData)
          .eq('id', switchId)
          .eq('user_id', ctx.userId)
          .eq('firm_id', ctx.firmId);

        // Merge updates into current row for response
        Object.assign(row, updateData);
      }
    } catch {
      // If adapter polling fails, return the last known status from DB
    }
  }

  return { data: { switch: toSwitch(row) } };
}

/** List all switch requests for user */
export async function listSwitches(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { limit = 20, offset = 0 } = ctx.params as { limit?: number; offset?: number };

  const { data: rows, error, count } = await ctx.db
    .from('direct_deposit_switches')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const switches = (rows ?? []).map(toSwitch);
  return { data: { switches }, meta: { pagination: paginate(count ?? 0, limit, offset) } };
}

/** Cancel a pending/awaiting switch */
export async function cancelSwitch(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const switchId = ctx.params.switchId as string;
  if (!switchId) return { error: { code: 'VALIDATION_ERROR', message: 'switchId is required' }, status: 400 };

  const { data: row, error: fetchErr } = await ctx.db
    .from('direct_deposit_switches')
    .select('id, status')
    .eq('id', switchId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (fetchErr || !row) return { error: { code: 'NOT_FOUND', message: 'Switch request not found' }, status: 404 };

  const cancellable = ['pending', 'awaiting_login'];
  if (!cancellable.includes(row.status as string)) {
    return { error: { code: 'INVALID_STATE', message: 'Only pending or awaiting_login switches can be cancelled' }, status: 400 };
  }

  const { error: updateErr } = await ctx.db
    .from('direct_deposit_switches')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', switchId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId);

  if (updateErr) return { error: { code: 'DB_ERROR', message: updateErr.message }, status: 500 };

  return { data: { success: true } };
}

/** Confirm/complete a switch after the payroll provider widget flow */
export async function confirmSwitch(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { switchId, providerConfirmationId } = ctx.params as {
    switchId: string; providerConfirmationId: string;
  };

  if (!switchId || !providerConfirmationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'switchId and providerConfirmationId are required' }, status: 400 };
  }

  const { data: row, error: fetchErr } = await ctx.db
    .from('direct_deposit_switches')
    .select('id, status')
    .eq('id', switchId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (fetchErr || !row) return { error: { code: 'NOT_FOUND', message: 'Switch request not found' }, status: 404 };

  if (row.status !== 'awaiting_login' && row.status !== 'processing') {
    return { error: { code: 'INVALID_STATE', message: 'Switch is not in a confirmable state' }, status: 400 };
  }

  const now = new Date().toISOString();

  const { data: updated, error: updateErr } = await ctx.db
    .from('direct_deposit_switches')
    .update({
      status: 'completed',
      provider_confirmation_id: providerConfirmationId,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', switchId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (updateErr) return { error: { code: 'DB_ERROR', message: updateErr.message }, status: 500 };

  return { data: { switch: toSwitch(updated) } };
}

// =============================================================================
// ROW MAPPERS
// =============================================================================

function toEmployer(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url ?? null,
    payrollProvider: row.payroll_provider ?? '',
    isSupported: row.is_supported ?? true,
  };
}

function toSwitch(row: Record<string, unknown>) {
  return {
    id: row.id,
    accountId: row.account_id,
    accountMasked: row.account_masked ?? '****',
    employerId: row.employer_id,
    employerName: row.employer_name ?? '',
    allocationType: row.allocation_type,
    allocationAmountCents: row.allocation_amount_cents ?? null,
    allocationPercentage: row.allocation_percentage ?? null,
    status: row.status,
    widgetUrl: row.widget_url ?? null,
    providerConfirmationId: row.provider_confirmation_id ?? null,
    completedAt: row.completed_at ?? null,
    failureReason: row.failure_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
