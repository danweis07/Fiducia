/**
 * AI Chat Assistant Gateway Handlers
 *
 * Provides conversational AI for financial questions, support, and guidance.
 * Uses the registered AI services adapter (Vertex/Anthropic/OpenAI).
 * Supports RAG context injection and human-in-the-loop escalation.
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
- Understanding their account information, balances, and transactions
- Explaining banking products (checking, savings, CDs, loans, credit cards)
- Answering questions about transfers, bill pay, and mobile deposits
- Providing general financial literacy guidance
- Troubleshooting common banking issues

Guidelines:
- Be concise and helpful
- Never share or ask for full account numbers, SSNs, or passwords
- For complex issues (disputes, fraud, account closures), recommend contacting support
- If you cannot answer a question, say so and suggest speaking with a representative
- Keep responses under 300 words unless more detail is specifically requested`;

// =============================================================================
// HANDLERS
// =============================================================================

/** Send a chat message and get AI response */
export async function sendMessage(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { message, conversationId, context } = ctx.params as {
    message: string;
    conversationId?: string;
    context?: { accountSummary?: string; recentTransactions?: string };
  };

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Message is required' }, status: 400 };
  }

  if (message.length > 2000) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Message must be under 2000 characters' }, status: 400 };
  }

  const ai = await getAdapter(ctx.firmId);

  // Build messages array with system prompt + optional RAG context
  let systemContent = BANKING_ASSISTANT_PROMPT;

  // Inject RAG context if provided
  if (context?.accountSummary || context?.recentTransactions) {
    let contextBlock = '\n\nCurrent customer context (use to answer questions, do not reveal raw data):\n';
    if (context.accountSummary) contextBlock += `Account Summary: ${context.accountSummary}\n`;
    if (context.recentTransactions) contextBlock += `Recent Transactions: ${context.recentTransactions}\n`;
    systemContent += contextBlock;
  }

  const messages = [
    { role: 'system' as const, content: systemContent },
    { role: 'user' as const, content: message },
  ];

  try {
    const response = await ai.complete({
      messages,
      temperature: 0.3,
      maxTokens: 1024,
      trace: {
        name: 'banking-chat',
        sessionId: conversationId,
        userId: ctx.userId,
        metadata: {
          tenantId: ctx.firmId,
          messageLength: message.length,
        },
      },
    });

    // Check if the response suggests escalation
    const needsEscalation = /contact (support|us|a representative)|speak (with|to) (a |an )?(representative|agent|person)/i.test(response.content);

    return {
      data: {
        reply: response.content,
        conversationId: conversationId || crypto.randomUUID(),
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        traceId: response.traceId,
        needsEscalation,
      },
    };
  } catch (err) {
    console.error('[ai-chat] completion error:', err);
    return {
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'The assistant is temporarily unavailable. Please try again.',
      },
      status: 503,
    };
  }
}

/** Get suggested prompts/quick actions for the chat */
export async function getSuggestions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  return {
    data: {
      suggestions: [
        { label: 'Account balance', prompt: 'What is my current account balance?' },
        { label: 'Recent transactions', prompt: 'Show me my recent transactions' },
        { label: 'Transfer help', prompt: 'How do I transfer money to another account?' },
        { label: 'Bill pay', prompt: 'How do I set up bill pay?' },
        { label: 'CD rates', prompt: 'What CD rates do you offer?' },
        { label: 'Report lost card', prompt: 'I need to report a lost or stolen card' },
      ],
    },
  };
}

/** Submit feedback on an AI response (thumbs up/down) */
export async function submitFeedback(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { conversationId, rating } = ctx.params as {
    conversationId: string;
    messageId?: string;
    rating: 'positive' | 'negative';
    comment?: string;
  };

  if (!conversationId || !rating) {
    return { error: { code: 'VALIDATION_ERROR', message: 'conversationId and rating are required' }, status: 400 };
  }

  // In production, this would log to the observability platform (LangSmith/LangFuse)
  // and potentially create a support ticket for negative feedback
  console.warn(`[ai-chat] feedback: ${rating} for conversation ${conversationId}`);

  return { data: { success: true } };
}

/** Escalate to human support */
export async function escalateToHuman(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { conversationId } = ctx.params as {
    conversationId: string;
    reason?: string;
    transcript?: Array<{ role: string; content: string }>;
  };

  if (!conversationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'conversationId is required' }, status: 400 };
  }

  // In production: create a support ticket, notify support team via webhook, etc.
  return {
    data: {
      escalated: true,
      ticketId: `ESC-${Date.now()}`,
      message: 'Your conversation has been forwarded to our support team. A representative will reach out shortly.',
    },
  };
}
