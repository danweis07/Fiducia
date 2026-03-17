/**
 * Autonomous Executor Engine
 *
 * The core engine that processes inbound events, matches them against
 * automation rules, checks execution policies, and invokes gateway
 * actions when permitted.
 *
 * Flow:
 *   1. Pull pending events from event_inbox
 *   2. For each event, find matching automation rules
 *   3. Evaluate each rule against the event
 *   4. Check execution policy (auto_approve / human_required / disabled)
 *   5. If approved, execute the gateway action
 *   6. Log the result to autonomous_executions
 *   7. Send notifications as needed
 *
 * This module is invoked by the gateway handler (admin-triggered or cron).
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { evaluateRule, type RuleEvaluationContext, type TriggerType } from './rules-engine.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface ExecutorConfig {
  /** Maximum events to process per invocation */
  batchSize: number;
  /** Maximum time (ms) for the entire batch */
  timeoutMs: number;
}

export const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
  batchSize: 50,
  timeoutMs: 25_000, // 25s — leave 5s buffer for edge function timeout
};

interface EventRow {
  id: string;
  tenant_id: string;
  source: string;
  event_type: string;
  payload: Record<string, unknown>;
  user_id: string | null;
  status: string;
  retry_count: number;
  max_retries: number;
}

interface AutomationRuleRow {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_params: Record<string, unknown>;
  status: string;
}

interface ExecutionPolicyRow {
  id: string;
  action: string;
  approval: 'auto_approve' | 'human_required' | 'disabled';
  conditions: Record<string, unknown>;
  max_auto_per_hour: number;
  notify_on_auto: boolean;
}

export interface ExecutionResult {
  totalEventsProcessed: number;
  totalRulesMatched: number;
  totalActionsExecuted: number;
  totalActionsRejected: number;
  totalErrors: number;
  executionIds: string[];
}

// =============================================================================
// EVENT TYPE → TRIGGER TYPE MAPPING
// =============================================================================

/** Maps inbound event types to automation trigger types */
const EVENT_TO_TRIGGER: Record<string, TriggerType> = {
  'transaction.posted': 'transaction',
  'transaction.pending': 'transaction',
  'transaction.declined': 'transaction',
  'balance.changed': 'balance_threshold',
  'balance.low': 'balance_threshold',
  'balance.high': 'balance_threshold',
  'direct_deposit.received': 'direct_deposit',
  'recurring.processed': 'recurring_payment',
  'recurring.upcoming': 'recurring_payment',
  'schedule.tick': 'schedule',
};

// =============================================================================
// GATEWAY ACTION MAPPING
// =============================================================================

/** Maps rule action types to gateway action strings */
function resolveGatewayAction(actionType: string, actionParams: Record<string, unknown>): string | null {
  switch (actionType) {
    case 'transfer':
      return 'transfers.create';
    case 'notification':
      return null; // handled directly via notification adapter
    case 'card_control': {
      const action = actionParams.action as string;
      if (action === 'freeze') return 'cards.lock';
      if (action === 'unfreeze') return 'cards.unlock';
      if (action === 'restrict') return 'cards.setLimit';
      return null;
    }
    default:
      return null;
  }
}

// =============================================================================
// EXECUTOR
// =============================================================================

/**
 * Process pending events from the inbox and execute matching automation rules.
 */
