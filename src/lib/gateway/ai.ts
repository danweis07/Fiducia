/**
 * Gateway Domain — AI Chat Assistant, AI Platform
 */

import type { CallGatewayFn } from './client';

export function createAiDomain(callGateway: CallGatewayFn) {
  return {
    ai: {
      async sendMessage(params: {
        message: string;
        conversationId?: string;
        context?: { accountSummary?: string; recentTransactions?: string };
      }) {
        return callGateway<{
          reply: string;
          conversationId: string;
          provider: string;
          model: string;
          usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
          traceId?: string;
          needsEscalation: boolean;
        }>('ai.chat.send', params);
      },

      async getSuggestions() {
        return callGateway<{
          suggestions: Array<{ label: string; prompt: string }>;
        }>('ai.chat.suggestions', {});
      },

      async submitFeedback(params: {
        conversationId: string;
        messageId?: string;
        rating: 'positive' | 'negative';
        comment?: string;
      }) {
        return callGateway<{ success: boolean }>('ai.chat.feedback', params);
      },

      async escalate(params: {
        conversationId: string;
        reason?: string;
        transcript?: Array<{ role: string; content: string }>;
      }) {
        return callGateway<{
          escalated: boolean;
          ticketId: string;
          message: string;
        }>('ai.chat.escalate', params);
      },

      async chat(params: {
        message: string;
        conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
        sessionId?: string;
      }) {
        return callGateway<{
          reply: string;
          provider: string;
          model: string;
          usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
          traceId?: string;
          needsEscalation: boolean;
          sessionId: string;
        }>('ai.assistant.chat', params);
      },

      async listPrompts() {
        return callGateway<{
          prompts: Array<{
            id: string;
            name: string;
            description: string;
            content: string;
            isActive: boolean;
            updatedAt: string;
          }>;
        }>('ai.prompts.list', {});
      },

      async updatePrompt(params: { promptId: string; content?: string; name?: string; description?: string }) {
        return callGateway<{
          prompt: {
            id: string;
            name: string;
            description: string;
            content: string;
            isActive: boolean;
            updatedAt: string;
          };
        }>('ai.prompts.update', params);
      },

      async getHistory(sessionId: string) {
        return callGateway<{
          sessionId: string;
          messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        }>('ai.history', { sessionId });
      },
    },

    aiPlatform: {
      /** Send a conversational chat message with intent classification */
      async chat(params: {
        message: string;
        stakeholder?: 'member' | 'staff' | 'marketing' | 'audit';
        conversationId?: string;
        executeAction?: boolean;
        confirmedIntent?: Record<string, unknown>;
      }) {
        return callGateway<{
          reply: string;
          conversationId: string;
          intent?: { type: string; confidence: number; parameters: Record<string, unknown>; confirmationMessage: string };
          actionResult?: { success: boolean; message: string };
        }>('ai.platform.chat', params);
      },

      // Knowledge Base
      kb: {
        async upload(params: { title: string; content: string; category: string; metadata?: Record<string, unknown> }) {
          return callGateway<{ document: { id: string; title: string; status: string; chunkCount: number } }>('ai.kb.upload', params);
        },
        async list(params: { category?: string; status?: string; limit?: number; offset?: number } = {}) {
          return callGateway<{ documents: Array<{ id: string; title: string; category: string; status: string; createdAt: string }> }>('ai.kb.list', params);
        },
        async remove(documentId: string) {
          return callGateway<{ success: boolean }>('ai.kb.delete', { documentId });
        },
        async search(query: string, params: { maxResults?: number; threshold?: number } = {}) {
          return callGateway<{ results: Array<{ content: string; documentId: string; title: string; similarity: number }> }>('ai.kb.search', { query, ...params });
        },
        async gaps(params: { limit?: number; resolved?: boolean } = {}) {
          return callGateway<{ gaps: Array<{ id: string; query: string; occurrenceCount: number; lastAskedAt: string; resolved: boolean }> }>('ai.kb.gaps', params);
        },
      },

      // Automation Rules
      automation: {
        async list(params: { status?: string } = {}) {
          return callGateway<{ rules: Array<{ id: string; name: string; description: string; triggerType: string; status: string; totalExecutions: number; lastExecutedAt: string | null }> }>('ai.automation.list', params);
        },
        async create(params: { description: string }) {
          return callGateway<{ rule: { id: string; name: string; triggerType: string; triggerConfig: Record<string, unknown>; actionType: string; actionParams: Record<string, unknown> } }>('ai.automation.create', params);
        },
        async update(ruleId: string, updates: { status?: string; name?: string }) {
          return callGateway<{ rule: { id: string; status: string } }>('ai.automation.update', { ruleId, ...updates });
        },
        async remove(ruleId: string) {
          return callGateway<{ success: boolean }>('ai.automation.delete', { ruleId });
        },
        async history(ruleId: string, params: { limit?: number } = {}) {
          return callGateway<{ executions: Array<{ id: string; status: string; triggerEvent: Record<string, unknown>; actionResult: Record<string, unknown> | null; executedAt: string }> }>('ai.automation.history', { ruleId, ...params });
        },
      },

      // Proactive Insights
      insights: {
        async list(params: { status?: string; type?: string } = {}) {
          return callGateway<{ insights: Array<{ id: string; type: string; title: string; message: string; severity: string; suggestedAction: Record<string, unknown> | null; status: string; createdAt: string }> }>('ai.insights.list', params);
        },
        async act(insightId: string) {
          return callGateway<{ success: boolean; actionResult?: Record<string, unknown> }>('ai.insights.act', { insightId });
        },
        async dismiss(insightId: string) {
          return callGateway<{ success: boolean }>('ai.insights.dismiss', { insightId });
        },
        async generate() {
          return callGateway<{ insights: Array<{ type: string; title: string; message: string; severity: string }> }>('ai.insights.generate', {});
        },
      },

      // Escalation Queue
      escalations: {
        async queue(params: { status?: string; priority?: string; limit?: number; offset?: number } = {}) {
          return callGateway<{ escalations: Array<{ id: string; reason: string; summary: string; sentiment: string; priority: string; status: string; assignedTo: string | null; createdAt: string }> }>('ai.escalations.queue', params);
        },
        async get(escalationId: string) {
          return callGateway<{ escalation: { id: string; reason: string; summary: string; transcript: Array<{ role: string; content: string }>; sentiment: string; priority: string; status: string; resolutionNotes: string | null } }>('ai.escalations.get', { escalationId });
        },
        async assign(escalationId: string, assignedTo: string) {
          return callGateway<{ success: boolean }>('ai.escalations.assign', { escalationId, assignedTo });
        },
        async resolve(escalationId: string, resolutionNotes: string) {
          return callGateway<{ success: boolean }>('ai.escalations.resolve', { escalationId, resolutionNotes });
        },
      },

      // Prompt Management (Admin)
      prompts: {
        async list() {
          return callGateway<{ prompts: Array<{ id: string; stakeholder: string; name: string; description: string; isActive: boolean; version: number }> }>('ai.platform.prompts.list', {});
        },
        async update(promptId: string, updates: { content?: string; temperature?: number; maxTokens?: number; isActive?: boolean }) {
          return callGateway<{ prompt: { id: string; version: number } }>('ai.platform.prompts.update', { promptId, ...updates });
        },
        async test(params: { stakeholder: string; message: string; customContent?: string }) {
          return callGateway<{ reply: string; tokensUsed: number }>('ai.platform.prompts.test', params);
        },
      },
    },
  };
}
