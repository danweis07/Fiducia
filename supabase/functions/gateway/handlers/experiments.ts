/**
 * Experiments Domain Handlers
 *
 * Gateway handlers for the A/B experimentation framework: experiment CRUD,
 * lifecycle management, sticky user assignments, event tracking, and results.
 *
 * IMPORTANT:
 * - All data is scoped by ctx.firmId for tenant isolation.
 * - NEVER log PII or user assignment details.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

function toExperiment(row: Record<string, unknown>) {
  return {
    id: row.id,
    firmId: row.firm_id,
    name: row.name,
    description: row.description,
    status: row.status,
    metric: row.metric,
    trafficPercent: row.traffic_percent,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toVariant(row: Record<string, unknown>) {
  return {
    id: row.id,
    experimentId: row.experiment_id,
    name: row.name,
    contentId: row.content_id,
    weight: row.weight,
    isControl: row.is_control,
    createdAt: row.created_at,
  };
}

function toAssignment(row: Record<string, unknown>) {
  return {
    id: row.id,
    experimentId: row.experiment_id,
    userId: row.user_id,
    variantId: row.variant_id,
    assignedAt: row.assigned_at,
  };
}

/**
 * Simple deterministic hash for experiment+user bucketing.
 * Returns a number 0–99 used to select a variant by cumulative weight.
 */
async function hashBucket(experimentId: string, userId: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${experimentId}:${userId}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  // Use first two bytes for a number 0-65535, then mod 100
  const num = (hashArray[0] << 8) | hashArray[1];
  return num % 100;
}

// =============================================================================
// LIST EXPERIMENTS
// =============================================================================

export async function listExperiments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status } = ctx.params as Record<string, unknown>;

  let query = ctx.db
    .from('experiments')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: (data ?? []).map(toExperiment) };
}

// =============================================================================
// GET EXPERIMENT (with variants)
// =============================================================================

export async function getExperiment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing experiment id' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('experiments')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Experiment not found' }, status: 404 };
  }

  // Fetch variants
  const { data: variants, error: variantsError } = await ctx.db
    .from('experiment_variants')
    .select('*')
    .eq('experiment_id', id)
    .order('is_control', { ascending: false });

  if (variantsError) {
    return { error: { code: 'DB_ERROR', message: variantsError.message }, status: 500 };
  }

  return {
    data: {
      ...toExperiment(data),
      variants: (variants ?? []).map(toVariant),
    },
  };
}

// =============================================================================
// CREATE EXPERIMENT (with variants in a transaction)
// =============================================================================

export async function createExperiment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { name, description, metric, trafficPercent, variants } = ctx.params as Record<string, unknown>;
  if (!name) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: name' }, status: 400 };
  }

  const variantList = variants as Array<Record<string, unknown>> | undefined;
  if (!variantList || !Array.isArray(variantList) || variantList.length < 2) {
    return { error: { code: 'BAD_REQUEST', message: 'At least 2 variants are required' }, status: 400 };
  }

  const now = new Date().toISOString();

  // Insert experiment
  const { data: experiment, error: expError } = await ctx.db
    .from('experiments')
    .insert({
      firm_id: ctx.firmId,
      name,
      description: description ?? null,
      metric: metric ?? 'click_rate',
      traffic_percent: trafficPercent ?? 100,
      status: 'draft',
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (expError) {
    return { error: { code: 'DB_ERROR', message: expError.message }, status: 500 };
  }

  // Insert variants
  const variantInserts = variantList.map((v) => ({
    experiment_id: experiment.id,
    name: v.name,
    content_id: v.contentId ?? null,
    weight: v.weight ?? 50,
    is_control: v.isControl ?? false,
    created_at: now,
  }));

  const { data: createdVariants, error: varError } = await ctx.db
    .from('experiment_variants')
    .insert(variantInserts)
    .select('*');

  if (varError) {
    // Clean up experiment if variants fail
    await ctx.db.from('experiments').delete().eq('id', experiment.id);
    return { error: { code: 'DB_ERROR', message: varError.message }, status: 500 };
  }

  return {
    data: {
      ...toExperiment(experiment),
      variants: (createdVariants ?? []).map(toVariant),
    },
  };
}

// =============================================================================
// UPDATE EXPERIMENT
// =============================================================================

export async function updateExperiment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id, name, description, trafficPercent } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing experiment id' }, status: 400 };
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) payload.name = name;
  if (description !== undefined) payload.description = description;
  if (trafficPercent !== undefined) payload.traffic_percent = trafficPercent;

  const { data, error } = await ctx.db
    .from('experiments')
    .update(payload)
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }
  if (!data) {
    return { error: { code: 'NOT_FOUND', message: 'Experiment not found' }, status: 404 };
  }

  return { data: toExperiment(data) };
}

