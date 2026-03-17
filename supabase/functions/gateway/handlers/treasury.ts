/**
 * Treasury-as-a-Service Handlers — Vault Yield Optimization
 *
 * Manages high-yield treasury vaults backed by Stripe Treasury,
 * Column, Increase, or Mercury adapters. Enables excess cash
 * optimization for business accounts.
 */
import type { GatewayContext, GatewayResponse } from '../core.ts';
import { requireAuth } from '../handler-utils.ts';

// =============================================================================
// LIST TREASURY VAULTS
// =============================================================================

export async function listTreasuryVaults(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('treasury_vaults')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { vaults: (rows ?? []).map(toVault) } };
}

// =============================================================================
// CREATE TREASURY VAULT
// =============================================================================

export async function createTreasuryVault(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const name = ctx.params.name as string;
  const linkedAccountId = ctx.params.linkedAccountId as string;
  const providerName = (ctx.params.providerName as string) || 'column';
  const initialDepositCents = (ctx.params.initialDepositCents as number) || 0;

  if (!name || !linkedAccountId) {
    return { error: { code: 'INVALID_PARAMS', message: 'name and linkedAccountId required' }, status: 400 };
  }

  const now = new Date().toISOString();
  const { data, error } = await ctx.db.from('treasury_vaults').insert({
    id: crypto.randomUUID(),
    firm_id: ctx.firmId,
    user_id: ctx.userId,
    name,
    provider_name: providerName,
    balance_cents: initialDepositCents,
    apy_bps: 450, // 4.50% default
    accrued_interest_cents: 0,
    status: 'active',
    linked_account_id: linkedAccountId,
    created_at: now,
    updated_at: now,
  }).select('*').single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { vault: toVault(data) } };
}

// =============================================================================
// CLOSE TREASURY VAULT
// =============================================================================

export async function closeTreasuryVault(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const vaultId = ctx.params.vaultId as string;
  if (!vaultId) return { error: { code: 'INVALID_PARAMS', message: 'vaultId required' }, status: 400 };

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('treasury_vaults')
    .update({ status: 'closed', balance_cents: 0, updated_at: now })
    .eq('id', vaultId)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { vault: toVault(data) } };
}

// =============================================================================
// TREASURY SUMMARY
// =============================================================================

export async function getTreasurySummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows } = await ctx.db
    .from('treasury_vaults')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .eq('status', 'active');

  const vaults = (rows ?? []).map(toVault);
  const totalBalanceCents = vaults.reduce((s, v) => s + v.balanceCents, 0);
  const totalInterest = vaults.reduce((s, v) => s + v.accruedInterestCents, 0);

  // Weighted avg APY
  const weightedApySum = vaults.reduce((s, v) => s + (v.apyBps * v.balanceCents), 0);
  const weightedAvgApyBps = totalBalanceCents > 0 ? Math.round(weightedApySum / totalBalanceCents) : 0;

  return {
    data: {
      summary: {
        totalVaultBalanceCents: totalBalanceCents,
        totalAccruedInterestCents: totalInterest,
        weightedAvgApyBps,
        vaults,
      },
    },
  };
}

// =============================================================================
// ROW → DTO MAPPING
// =============================================================================

function toVault(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    providerName: (row.provider_name as string) ?? 'column',
    balanceCents: (row.balance_cents as number) ?? 0,
    apyBps: (row.apy_bps as number) ?? 0,
    accruedInterestCents: (row.accrued_interest_cents as number) ?? 0,
    status: row.status as string,
    linkedAccountId: row.linked_account_id as string,
    linkedAccountName: (row.linked_account_name as string) ?? 'Operating Account',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
