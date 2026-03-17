/**
 * Server-Driven UI (SDUI) Handlers
 *
 * Resolves screen manifests based on computed user personas.
 * Admin endpoints for managing personas and screen manifests.
 *
 * Flow:
 *   1. Compute persona from user traits (account data, behavior, profile)
 *   2. Look up screen manifest for (screen_key, persona_id, firm_id)
 *   3. Fall back to 'default' persona if no match
 *   4. Return component manifest array for frontend rendering
 *
 * IMPORTANT:
 * - All data is scoped by ctx.firmId for tenant isolation.
 * - NEVER log PII or user financial data in persona computation.
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

interface PersonaRow {
  id: string;
  firm_id: string;
  persona_id: string;
  label: string;
  description: string;
  rules: PersonaRuleRow[];
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PersonaRuleRow {
  field: string;
  operator: string;
  value: unknown;
}

interface UserTraits {
  account_count: number;
  total_balance_cents: number;
  account_types: string[];
  member_since_days: number;
  transaction_count_30d: number;
  has_loans: boolean;
  has_credit_card: boolean;
  has_business_account: boolean;
  subscription_tier: string;
  login_count_30d: number;
}

function toPersona(row: Record<string, unknown>) {
  return {
    id: row.id,
    firmId: row.firm_id,
    personaId: row.persona_id,
    label: row.label,
    description: row.description,
    rules: row.rules,
    priority: row.priority,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toManifest(row: Record<string, unknown>) {
  return {
    id: row.id,
    firmId: row.firm_id,
    screenKey: row.screen_key,
    personaId: row.persona_id,
    label: row.label,
    components: row.components,
    isActive: row.is_active,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// PERSONA COMPUTATION
// =============================================================================

/**
 * Gather user traits from account and profile data.
 * Used to evaluate persona rules. Only retrieves aggregates — no PII.
 */
async function computeUserTraits(ctx: GatewayContext): Promise<UserTraits> {
  // Fetch account aggregates
  const { data: accounts } = await ctx.db
    .from('banking_accounts')
    .select('account_type, balance_cents')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  const accountList = (accounts ?? []) as Array<{ account_type: string; balance_cents: number }>;
  const accountTypes = [...new Set(accountList.map(a => a.account_type))];
  const totalBalanceCents = accountList.reduce((sum, a) => sum + (a.balance_cents ?? 0), 0);

  // Fetch firm user for membership duration
  const { data: firmUser } = await ctx.db
    .from('firm_users')
    .select('created_at')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  const memberSinceDays = firmUser?.created_at
    ? Math.floor((Date.now() - new Date(firmUser.created_at as string).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Fetch loan count
  const { count: loanCount } = await ctx.db
    .from('banking_loans')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  // Fetch firm subscription tier
  const { data: firm } = await ctx.db
    .from('firms')
    .select('subscription_tier')
    .eq('id', ctx.firmId)
    .single();

  return {
    account_count: accountList.length,
    total_balance_cents: totalBalanceCents,
    account_types: accountTypes,
    member_since_days: memberSinceDays,
    transaction_count_30d: 0, // Placeholder — could query transaction count
    has_loans: (loanCount ?? 0) > 0,
    has_credit_card: accountTypes.includes('credit'),
    has_business_account: accountTypes.includes('business_checking') || accountTypes.includes('business_savings'),
    subscription_tier: (firm?.subscription_tier as string) ?? 'starter',
    login_count_30d: 0, // Placeholder — could query session table
  };
}

/**
 * Evaluate a single persona rule against user traits.
 */
function evaluateRule(rule: PersonaRuleRow, traits: UserTraits): boolean {
  const traitValue = traits[rule.field as keyof UserTraits];
  if (traitValue === undefined) return false;

  const ruleValue = rule.value;

  switch (rule.operator) {
    case 'eq':
      return traitValue === ruleValue;
    case 'neq':
      return traitValue !== ruleValue;
    case 'gt':
      return typeof traitValue === 'number' && traitValue > (ruleValue as number);
    case 'gte':
      return typeof traitValue === 'number' && traitValue >= (ruleValue as number);
    case 'lt':
      return typeof traitValue === 'number' && traitValue < (ruleValue as number);
    case 'lte':
      return typeof traitValue === 'number' && traitValue <= (ruleValue as number);
    case 'in':
      if (Array.isArray(traitValue)) {
        return (ruleValue as string[]).some(v => traitValue.includes(v));
      }
      return (ruleValue as unknown[]).includes(traitValue);
    case 'not_in':
      if (Array.isArray(traitValue)) {
        return !(ruleValue as string[]).some(v => traitValue.includes(v));
      }
      return !(ruleValue as unknown[]).includes(traitValue);
    case 'contains':
      if (Array.isArray(traitValue)) {
        return traitValue.includes(ruleValue as string);
      }
      return String(traitValue).includes(String(ruleValue));
    default:
      return false;
  }
}

/**
 * Resolve the best-matching persona for a user.
 * Returns 'default' if no persona rules match.
 */
async function resolvePersona(
  ctx: GatewayContext,
  traits: UserTraits
): Promise<{ personaId: string; label: string }> {
  // Check cache first
  const { data: cached } = await ctx.db
    .from('user_persona_assignments')
    .select('persona_id, expires_at')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (cached && new Date(cached.expires_at as string) > new Date()) {
    // Look up label
    const { data: personaRow } = await ctx.db
      .from('user_personas')
      .select('label')
      .eq('firm_id', ctx.firmId)
      .eq('persona_id', cached.persona_id)
      .single();

    return {
      personaId: cached.persona_id as string,
      label: (personaRow?.label as string) ?? cached.persona_id as string,
    };
  }

  // Fetch all active personas for this firm, ordered by priority desc
  const { data: personas } = await ctx.db
    .from('user_personas')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  let matchedPersona = { personaId: 'default', label: 'Default' };

  for (const p of (personas ?? []) as PersonaRow[]) {
    const rules = (p.rules ?? []) as PersonaRuleRow[];
    if (rules.length === 0) continue;

    // All rules must match (AND logic)
    const allMatch = rules.every(rule => evaluateRule(rule, traits));
    if (allMatch) {
      matchedPersona = { personaId: p.persona_id, label: p.label };
      break; // First match wins (highest priority)
    }
  }

  // Cache the assignment (upsert)
  await ctx.db
    .from('user_persona_assignments')
    .upsert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      persona_id: matchedPersona.personaId,
      computed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      traits: traits as unknown as Record<string, unknown>,
    }, {
      onConflict: 'firm_id,user_id',
    });

  return matchedPersona;
}

