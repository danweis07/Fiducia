/**
 * AI Platform Gateway Handlers
 *
 * Unified handlers for the AI banking platform:
 * - Conversational banking with intent classification
 * - Knowledge base management (RAG)
 * - Automation rules
 * - Proactive insights
 * - Escalation management
 * - Prompt management (admin)
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { AIServicesAdapter } from '../../_shared/adapters/ai-services/types.ts';
import { resolvePrompt, buildMessages, DEFAULT_PROMPTS } from '../../_shared/ai/prompts.ts';
import type { AIStakeholder } from '../../_shared/ai/prompts.ts';
import { classifyIntent, executeIntent } from '../../_shared/ai/intent-classifier.ts';
import { parseNaturalLanguageRule } from '../../_shared/ai/rules-engine.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<AIServicesAdapter> {
  const { adapter } = await resolveAdapter<AIServicesAdapter>('ai_services', tenantId);
  return adapter;
}

// =============================================================================
// CONVERSATIONAL BANKING — Intent-aware chat
// =============================================================================

/**
 * Enhanced chat that classifies intents and can execute actions.
 * Replaces the basic chat handlers with the full conversational banking flow.
 */
export async function conversationalChat(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const {
    message,
    stakeholder = 'member',
    conversationHistory = [],
    sessionId,
    accountContext,
    cardContext,
    tenantName = 'Your Credit Union',
    executeAction,        // if true, execute the confirmed intent
    confirmedIntent,      // the intent to execute (from previous confirmation)
  } = ctx.params as {
    message: string;
    stakeholder?: AIStakeholder;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    sessionId?: string;
    accountContext?: Array<{ id: string; type: string; nickname: string; lastFour: string; balanceCents: number }>;
    cardContext?: Array<{ id: string; type: string; lastFour: string; status: string }>;
    tenantName?: string;
    executeAction?: boolean;
    confirmedIntent?: { intent: string; gatewayAction: string; params: Record<string, unknown> };
  };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Message is required' }, status: 400 };
  }

  const ai = await getAdapter(ctx.firmId);

  // --- Step 1: If user confirmed an action, execute it ---
  if (executeAction && confirmedIntent) {
    const result = await executeIntent(
      {
        intent: confirmedIntent.intent,
        confidence: 1,
        gatewayAction: confirmedIntent.gatewayAction,
        params: confirmedIntent.params,
        confirmationMessage: '',
        requiresConfirmation: false,
      },
      async (action, params) => {
        // Route through the gateway dispatcher
        // In production, this would call the internal gateway invoke
        return { data: { success: true, action, params } };
      },
    );

    return {
      data: {
        reply: result.message,
        actionExecuted: result.success,
        actionResult: result.data,
        sessionId: sessionId ?? crypto.randomUUID(),
      },
    };
  }

  // --- Step 2: Classify intent for member stakeholder ---
  if (stakeholder === 'member') {
    const classification = await classifyIntent(message, ai, {
      accountContext,
      cardContext,
      conversationHistory,
    });

    if (classification.classified && classification.intent) {
      // Action intent detected — return confirmation prompt
      return {
        data: {
          reply: classification.intent.confirmationMessage,
          intentDetected: true,
          intent: {
            intent: classification.intent.intent,
            gatewayAction: classification.intent.gatewayAction,
            params: classification.intent.params,
            confidence: classification.intent.confidence,
            requiresConfirmation: classification.intent.requiresConfirmation,
            missingParams: classification.intent.missingParams,
          },
          sessionId: sessionId ?? crypto.randomUUID(),
        },
      };
    }
  }

  // --- Step 3: Fall through to RAG-enhanced conversational response ---
  const prompt = resolvePrompt(stakeholder, tenantName);
  const messages = buildMessages({
    systemPrompt: prompt.content,
    conversationHistory,
    currentMessage: message,
  });

  try {
    const response = await ai.complete({
      messages,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      trace: {
        name: `ai-${stakeholder}-chat`,
        sessionId,
        userId: ctx.userId,
        metadata: { tenantId: ctx.firmId, stakeholder },
      },
    });

    const needsEscalation =
      /contact (support|us|a representative)|speak (with|to) (a |an )?(representative|agent|person)|escalat/i.test(response.content);

    return {
      data: {
        reply: response.content,
        intentDetected: false,
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        needsEscalation,
        sessionId: sessionId ?? crypto.randomUUID(),
      },
    };
  } catch (err) {
    console.error(`[ai-platform] ${stakeholder} chat error:`, err);
    return {
      error: { code: 'SERVICE_UNAVAILABLE', message: 'The assistant is temporarily unavailable.' },
      status: 503,
    };
  }
}