// =============================================================================
// LIFECYCLE: START / PAUSE / RESUME / COMPLETE
// =============================================================================

export async function startExperiment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing experiment id' }, status: 400 };
  }

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('experiments')
    .update({ status: 'running', started_at: now, updated_at: now })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .in('status', ['draft', 'paused'])
    .select('*')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Experiment not found or cannot be started' }, status: 404 };
  }

  return { data: toExperiment(data) };
}

export async function pauseExperiment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing experiment id' }, status: 400 };
  }

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('experiments')
    .update({ status: 'paused', updated_at: now })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('status', 'running')
    .select('*')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Experiment not found or not running' }, status: 404 };
  }

  return { data: toExperiment(data) };
}

export async function resumeExperiment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing experiment id' }, status: 400 };
  }

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('experiments')
    .update({ status: 'running', updated_at: now })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('status', 'paused')
    .select('*')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Experiment not found or not paused' }, status: 404 };
  }

  return { data: toExperiment(data) };
}

export async function completeExperiment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing experiment id' }, status: 400 };
  }

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('experiments')
    .update({ status: 'completed', ended_at: now, updated_at: now })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .in('status', ['running', 'paused'])
    .select('*')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Experiment not found or already completed' }, status: 404 };
  }

  return { data: toExperiment(data) };
}

// =============================================================================
// GET ASSIGNMENT (sticky bucketing)
// =============================================================================

export async function getAssignment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { experimentId } = ctx.params as Record<string, unknown>;
  if (!experimentId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing experimentId' }, status: 400 };
  }

  // Check for existing assignment
  const { data: existing } = await ctx.db
    .from('experiment_assignments')
    .select('*')
    .eq('experiment_id', experimentId)
    .eq('user_id', ctx.userId)
    .single();

  if (existing) {
    return { data: toAssignment(existing) };
  }

  // Verify experiment exists and is running, scoped to firm
  const { data: experiment, error: expError } = await ctx.db
    .from('experiments')
    .select('id, status')
    .eq('id', experimentId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (expError || !experiment) {
    return { error: { code: 'NOT_FOUND', message: 'Experiment not found' }, status: 404 };
  }

  if (experiment.status !== 'running') {
    return { error: { code: 'BAD_REQUEST', message: 'Experiment is not running' }, status: 400 };
  }

  // Get variants ordered by weight for deterministic bucketing
  const { data: variants, error: varError } = await ctx.db
    .from('experiment_variants')
    .select('*')
    .eq('experiment_id', experimentId)
    .order('created_at', { ascending: true });

  if (varError || !variants || variants.length === 0) {
    return { error: { code: 'INTERNAL_ERROR', message: 'No variants found for experiment' }, status: 500 };
  }

  // Deterministic assignment: hash experiment_id+user_id, mod 100, cumulative weight
  const bucket = await hashBucket(experimentId as string, ctx.userId!);
  let cumulative = 0;
  let selectedVariant = variants[variants.length - 1]; // fallback to last

  for (const v of variants) {
    cumulative += Number(v.weight);
    if (bucket < cumulative) {
      selectedVariant = v;
      break;
    }
  }

  // Create assignment
  const { data: assignment, error: assignError } = await ctx.db
    .from('experiment_assignments')
    .insert({
      experiment_id: experimentId,
      user_id: ctx.userId,
      variant_id: selectedVariant.id,
      assigned_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (assignError) {
    // Handle race condition — another request may have created the assignment
    if (assignError.code === '23505') {
      const { data: raceResult } = await ctx.db
        .from('experiment_assignments')
        .select('*')
        .eq('experiment_id', experimentId)
        .eq('user_id', ctx.userId)
        .single();

      if (raceResult) {
        return { data: toAssignment(raceResult) };
      }
    }
    return { error: { code: 'DB_ERROR', message: assignError.message }, status: 500 };
  }

  return { data: toAssignment(assignment) };
}

// =============================================================================
// TRACK EVENT
// =============================================================================

export async function trackEvent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { experimentId, variantId, eventType, metadata } = ctx.params as Record<string, unknown>;

  if (!experimentId || !variantId || !eventType) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required fields: experimentId, variantId, eventType' },
      status: 400,
    };
  }

  const validTypes = ['impression', 'click', 'dismiss', 'conversion'];
  if (!validTypes.includes(eventType as string)) {
    return {
      error: { code: 'BAD_REQUEST', message: `Invalid eventType. Must be one of: ${validTypes.join(', ')}` },
      status: 400,
    };
  }

  const { error } = await ctx.db
    .from('experiment_events')
    .insert({
      experiment_id: experimentId,
      variant_id: variantId,
      user_id: ctx.userId,
      event_type: eventType,
      metadata: metadata ?? {},
      created_at: new Date().toISOString(),
    });

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: { success: true } };
}