// =============================================================================
// RESOLVE SCREEN (primary consumer-facing endpoint)
// =============================================================================

export async function resolveScreen(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { screenKey } = ctx.params as { screenKey?: string };
  if (!screenKey) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing screenKey' }, status: 400 };
  }

  // 1. Compute user traits
  const traits = await computeUserTraits(ctx);

  // 2. Resolve persona
  const persona = await resolvePersona(ctx, traits);

  // 3. Look up manifest for persona
  let { data: manifest } = await ctx.db
    .from('screen_manifests')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('screen_key', screenKey)
    .eq('persona_id', persona.personaId)
    .eq('is_active', true)
    .single();

  // 4. Fall back to default persona
  if (!manifest && persona.personaId !== 'default') {
    const { data: fallback } = await ctx.db
      .from('screen_manifests')
      .select('*')
      .eq('firm_id', ctx.firmId)
      .eq('screen_key', screenKey)
      .eq('persona_id', 'default')
      .eq('is_active', true)
      .single();
    manifest = fallback;
  }

  if (!manifest) {
    // No manifest configured — return empty (frontend shows default layout)
    return {
      data: {
        screenKey,
        personaId: persona.personaId,
        personaLabel: persona.label,
        components: [],
        manifestVersion: 0,
      },
    };
  }

  // Sort components by order
  const components = ((manifest.components as Array<Record<string, unknown>>) ?? [])
    .sort((a, b) => (a.order as number) - (b.order as number));

  return {
    data: {
      screenKey,
      personaId: persona.personaId,
      personaLabel: persona.label,
      components,
      manifestVersion: manifest.version,
    },
  };
}

// =============================================================================
// GET CURRENT PERSONA (for the authenticated user)
// =============================================================================

export async function getCurrentPersona(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const traits = await computeUserTraits(ctx);
  const persona = await resolvePersona(ctx, traits);

  return {
    data: {
      personaId: persona.personaId,
      personaLabel: persona.label,
      traits,
    },
  };
}

// =============================================================================
// ADMIN: LIST PERSONAS
// =============================================================================

export async function listPersonas(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('user_personas')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .order('priority', { ascending: false });

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: (data ?? []).map(toPersona) };
}

// =============================================================================
// ADMIN: CREATE PERSONA
// =============================================================================