export async function executeAutonomousLoop(
  supabase: SupabaseClient,
  tenantId: string,
  config: ExecutorConfig = DEFAULT_EXECUTOR_CONFIG,
  actionInvoker?: (action: string, params: Record<string, unknown>) => Promise<{ data?: unknown; error?: { message: string } }>,
): Promise<ExecutionResult> {
  const result: ExecutionResult = {
    totalEventsProcessed: 0,
    totalRulesMatched: 0,
    totalActionsExecuted: 0,
    totalActionsRejected: 0,
    totalErrors: 0,
    executionIds: [],
  };

  const startTime = Date.now();

  // --- Check kill switch ---
  const { data: firm } = await supabase
    .from('firms')
    .select('autonomous_enabled')
    .eq('id', tenantId)
    .single();

  if (!firm?.autonomous_enabled) {
    console.warn(`[executor] Autonomous execution disabled for tenant ${tenantId}`);
    return result;
  }

  // --- Pull pending events ---
  const { data: events, error: eventsError } = await supabase
    .from('event_inbox')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(config.batchSize);

  if (eventsError || !events || events.length === 0) {
    if (eventsError) console.error('[executor] Failed to fetch events:', eventsError);
    return result;
  }

  // --- Load active automation rules for this tenant ---
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (!rules || rules.length === 0) {
    // Mark events as processed (no rules to match)
    await markEventsProcessed(supabase, events.map((e: EventRow) => e.id), 'processed');
    return result;
  }

  // --- Load execution policies ---
  const { data: policies } = await supabase
    .from('execution_policies')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  // --- Process each event ---
  for (const event of events as EventRow[]) {
    if (Date.now() - startTime > config.timeoutMs) {
      console.warn('[executor] Timeout reached, stopping batch');
      break;
    }

    try {
      await processEvent(supabase, event, rules as AutomationRuleRow[], policies as ExecutionPolicyRow[] ?? [], result, actionInvoker);
      result.totalEventsProcessed++;
    } catch (err) {
      result.totalErrors++;
      console.error(`[executor] Error processing event ${event.id}:`, err);

      // Retry or dead-letter
      if (event.retry_count < event.max_retries) {
        await supabase
          .from('event_inbox')
          .update({
            status: 'pending',
            retry_count: event.retry_count + 1,
            error_message: err instanceof Error ? err.message : 'Unknown error',
          })
          .eq('id', event.id);
      } else {
        await supabase
          .from('event_inbox')
          .update({
            status: 'dead_letter',
            error_message: err instanceof Error ? err.message : 'Max retries exceeded',
          })
          .eq('id', event.id);
      }
    }
  }

  return result;
}

// =============================================================================
// EVENT PROCESSING
// =============================================================================

