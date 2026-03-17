/**
 * Tenant Onboarding Handlers
 * Self-service wizard for new credit union setup.
 */
import type { GatewayContext, GatewayResponse } from '../core.ts';

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

export async function getOnboardingStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: row, error } = await ctx.db
    .from('tenant_onboarding')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .maybeSingle();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  if (!row) {
    return { data: { onboarding: defaultOnboarding() } };
  }
  return { data: { onboarding: toOnboarding(row) } };
}

export async function updateOnboardingStep(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { step, data } = ctx.params as { step: string; data: Record<string, unknown> };
  if (!step) return { error: { code: 'INVALID_PARAMS', message: 'step is required' }, status: 400 };

  const validSteps = ['institution_profile', 'branding', 'integrations', 'compliance', 'users', 'review'];
  if (!validSteps.includes(step)) {
    return { error: { code: 'INVALID_PARAMS', message: `Invalid step. Must be: ${validSteps.join(', ')}` }, status: 400 };
  }

  // Upsert the onboarding record
  const { data: existing } = await ctx.db
    .from('tenant_onboarding')
    .select('steps_completed')
    .eq('firm_id', ctx.firmId)
    .maybeSingle();

  const stepsCompleted = (existing?.steps_completed as string[]) ?? [];
  if (!stepsCompleted.includes(step)) stepsCompleted.push(step);

  const isComplete = validSteps.every(s => stepsCompleted.includes(s));

  const { data: row, error } = await ctx.db
    .from('tenant_onboarding')
    .upsert({
      firm_id: ctx.firmId,
      current_step: step,
      steps_completed: stepsCompleted,
      step_data: { ...(existing as Record<string, unknown>)?.step_data, [step]: data },
      is_complete: isComplete,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'firm_id' })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { onboarding: toOnboarding(row) } };
}

export async function completeOnboarding(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { error } = await ctx.db
    .from('tenant_onboarding')
    .update({
      is_complete: true,
      completed_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  // Mark tenant as fully onboarded
  await ctx.db
    .from('firms')
    .update({ onboarding_complete: true })
    .eq('id', ctx.firmId);

  return { data: { success: true } };
}

export async function resetOnboarding(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { error } = await ctx.db
    .from('tenant_onboarding')
    .delete()
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { onboarding: defaultOnboarding() } };
}

function defaultOnboarding() {
  return {
    currentStep: 'institution_profile',
    stepsCompleted: [] as string[],
    stepData: {},
    isComplete: false,
    completedAt: null,
  };
}

function toOnboarding(row: Record<string, unknown>) {
  return {
    currentStep: row.current_step ?? 'institution_profile',
    stepsCompleted: (row.steps_completed as string[]) ?? [],
    stepData: (row.step_data as Record<string, unknown>) ?? {},
    isComplete: row.is_complete ?? false,
    completedAt: row.completed_at ?? null,
  };
}