// =============================================================================
// GET RESULTS (aggregated stats)
// =============================================================================

export async function getResults(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { experimentId } = ctx.params as Record<string, unknown>;
  if (!experimentId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing experimentId' }, status: 400 };
  }

  // Fetch experiment (scoped to firm)
  const { data: experiment, error: expError } = await ctx.db
    .from('experiments')
    .select('*')
    .eq('id', experimentId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (expError || !experiment) {
    return { error: { code: 'NOT_FOUND', message: 'Experiment not found' }, status: 404 };
  }

  // Fetch variants
  const { data: variants, error: varError } = await ctx.db
    .from('experiment_variants')
    .select('*')
    .eq('experiment_id', experimentId);

  if (varError) {
    return { error: { code: 'DB_ERROR', message: varError.message }, status: 500 };
  }

  // Fetch all events for the experiment
  const { data: events, error: eventsError } = await ctx.db
    .from('experiment_events')
    .select('variant_id, event_type')
    .eq('experiment_id', experimentId);

  if (eventsError) {
    return { error: { code: 'DB_ERROR', message: eventsError.message }, status: 500 };
  }

  // Aggregate by variant
  const eventsByVariant = new Map<string, Record<string, number>>();
  for (const v of (variants ?? [])) {
    eventsByVariant.set(v.id as string, { impression: 0, click: 0, dismiss: 0, conversion: 0 });
  }

  for (const e of (events ?? [])) {
    const counts = eventsByVariant.get(e.variant_id as string);
    if (counts && typeof e.event_type === 'string') {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    }
  }

  let totalImpressions = 0;
  let totalConversions = 0;

  const variantStats = (variants ?? []).map((v) => {
    const counts = eventsByVariant.get(v.id as string) ?? { impression: 0, click: 0, dismiss: 0, conversion: 0 };
    const impressions = counts.impression;
    const clicks = counts.click;
    const conversions = counts.conversion;
    const dismissals = counts.dismiss;

    totalImpressions += impressions;
    totalConversions += conversions;

    return {
      variantId: v.id,
      variantName: v.name,
      isControl: v.is_control,
      impressions,
      clicks,
      dismissals,
      conversions,
      clickRate: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 10000 : 0,
      conversionRate: impressions > 0 ? Math.round((conversions / impressions) * 10000) / 10000 : 0,
    };
  });

  return {
    data: {
      experimentId: experiment.id,
      experimentName: experiment.name,
      status: experiment.status,
      variants: variantStats,
      totalImpressions,
      totalConversions,
    },
  };
}
