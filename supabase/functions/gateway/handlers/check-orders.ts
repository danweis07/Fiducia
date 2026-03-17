/**
 * Check Ordering Domain Handlers
 *
 * Gateway handlers for ordering personal checks.
 * Covers: check styles, order configuration, creating/listing/cancelling orders.
 *
 * Tables: check_styles, check_orders
 * All monetary values are integer cents.
 * All queries scoped by firm_id + user_id.
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
// SHIPPING COSTS (cents)
// =============================================================================

const SHIPPING_COSTS: Record<string, number> = {
  standard: 0,
  expedited: 995,
  overnight: 1995,
};

// =============================================================================
// HANDLERS
// =============================================================================

/** List available check styles/designs with pricing */
export async function listCheckStyles(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { category } = ctx.params as { category?: string };

  let query = ctx.db
    .from('check_styles')
    .select('*', { count: 'exact' })
    .eq('is_available', true)
    .order('category')
    .order('name');

  if (category) {
    query = query.eq('category', category);
  }

  const { data: rows, error, count } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const styles = (rows ?? []).map(toCheckStyle);
  return { data: { styles }, meta: { pagination: paginate(count ?? styles.length, styles.length, 0) } };
}

/** Get check order configuration: quantities, shipping options, pricing */
export async function getCheckOrderConfig(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  return {
    data: {
      quantities: [50, 100, 150, 200],
      shippingOptions: [
        { method: 'standard', label: 'Standard (7-10 business days)', costCents: SHIPPING_COSTS.standard },
        { method: 'expedited', label: 'Expedited (3-5 business days)', costCents: SHIPPING_COSTS.expedited },
        { method: 'overnight', label: 'Overnight (1-2 business days)', costCents: SHIPPING_COSTS.overnight },
      ],
      pricingTiers: [
        { quantity: 50, boxCount: 1 },
        { quantity: 100, boxCount: 2 },
        { quantity: 150, boxCount: 3 },
        { quantity: 200, boxCount: 4 },
      ],
    },
  };
}

/** Create a new check order */
export async function createCheckOrder(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const {
    accountId, styleId, quantity, startingCheckNumber,
    shippingMethod, deliveryAddressId,
  } = ctx.params as {
    accountId: string; styleId: string; quantity: number;
    startingCheckNumber?: string; shippingMethod: string;
    deliveryAddressId?: string;
  };

  if (!accountId || !styleId || !quantity || !shippingMethod) {
    return { error: { code: 'VALIDATION_ERROR', message: 'accountId, styleId, quantity, and shippingMethod are required' }, status: 400 };
  }

  const validQuantities = [50, 100, 150, 200];
  if (!validQuantities.includes(quantity)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'quantity must be 50, 100, 150, or 200' }, status: 400 };
  }

  const validShipping = ['standard', 'expedited', 'overnight'];
  if (!validShipping.includes(shippingMethod)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'shippingMethod must be standard, expedited, or overnight' }, status: 400 };
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

  // Verify style exists
  const { data: style, error: styleErr } = await ctx.db
    .from('check_styles')
    .select('*')
    .eq('id', styleId)
    .eq('is_available', true)
    .single();

  if (styleErr || !style) {
    return { error: { code: 'NOT_FOUND', message: 'Check style not found or unavailable' }, status: 404 };
  }

  const boxCount = quantity / 50;
  const checksCostCents = boxCount * (style.price_per_box_cents ?? 0);
  const shippingCostCents = SHIPPING_COSTS[shippingMethod] ?? 0;
  const totalCostCents = checksCostCents + shippingCostCents;

  const now = new Date().toISOString();

  const { data: order, error: insertErr } = await ctx.db
    .from('check_orders')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      account_id: accountId,
      account_masked: account.account_number_masked,
      style_id: styleId,
      style_name: style.name,
      quantity,
      starting_check_number: startingCheckNumber ?? null,
      shipping_method: shippingMethod,
      shipping_cost_cents: shippingCostCents,
      total_cost_cents: totalCostCents,
      delivery_address_id: deliveryAddressId ?? null,
      status: 'pending',
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (insertErr) return { error: { code: 'DB_ERROR', message: insertErr.message }, status: 500 };

  return { data: { order: toCheckOrder(order) } };
}

/** List past check orders with pagination and optional status filter */
export async function listCheckOrders(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status, limit = 20, offset = 0 } = ctx.params as {
    status?: string; limit?: number; offset?: number;
  };

  let query = ctx.db
    .from('check_orders')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: rows, error, count } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const orders = (rows ?? []).map(toCheckOrder);
  return { data: { orders }, meta: { pagination: paginate(count ?? 0, limit, offset) } };
}

/** Get a single check order by ID */
export async function getCheckOrder(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const orderId = ctx.params.orderId as string;
  if (!orderId) return { error: { code: 'VALIDATION_ERROR', message: 'orderId is required' }, status: 400 };

  const { data: row, error } = await ctx.db
    .from('check_orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error || !row) return { error: { code: 'NOT_FOUND', message: 'Check order not found' }, status: 404 };

  return { data: { order: toCheckOrder(row) } };
}

/** Cancel a check order if still pending */
export async function cancelCheckOrder(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const orderId = ctx.params.orderId as string;
  if (!orderId) return { error: { code: 'VALIDATION_ERROR', message: 'orderId is required' }, status: 400 };

  // Fetch current order
  const { data: row, error: fetchErr } = await ctx.db
    .from('check_orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (fetchErr || !row) return { error: { code: 'NOT_FOUND', message: 'Check order not found' }, status: 404 };

  if (row.status !== 'pending') {
    return { error: { code: 'INVALID_STATE', message: 'Only pending orders can be cancelled' }, status: 400 };
  }

  const { error: updateErr } = await ctx.db
    .from('check_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId);

  if (updateErr) return { error: { code: 'DB_ERROR', message: updateErr.message }, status: 500 };

  return { data: { success: true } };
}

// =============================================================================
// ROW MAPPERS
// =============================================================================

function toCheckStyle(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    imageUrl: row.image_url ?? '',
    category: row.category ?? 'standard',
    pricePerBoxCents: row.price_per_box_cents ?? 0,
    isAvailable: row.is_available ?? true,
  };
}

function toCheckOrder(row: Record<string, unknown>) {
  return {
    id: row.id,
    accountId: row.account_id,
    accountMasked: row.account_masked ?? '****',
    styleId: row.style_id,
    styleName: row.style_name ?? '',
    quantity: row.quantity,
    startingCheckNumber: row.starting_check_number ?? '',
    shippingMethod: row.shipping_method,
    shippingCostCents: row.shipping_cost_cents ?? 0,
    totalCostCents: row.total_cost_cents ?? 0,
    status: row.status,
    trackingNumber: row.tracking_number ?? null,
    estimatedDeliveryDate: row.estimated_delivery_date ?? null,
    deliveredAt: row.delivered_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