export async function createPersona(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { personaId, label, description, rules, priority } = ctx.params as Record<string, unknown>;
  if (!personaId || !label) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required fields: personaId, label' }, status: 400 };
  }

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('user_personas')
    .insert({
      firm_id: ctx.firmId,
      persona_id: personaId,
      label,
      description: description ?? '',
      rules: rules ?? [],
      priority: priority ?? 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: { code: 'CONFLICT', message: `Persona '${personaId}' already exists` }, status: 409 };
    }
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: toPersona(data) };
}

// =============================================================================
// ADMIN: UPDATE PERSONA
// =============================================================================

export async function updatePersona(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id, label, description, rules, priority, isActive } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing persona id' }, status: 400 };
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (label !== undefined) payload.label = label;
  if (description !== undefined) payload.description = description;
  if (rules !== undefined) payload.rules = rules;
  if (priority !== undefined) payload.priority = priority;
  if (isActive !== undefined) payload.is_active = isActive;

  const { data, error } = await ctx.db
    .from('user_personas')
    .update(payload)
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }
  if (!data) {
    return { error: { code: 'NOT_FOUND', message: 'Persona not found' }, status: 404 };
  }

  return { data: toPersona(data) };
}

// =============================================================================
// ADMIN: DELETE PERSONA
// =============================================================================

export async function deletePersona(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing persona id' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('user_personas')
    .delete()
    .eq('id', id)
    .eq('firm_id', ctx.firmId);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: { success: true } };
}

// =============================================================================
// ADMIN: LIST SCREEN MANIFESTS
// =============================================================================

export async function listManifests(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { screenKey } = ctx.params as { screenKey?: string };

  let query = ctx.db
    .from('screen_manifests')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .order('screen_key')
    .order('persona_id');

  if (screenKey) {
    query = query.eq('screen_key', screenKey);
  }

  const { data, error } = await query;

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: (data ?? []).map(toManifest) };
}

// =============================================================================
// ADMIN: GET SCREEN MANIFEST
// =============================================================================

export async function getManifest(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing manifest id' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('screen_manifests')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Screen manifest not found' }, status: 404 };
  }

  return { data: toManifest(data) };
}

// =============================================================================
// ADMIN: CREATE SCREEN MANIFEST
// =============================================================================

export async function createManifest(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { screenKey, personaId, label, components } = ctx.params as Record<string, unknown>;
  if (!screenKey || !label) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required fields: screenKey, label' }, status: 400 };
  }

  // Assign IDs to components
  const componentList = ((components ?? []) as Array<Record<string, unknown>>).map((c, i) => ({
    ...c,
    id: c.id ?? crypto.randomUUID(),
    order: c.order ?? i,
  }));

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('screen_manifests')
    .insert({
      firm_id: ctx.firmId,
      screen_key: screenKey,
      persona_id: personaId ?? 'default',
      label,
      components: componentList,
      is_active: true,
      version: 1,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return {
        error: { code: 'CONFLICT', message: `Manifest already exists for screen '${screenKey}' + persona '${personaId ?? 'default'}'` },
        status: 409,
      };
    }
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: toManifest(data) };
}

// =============================================================================
// ADMIN: UPDATE SCREEN MANIFEST
// =============================================================================

export async function updateManifest(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id, label, components, isActive } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing manifest id' }, status: 400 };
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (label !== undefined) payload.label = label;
  if (isActive !== undefined) payload.is_active = isActive;

  if (components !== undefined) {
    // Assign IDs to new components, bump version
    const componentList = (components as Array<Record<string, unknown>>).map((c, i) => ({
      ...c,
      id: c.id ?? crypto.randomUUID(),
      order: c.order ?? i,
    }));
    payload.components = componentList;
  }

  // Bump version on content change
  if (components !== undefined) {
    // Fetch current version
    const { data: current } = await ctx.db
      .from('screen_manifests')
      .select('version')
      .eq('id', id)
      .eq('firm_id', ctx.firmId)
      .single();

    payload.version = ((current?.version as number) ?? 0) + 1;
  }

  const { data, error } = await ctx.db
    .from('screen_manifests')
    .update(payload)
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }
  if (!data) {
    return { error: { code: 'NOT_FOUND', message: 'Screen manifest not found' }, status: 404 };
  }

  return { data: toManifest(data) };
}

// =============================================================================
// ADMIN: DELETE SCREEN MANIFEST
// =============================================================================

export async function deleteManifest(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing manifest id' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('screen_manifests')
    .delete()
    .eq('id', id)
    .eq('firm_id', ctx.firmId);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: { success: true } };
}