// =============================================================================
// KNOWLEDGE BASE MANAGEMENT
// =============================================================================

/** Upload and process a document into the knowledge base */
export async function kbUploadDocument(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { title, content, category, expiresAt: _expiresAt, metadata: _metadata } = ctx.params as {
    title: string;
    content: string;
    category: string;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
  };

  if (!title || !content || !category) {
    return { error: { code: 'VALIDATION_ERROR', message: 'title, content, and category are required' }, status: 400 };
  }

  // In production: insert into kb_documents, chunk, embed, insert chunks
  const documentId = crypto.randomUUID();

  return {
    data: {
      document: {
        id: documentId,
        title,
        category,
        status: 'processing',
        chunkCount: Math.ceil(content.length / 2000),
        createdAt: new Date().toISOString(),
      },
    },
  };
}

/** List knowledge base documents */
export async function kbListDocuments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { category: _category, status: _status, limit = 50, offset = 0 } = ctx.params as {
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  };

  // In production: query kb_documents table
  return {
    data: {
      documents: [],
      total: 0,
      limit,
      offset,
    },
  };
}

/** Delete a knowledge base document */
export async function kbDeleteDocument(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { documentId } = ctx.params as { documentId: string };
  if (!documentId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'documentId is required' }, status: 400 };
  }

  return { data: { deleted: true } };
}

/** Search the knowledge base (test playground) */
export async function kbSearch(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { query, maxResults: _maxResults = 5 } = ctx.params as { query: string; maxResults?: number };
  if (!query) {
    return { error: { code: 'VALIDATION_ERROR', message: 'query is required' }, status: 400 };
  }

  // In production: embed query, call match_kb_chunks, return results with sources
  return {
    data: {
      results: [],
      query,
    },
  };
}

/** Get knowledge gaps — unanswered questions */
export async function kbGetGaps(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // In production: query kb_gaps table ordered by occurrence_count desc
  return {
    data: {
      gaps: [],
      total: 0,
    },
  };
}

// =============================================================================
// AUTOMATION RULES
// =============================================================================

/** List member's automation rules */
export async function listAutomationRules(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status: filterStatus, limit = 50, offset = 0 } = ctx.params as {
    status?: string;
    limit?: number;
    offset?: number;
  };

  let query = ctx.db
    .from('automation_rules')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filterStatus) {
    query = query.eq('status', filterStatus);
  }

  const { data: rules, count, error } = await query;

  if (error) {
    console.error('[ai-platform] listAutomationRules error:', error);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list rules' }, status: 500 };
  }

  return {
    data: {
      rules: (rules ?? []).map((r: Record<string, unknown>) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        triggerType: r.trigger_type,
        triggerConfig: r.trigger_config,
        actionType: r.action_type,
        actionParams: r.action_params,
        status: r.status,
        totalExecutions: r.total_executions,
        lastExecutedAt: r.last_executed_at,
        createdAt: r.created_at,
      })),
      total: count ?? 0,
    },
  };
}