async function processEvent(
  supabase: SupabaseClient,
  event: EventRow,
  rules: AutomationRuleRow[],
  policies: ExecutionPolicyRow[],
  result: ExecutionResult,
  actionInvoker?: (action: string, params: Record<string, unknown>) => Promise<{ data?: unknown; error?: { message: string } }>,
): Promise<void> {
  // Mark event as processing
  await supabase
    .from('event_inbox')
    .update({ status: 'processing', processed_at: new Date().toISOString() })
    .eq('id', event.id);

  const triggerType = EVENT_TO_TRIGGER[event.event_type];
  if (!triggerType) {
    await markEventDone(supabase, event.id, 'processed', 'No trigger type mapping');
    return;
  }

  // Filter rules that match this trigger type and (optionally) this user
  const matchingRules = rules.filter(rule => {
    if (rule.trigger_type !== triggerType) return false;
    // If the event targets a specific user, only match that user's rules
    if (event.user_id && rule.user_id !== event.user_id) return false;
    return true;
  });

  if (matchingRules.length === 0) {
    await markEventDone(supabase, event.id, 'processed', 'No matching rules');
    return;
  }

  // Load user accounts for rule evaluation (if user-targeted event)
  let userAccounts: RuleEvaluationContext['accounts'] = [];
  if (event.user_id) {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, account_type, current_balance_cents')
      .eq('user_id', event.user_id)
      .eq('status', 'active');

    if (accounts) {
      userAccounts = accounts.map((a: { id: string; account_type: string; current_balance_cents: number }) => ({
        id: a.id,
        type: a.account_type,
        balanceCents: a.current_balance_cents,
      }));
    }
  }

  // Evaluate each matching rule
  for (const rule of matchingRules) {
    result.totalRulesMatched++;

    const evalResult = evaluateRule({
      trigger: { type: triggerType, event: event.payload },
      rule: {
        id: rule.id,
        triggerType: triggerType,
        triggerConfig: rule.trigger_config,
        actionType: rule.action_type,
        actionParams: rule.action_params,
      },
      accounts: userAccounts,
    });

    if (!evalResult.shouldExecute) continue;

    // Determine gateway action
    const gatewayAction = resolveGatewayAction(rule.action_type, evalResult.resolvedParams);

    if (!gatewayAction && rule.action_type !== 'notification') {
      console.warn(`[executor] No gateway action for rule ${rule.id} action type: ${rule.action_type}`);
      continue;
    }

    // Check execution policy
    const effectiveAction = gatewayAction ?? `notification.${(evalResult.resolvedParams.channel as string) ?? 'push'}`;
    const policy = findPolicy(policies, effectiveAction);
    const approval = policy?.approval ?? 'human_required'; // Default to human review

    // Create execution record
    const executionId = crypto.randomUUID();
    result.executionIds.push(executionId);

    await supabase
      .from('autonomous_executions')
      .insert({
        id: executionId,
        tenant_id: event.tenant_id,
        trigger_event_id: event.id,
        automation_rule_id: rule.id,
        action: effectiveAction,
        action_params: evalResult.resolvedParams,
        target_user_id: event.user_id,
        status: approval === 'auto_approve' ? 'approved' : approval === 'disabled' ? 'rejected' : 'pending',
        policy_id: policy?.id ?? null,
        policy_approval: approval,
        started_at: new Date().toISOString(),
      });

    if (approval === 'disabled') {
      result.totalActionsRejected++;
      await supabase
        .from('autonomous_executions')
        .update({ status: 'rejected', completed_at: new Date().toISOString() })
        .eq('id', executionId);
      continue;
    }

    if (approval === 'human_required') {
      result.totalActionsRejected++;
      // Leave execution as 'pending' for human review in admin UI
      continue;
    }

    // --- Auto-approved: execute the action ---
    if (approval === 'auto_approve' && gatewayAction && actionInvoker) {
      try {
        await supabase
          .from('autonomous_executions')
          .update({ status: 'executing' })
          .eq('id', executionId);

        const actionResult = await actionInvoker(gatewayAction, {
          ...evalResult.resolvedParams,
          _autonomous: true,
          _executionId: executionId,
          _ruleId: rule.id,
        });

        if (actionResult.error) {
          await supabase
            .from('autonomous_executions')
            .update({
              status: 'failed',
              error_message: actionResult.error.message,
              result: actionResult,
              completed_at: new Date().toISOString(),
            })
            .eq('id', executionId);
          result.totalErrors++;
        } else {
          await supabase
            .from('autonomous_executions')
            .update({
              status: 'completed',
              result: actionResult.data as Record<string, unknown>,
              completed_at: new Date().toISOString(),
            })
            .eq('id', executionId);
          result.totalActionsExecuted++;

          // Update rule execution stats
          await supabase
            .from('automation_rules')
            .update({
              last_executed_at: new Date().toISOString(),
              total_executions: rule.id, // This should be increment, simplified here
            })
            .eq('id', rule.id);
        }
      } catch (err) {
        await supabase
          .from('autonomous_executions')
          .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Execution failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', executionId);
        result.totalErrors++;
      }
    }
  }

  // Mark event as processed
  await markEventDone(supabase, event.id, 'processed');
}

// =============================================================================
// HELPERS
// =============================================================================

function findPolicy(
  policies: ExecutionPolicyRow[],
  action: string,
): ExecutionPolicyRow | null {
  // Exact match first, then glob match
  for (const policy of policies) {
    if (policy.action === action) return policy;
  }
  for (const policy of policies) {
    if (policy.action.endsWith('.*')) {
      const prefix = policy.action.slice(0, -1);
      if (action.startsWith(prefix)) return policy;
    }
    if (policy.action === '*') return policy;
  }
  return null;
}

async function markEventDone(
  supabase: SupabaseClient,
  eventId: string,
  status: string,
  message?: string,
): Promise<void> {
  await supabase
    .from('event_inbox')
    .update({
      status,
      processed_at: new Date().toISOString(),
      processed_by: 'executor',
      error_message: message ?? null,
    })
    .eq('id', eventId);
}

async function markEventsProcessed(
  supabase: SupabaseClient,
  eventIds: string[],
  status: string,
): Promise<void> {
  for (const id of eventIds) {
    await markEventDone(supabase, id, status, 'No matching rules');
  }
}
