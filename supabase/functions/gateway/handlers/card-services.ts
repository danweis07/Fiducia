/**
 * Card Services Handlers — Travel Notices + Card Replacement
 */
import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';

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
// TRAVEL NOTICES
// =============================================================================

export async function createTravelNotice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { cardId, destinations, startDate, endDate, contactPhone } = ctx.params as {
    cardId: string;
    destinations: { country: string; region?: string }[];
    startDate: string;
    endDate: string;
    contactPhone?: string;
  };

  if (!cardId) return { error: { code: 'INVALID_PARAMS', message: 'cardId required' }, status: 400 };
  if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
    return { error: { code: 'INVALID_PARAMS', message: 'At least one destination required' }, status: 400 };
  }
  if (!startDate || !endDate) {
    return { error: { code: 'INVALID_PARAMS', message: 'startDate and endDate required' }, status: 400 };
  }

  // Verify card belongs to user
  const { data: card, error: cardErr } = await ctx.db
    .from('cards')
    .select('id, last_four')
    .eq('id', cardId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (cardErr || !card) {
    return { error: { code: 'NOT_FOUND', message: 'Card not found' }, status: 404 };
  }

  const { data: row, error } = await ctx.db
    .from('card_travel_notices')
    .insert({
      card_id: cardId,
      card_last_four: card.last_four,
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      destinations,
      start_date: startDate,
      end_date: endDate,
      contact_phone: contactPhone ?? null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { notice: toTravelNotice(row) } };
}

export async function listTravelNotices(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const filter = ctx.params.filter as string | undefined;
  const limit = (ctx.params.limit as number) || 25;
  const offset = (ctx.params.offset as number) || 0;

  let query = ctx.db
    .from('card_travel_notices')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false });

  if (filter === 'active') {
    query = query.eq('is_active', true);
  } else if (filter === 'expired') {
    query = query.eq('is_active', false);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: rows, error, count } = await query;

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const total = count ?? 0;
  return {
    data: { notices: (rows ?? []).map(toTravelNotice) },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

export async function cancelTravelNotice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const noticeId = ctx.params.noticeId as string;
  if (!noticeId) return { error: { code: 'INVALID_PARAMS', message: 'noticeId required' }, status: 400 };

  const { error } = await ctx.db
    .from('card_travel_notices')
    .update({ is_active: false })
    .eq('id', noticeId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

// =============================================================================
// CARD REPLACEMENT
// =============================================================================

export async function requestCardReplacement(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { cardId, reason, shippingMethod, reportFraud } = ctx.params as {
    cardId: string;
    reason: string;
    shippingMethod: string;
    reportFraud?: boolean;
  };

  if (!cardId) return { error: { code: 'INVALID_PARAMS', message: 'cardId required' }, status: 400 };
  if (!reason) return { error: { code: 'INVALID_PARAMS', message: 'reason required' }, status: 400 };
  if (!shippingMethod) return { error: { code: 'INVALID_PARAMS', message: 'shippingMethod required' }, status: 400 };

  const validReasons = ['lost', 'stolen', 'damaged', 'expired', 'name_change'];
  if (!validReasons.includes(reason)) {
    return { error: { code: 'INVALID_PARAMS', message: 'Invalid reason' }, status: 400 };
  }

  const validShipping = ['standard', 'expedited'];
  if (!validShipping.includes(shippingMethod)) {
    return { error: { code: 'INVALID_PARAMS', message: 'Invalid shippingMethod' }, status: 400 };
  }

  // Verify card belongs to user
  const { data: card, error: cardErr } = await ctx.db
    .from('cards')
    .select('id, last_four, status')
    .eq('id', cardId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (cardErr || !card) {
    return { error: { code: 'NOT_FOUND', message: 'Card not found' }, status: 404 };
  }

  // If lost/stolen, auto-lock the old card
  const isLostStolen = reason === 'lost' || reason === 'stolen';
  if (isLostStolen) {
    await ctx.db
      .from('cards')
      .update({ status: reason })
      .eq('id', cardId)
      .eq('user_id', ctx.userId)
      .eq('firm_id', ctx.firmId);
  }

  const feeCents = shippingMethod === 'expedited' ? 2500 : 0;
  const estimatedDays = shippingMethod === 'expedited' ? 3 : 10;
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);

  const { data: row, error } = await ctx.db
    .from('card_replacements')
    .insert({
      card_id: cardId,
      card_last_four: card.last_four,
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      reason,
      shipping_method: shippingMethod,
      status: 'requested',
      fee_cents: feeCents,
      fraud_reported: isLostStolen && (reportFraud ?? true),
      estimated_delivery_date: estimatedDate.toISOString().split('T')[0],
    })
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { replacement: toCardReplacement(row) } };
}

export async function listCardReplacements(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = (ctx.params.limit as number) || 25;
  const offset = (ctx.params.offset as number) || 0;

  const { data: rows, error, count } = await ctx.db
    .from('card_replacements')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const total = count ?? 0;
  return {
    data: { replacements: (rows ?? []).map(toCardReplacement) },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

export async function getCardReplacementStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const replacementId = ctx.params.replacementId as string;
  if (!replacementId) return { error: { code: 'INVALID_PARAMS', message: 'replacementId required' }, status: 400 };

  const { data: row, error } = await ctx.db
    .from('card_replacements')
    .select('*')
    .eq('id', replacementId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error || !row) return { error: { code: 'NOT_FOUND', message: 'Replacement not found' }, status: 404 };
  return { data: { replacement: toCardReplacement(row) } };
}

export async function activateReplacementCard(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { replacementId, lastFourDigits } = ctx.params as {
    replacementId: string;
    lastFourDigits: string;
  };

  if (!replacementId) return { error: { code: 'INVALID_PARAMS', message: 'replacementId required' }, status: 400 };
  if (!lastFourDigits) return { error: { code: 'INVALID_PARAMS', message: 'lastFourDigits required' }, status: 400 };

  const { data: row, error: fetchErr } = await ctx.db
    .from('card_replacements')
    .select('*')
    .eq('id', replacementId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (fetchErr || !row) {
    return { error: { code: 'NOT_FOUND', message: 'Replacement not found' }, status: 404 };
  }

  if (row.status === 'activated') {
    return { error: { code: 'ALREADY_ACTIVATED', message: 'Card already activated' }, status: 400 };
  }

  if (row.status !== 'delivered' && row.status !== 'shipped') {
    return { error: { code: 'INVALID_STATE', message: 'Card must be shipped or delivered to activate' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('card_replacements')
    .update({
      status: 'activated',
      new_card_last_four: lastFourDigits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', replacementId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true, replacementId } };
}

// =============================================================================
// ROW MAPPERS
// =============================================================================

function toTravelNotice(row: Record<string, unknown>) {
  return {
    id: row.id,
    cardId: row.card_id,
    cardLastFour: row.card_last_four,
    destinations: row.destinations,
    startDate: row.start_date,
    endDate: row.end_date,
    contactPhone: row.contact_phone ?? null,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  };
}

function toCardReplacement(row: Record<string, unknown>) {
  return {
    id: row.id,
    cardId: row.card_id,
    cardLastFour: row.card_last_four,
    reason: row.reason,
    shippingMethod: row.shipping_method,
    status: row.status,
    feeCents: row.fee_cents ?? 0,
    newCardLastFour: row.new_card_last_four ?? null,
    trackingNumber: row.tracking_number ?? null,
    estimatedDeliveryDate: row.estimated_delivery_date ?? null,
    fraudReported: row.fraud_reported ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