/** Create an automation rule from natural language */
export async function createAutomationRule(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { description } = ctx.params as { description: string };
  if (!description) {
    return { error: { code: 'VALIDATION_ERROR', message: 'description is required' }, status: 400 };
  }

  const ai = await getAdapter(ctx.firmId);

  try {
    const parsed = await parseNaturalLanguageRule(description, ai);

    const ruleId = crypto.randomUUID();
    const { error: insertError } = await ctx.db
      .from('automation_rules')
      .insert({
        id: ruleId,
        tenant_id: ctx.firmId,
        user_id: ctx.userId,
        name: parsed.name,
        description,
        trigger_type: parsed.triggerType,
        trigger_config: parsed.triggerConfig,
        action_type: parsed.actionType,
        action_params: parsed.actionParams,
        status: 'active',
      });

    if (insertError) {
      console.error('[ai-platform] createAutomationRule insert error:', insertError);
      return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create rule' }, status: 500 };
    }

    return {
      data: {
        rule: {
          id: ruleId,
          name: parsed.name,
          description,
          triggerType: parsed.triggerType,
          triggerConfig: parsed.triggerConfig,
          actionType: parsed.actionType,
          actionParams: parsed.actionParams,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      },
    };
  } catch (err) {
    console.error('[ai-platform] createAutomationRule parse error:', err);
    return {
      error: { code: 'PARSE_ERROR', message: err instanceof Error ? err.message : 'Failed to parse rule' },
      status: 422,
    };
  }
}

/** Update an automation rule */
export async function updateAutomationRule(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { ruleId, status } = ctx.params as { ruleId: string; status?: string };
  if (!ruleId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'ruleId is required' }, status: 400 };
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;

  const { data: rule, error } = await ctx.db
    .from('automation_rules')
    .update(updates)
    .eq('id', ruleId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .select()
    .single();

  if (error || !rule) {
    return { error: { code: 'NOT_FOUND', message: 'Rule not found' }, status: 404 };
  }

  return { data: { rule: { id: rule.id, status: rule.status, updatedAt: rule.updated_at } } };
}

/** Delete an automation rule */
export async function deleteAutomationRule(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { ruleId } = ctx.params as { ruleId: string };
  if (!ruleId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'ruleId is required' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('automation_rules')
    .delete()
    .eq('id', ruleId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete rule' }, status: 500 };
  }

  return { data: { deleted: true } };
}

/** Get execution history for a rule or all rules */
export async function getAutomationHistory(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { ruleId, limit = 50, offset = 0 } = ctx.params as {
    ruleId?: string;
    limit?: number;
    offset?: number;
  };

  let query = ctx.db
    .from('autonomous_executions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.firmId)
    .eq('target_user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (ruleId) {
    query = query.eq('automation_rule_id', ruleId);
  }

  const { data: executions, count, error } = await query;

  if (error) {
    console.error('[ai-platform] getAutomationHistory error:', error);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch history' }, status: 500 };
  }

  return {
    data: {
      executions: (executions ?? []).map((e: Record<string, unknown>) => ({
        id: e.id,
        ruleId: e.automation_rule_id,
        action: e.action,
        actionParams: e.action_params,
        status: e.status,
        result: e.result,
        errorMessage: e.error_message,
        policyApproval: e.policy_approval,
        startedAt: e.started_at,
        completedAt: e.completed_at,
        createdAt: e.created_at,
      })),
      total: count ?? 0,
    },
  };
}

// =============================================================================
// PROACTIVE INSIGHTS
// =============================================================================

/** Get AI-generated insights for the current member */
export async function getInsights(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status: _status2 = 'pending', limit: _limit = 10 } = ctx.params as { status?: string; limit?: number };

  // In production: query ai_insights table
  return { data: { insights: [], total: 0 } };
}

/** Act on an insight (execute the suggested action) */
export async function actOnInsight(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { insightId } = ctx.params as { insightId: string };
  if (!insightId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'insightId is required' }, status: 400 };
  }

  // In production: look up insight, execute suggestedAction, update status
  return { data: { acted: true, insightId } };
}

/** Dismiss an insight */
export async function dismissInsight(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { insightId } = ctx.params as { insightId: string };
  if (!insightId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'insightId is required' }, status: 400 };
  }

  return { data: { dismissed: true } };
}

