/**
 * AI Services Adapter Interface
 *
 * Defines the contract for AI/LLM service integration.
 * Supports multiple providers: Vertex AI (Gemini), Anthropic (Claude), OpenAI (GPT).
 * Includes observability via LangSmith/LangFuse tracing.
 *
 * This is a platform-level adapter — not specific to banking operations.
 * Used for: document extraction, sentiment analysis, chat, embeddings,
 * content generation, and any AI-powered feature.
 *
 * Configuration:
 *   AI_PROVIDER — default provider (vertex, anthropic, openai)
 *   LANGSMITH_API_KEY — optional LangSmith tracing key
 *   LANGSMITH_PROJECT — optional LangSmith project name
 *   LANGFUSE_HOST — optional LangFuse host for self-hosted observability
 *   LANGFUSE_PUBLIC_KEY — optional LangFuse public key
 *   LANGFUSE_SECRET_KEY — optional LangFuse secret key
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// CORE TYPES
// =============================================================================

export type AIProvider = 'vertex' | 'anthropic' | 'openai';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  /** Conversation messages */
  messages: AIMessage[];
  /** Model override (uses provider default if omitted) */
  model?: string;
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Request JSON-formatted response */
  jsonResponse?: boolean;
  /** Trace metadata for observability */
  trace?: {
    /** Trace name for LangSmith/LangFuse */
    name?: string;
    /** Custom metadata tags */
    metadata?: Record<string, unknown>;
    /** Session ID for conversation tracking */
    sessionId?: string;
    /** User ID for usage attribution */
    userId?: string;
  };
}

export interface AICompletionResponse {
  /** Generated text content */
  content: string;
  /** Provider that served the request */
  provider: AIProvider;
  /** Model used */
  model: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Latency in milliseconds */
  latencyMs?: number;
  /** Trace ID for debugging */
  traceId?: string;
}

export interface AIEmbeddingRequest {
  /** Text to embed */
  input: string | string[];
  /** Model override */
  model?: string;
  /** Trace metadata */
  trace?: {
    name?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface AIEmbeddingResponse {
  /** Embedding vectors */
  embeddings: number[][];
  /** Provider */
  provider: AIProvider;
  /** Model used */
  model: string;
  /** Token usage */
  usage?: {
    totalTokens: number;
  };
}

// =============================================================================
// OBSERVABILITY TYPES
// =============================================================================

export type ObservabilityProvider = 'langsmith' | 'langfuse' | 'none';

export interface ObservabilityConfig {
  provider: ObservabilityProvider;
  /** API key for the observability platform */
  apiKey?: string;
  /** Project/workspace name */
  project?: string;
  /** Custom endpoint for self-hosted */
  endpoint?: string;
  /** Whether to log prompt content (disable for PII compliance) */
  logPrompts: boolean;
}

export interface TraceSpan {
  spanId: string;
  traceId: string;
  name: string;
  provider: AIProvider;
  model: string;
  startedAt: string;
  completedAt?: string;
  latencyMs?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  status: 'success' | 'error';
  error?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface AIServicesAdapter extends BaseAdapter {
  /** Generate a text completion */
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;

  /** Generate a JSON completion (parsed and validated) */
  completeJSON<T = Record<string, unknown>>(request: AICompletionRequest): Promise<T>;

  /** Generate text embeddings */
  embed(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse>;

  /** Get available models for this provider */
  listModels(): Promise<string[]>;

  /** Get the current observability configuration */
  getObservabilityConfig(): ObservabilityConfig;
}
