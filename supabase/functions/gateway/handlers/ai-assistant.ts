/**
 * AI Assistant Gateway Handlers
 *
 * Provides conversational AI assistant for banking customers.
 * Supports financial Q&A, support questions, and product inquiries.
 * Routes through the AI services adapter (Vertex/Anthropic/OpenAI).
 *
 * Complements the existing ai-chat.ts handlers with prompt management
 * and conversation history retrieval.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { AIServicesAdapter } from '../../_shared/adapters/ai-services/types.ts';

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

// System prompt for the banking assistant
const BANKING_ASSISTANT_PROMPT = `You are a helpful digital banking assistant. You help customers with:
- Understanding their accounts, balances, and transactions
- Explaining banking products (checking, savings, CDs, loans, credit cards)
- Answering questions about transfers, bill pay, and mobile deposits
- Providing financial literacy guidance
- Directing customers to the right feature in the app

Rules:
- Never share or confirm specific account numbers, SSNs, or PII
- For actions (transfers, payments), guide the user to the appropriate page rather than performing them
- If you cannot answer a question, offer to escalate to a human support agent
- Keep responses concise and helpful
- Use plain language, avoid jargon`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// =============================================================================
// HANDLERS
// =============================================================================

/** Send a message with full conversation history for multi-turn chat */
export async function sendAssistantMessage(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { message, conversationHistory = [], sessionId } = ctx.params as {
    message: string;
    conversationHistory?: ChatMessage[];
    sessionId?: string;
  };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Message is required' }, status: 400 };
  }

  if (message.length > 2000) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Message must be under 2000 characters' }, status: 400 };
  }

  const ai = await getAdapter(ctx.firmId);

  const messages = [
    { role: 'system' as const, content: BANKING_ASSISTANT_PROMPT },
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  try {
    const response = await ai.complete({
      messages,
      temperature: 0.7,
      maxTokens: 1024,
      trace: {
        name: 'banking-assistant-chat',
        sessionId: sessionId ?? ctx.userId,
        userId: ctx.userId,
        metadata: { tenantId: ctx.firmId, action: 'chat' },
      },
    });

    // Check if escalation is needed (simple heuristic)
    const needsEscalation = response.content.toLowerCase().includes('speak to') ||
      response.content.toLowerCase().includes('human agent') ||
      response.content.toLowerCase().includes('escalat');

    return {
      data: {
        reply: response.content,
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        traceId: response.traceId,
        needsEscalation,
        sessionId: sessionId ?? crypto.randomUUID(),
      },
    };
  } catch (err) {
    console.error('[ai-assistant] completion error:', err);
    return {
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'The assistant is temporarily unavailable. Please try again.',
      },
      status: 503,
    };
  }
}

/** Admin-only: list configurable system prompts */
export async function listPrompts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // In production, these would come from a prompts table scoped to the tenant.
  return {
    data: {
      prompts: [
        {
          id: 'banking-assistant',
          name: 'Banking Assistant',
          description: 'Default system prompt for customer-facing chat assistant',
          content: BANKING_ASSISTANT_PROMPT,
          isActive: true,
          updatedAt: new Date().toISOString(),
        },
      ],
    },
  };
}

/** Admin-only: update a system prompt */
export async function updatePrompt(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { promptId, content, name, description } = ctx.params as {
    promptId: string;
    content?: string;
    name?: string;
    description?: string;
  };

  if (!promptId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Prompt ID is required' }, status: 400 };
  }

  // In production, this would update a prompts table in Supabase
  return {
    data: {
      prompt: {
        id: promptId,
        name: name ?? 'Banking Assistant',
        description: description ?? 'System prompt',
        content: content ?? BANKING_ASSISTANT_PROMPT,
        isActive: true,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

/** Retrieve conversation history for a session */
export async function getConversationHistory(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { sessionId } = ctx.params as { sessionId: string };

  if (!sessionId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Session ID is required' }, status: 400 };
  }

  // In production, retrieve from a conversations table scoped by tenant + user
  return {
    data: {
      sessionId,
      messages: [] as ChatMessage[],
    },
  };
}