/** Generate insights on demand (admin/cron trigger) */
export async function generateInsights(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // In production: run insights engine for the given user
  return { data: { generated: 0, message: 'Insight generation queued' } };
}

// =============================================================================
// ESCALATION MANAGEMENT
// =============================================================================

/** Get escalation queue (staff) */
export async function getEscalationQueue(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status: _status3 = 'pending', priority: _priority } = ctx.params as { status?: string; priority?: string };

  // In production: query ai_escalations table
  return { data: { escalations: [], total: 0 } };
}

/** Get a single escalation with full context */
export async function getEscalation(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { escalationId } = ctx.params as { escalationId: string };
  if (!escalationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'escalationId is required' }, status: 400 };
  }

  return { data: { escalation: null } };
}

/** Assign an escalation to a staff member */
export async function assignEscalation(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { escalationId, assignedTo } = ctx.params as { escalationId: string; assignedTo: string };
  if (!escalationId || !assignedTo) {
    return { error: { code: 'VALIDATION_ERROR', message: 'escalationId and assignedTo are required' }, status: 400 };
  }

  return { data: { assigned: true } };
}

/** Resolve an escalation */
export async function resolveEscalation(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { escalationId, resolutionNotes: _resolutionNotes } = ctx.params as { escalationId: string; resolutionNotes: string };
  if (!escalationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'escalationId is required' }, status: 400 };
  }

  return { data: { resolved: true } };
}

// =============================================================================
// PROMPT MANAGEMENT (Admin)
// =============================================================================

/** List all system prompts for the tenant */
export async function listSystemPrompts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // Return default prompts (in production, merge with DB overrides)
  const prompts = Object.values(DEFAULT_PROMPTS).map((p) => ({
    id: `default-${p.stakeholder}`,
    ...p,
    isDefault: true,
    updatedAt: new Date().toISOString(),
  }));

  return { data: { prompts } };
}

/** Update a system prompt */
export async function updateSystemPrompt(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { promptId, stakeholder, content, name, description: _description, temperature, maxTokens } = ctx.params as {
    promptId?: string;
    stakeholder: AIStakeholder;
    content?: string;
    name?: string;
    description?: string;
    temperature?: number;
    maxTokens?: number;
  };

  if (!stakeholder) {
    return { error: { code: 'VALIDATION_ERROR', message: 'stakeholder is required' }, status: 400 };
  }

  // In production: upsert into ai_system_prompts table
  return {
    data: {
      prompt: {
        id: promptId ?? crypto.randomUUID(),
        stakeholder,
        name: name ?? DEFAULT_PROMPTS[stakeholder].name,
        content: content ?? DEFAULT_PROMPTS[stakeholder].content,
        temperature: temperature ?? DEFAULT_PROMPTS[stakeholder].temperature,
        maxTokens: maxTokens ?? DEFAULT_PROMPTS[stakeholder].maxTokens,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

/** Test a prompt in the playground */
export async function testPrompt(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { stakeholder, message, customPrompt, tenantName = 'Test Bank' } = ctx.params as {
    stakeholder: AIStakeholder;
    message: string;
    customPrompt?: string;
    tenantName?: string;
  };

  if (!stakeholder || !message) {
    return { error: { code: 'VALIDATION_ERROR', message: 'stakeholder and message are required' }, status: 400 };
  }

  const ai = await getAdapter(ctx.firmId);
  const prompt = resolvePrompt(stakeholder, tenantName, customPrompt);

  const messages = buildMessages({
    systemPrompt: prompt.content,
    currentMessage: message,
  });

  try {
    const response = await ai.complete({
      messages,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
    });

    return {
      data: {
        reply: response.content,
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        stakeholder,
      },
    };
  } catch (err) {
    console.error('[ai-platform] test prompt error:', err);
    return {
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Failed to test prompt' },
      status: 503,
    };
  }
}
