// TODO: Provisional integration — not yet validated in production.
/**
 * Multi-Provider AI Services Adapter
 *
 * Production adapter that wraps the existing ai.ts client and adds:
 * - Adapter pattern compliance (health check, circuit breaker config)
 * - LangSmith / LangFuse observability integration
 * - Embedding support
 * - Model listing
 *
 * Supports: Vertex AI (Gemini), Anthropic (Claude), OpenAI (GPT)
 *
 * Observability:
 *   LANGSMITH_API_KEY + LANGSMITH_PROJECT → LangSmith tracing
 *   LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY → LangFuse tracing
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  AIServicesAdapter,
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIEmbeddingRequest,
  AIEmbeddingResponse,
  ObservabilityConfig,
} from './types.ts';

// =============================================================================
// OBSERVABILITY
// =============================================================================

function resolveObservabilityConfig(): ObservabilityConfig {
  const langsmithKey = Deno.env.get('LANGSMITH_API_KEY');
  if (langsmithKey) {
    return {
      provider: 'langsmith',
      apiKey: langsmithKey,
      project: Deno.env.get('LANGSMITH_PROJECT') ?? 'default',
      logPrompts: Deno.env.get('LANGSMITH_LOG_PROMPTS') !== 'false',
    };
  }

  const langfusePublic = Deno.env.get('LANGFUSE_PUBLIC_KEY');
  const langfuseSecret = Deno.env.get('LANGFUSE_SECRET_KEY');
  if (langfusePublic && langfuseSecret) {
    return {
      provider: 'langfuse',
      apiKey: langfuseSecret,
      project: Deno.env.get('LANGFUSE_PROJECT') ?? 'default',
      endpoint: Deno.env.get('LANGFUSE_HOST') ?? 'https://cloud.langfuse.com',
      logPrompts: Deno.env.get('LANGFUSE_LOG_PROMPTS') !== 'false',
    };
  }

  return { provider: 'none', logPrompts: false };
}

async function sendTrace(
  config: ObservabilityConfig,
  span: {
    name: string;
    provider: AIProvider;
    model: string;
    latencyMs: number;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    status: 'success' | 'error';
    error?: string;
    metadata?: Record<string, unknown>;
    input?: string;
    output?: string;
  },
): Promise<void> {
  if (config.provider === 'none') return;

  try {
    if (config.provider === 'langsmith') {
      await fetch('https://api.smith.langchain.com/runs', {
        method: 'POST',
        headers: {
          'X-API-Key': config.apiKey ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: span.name,
          run_type: 'llm',
          inputs: config.logPrompts ? { input: span.input } : {},
          outputs: config.logPrompts ? { output: span.output } : {},
          extra: {
            provider: span.provider,
            model: span.model,
            latency_ms: span.latencyMs,
            ...span.usage,
            ...span.metadata,
          },
          error: span.error,
          session_name: config.project,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } else if (config.provider === 'langfuse') {
      const endpoint = config.endpoint ?? 'https://cloud.langfuse.com';
      await fetch(`${endpoint}/api/public/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${Deno.env.get('LANGFUSE_PUBLIC_KEY')}:${config.apiKey}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: span.name,
          model: span.model,
          input: config.logPrompts ? span.input : undefined,
          output: config.logPrompts ? span.output : undefined,
          usage: span.usage ? {
            promptTokens: span.usage.promptTokens,
            completionTokens: span.usage.completionTokens,
            totalTokens: span.usage.totalTokens,
          } : undefined,
          metadata: { provider: span.provider, latencyMs: span.latencyMs, ...span.metadata },
          level: span.status === 'error' ? 'ERROR' : 'DEFAULT',
          statusMessage: span.error,
        }),
        signal: AbortSignal.timeout(5000),
      });
    }
  } catch {
    // Fire-and-forget — never block on observability failures
  }
}

// =============================================================================
// PROVIDER HELPERS
// =============================================================================

function detectProvider(): AIProvider {
  if (Deno.env.get('VERTEX_PROJECT_ID') && Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')) return 'vertex';
  if (Deno.env.get('ANTHROPIC_API_KEY')) return 'anthropic';
  if (Deno.env.get('OPENAI_API_KEY')) return 'openai';
  return 'vertex'; // Default
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  vertex: 'gemini-2.0-flash-001',
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
};

const EMBEDDING_MODELS: Record<AIProvider, string> = {
  vertex: 'text-embedding-004',
  openai: 'text-embedding-3-small',
  anthropic: 'text-embedding-3-small', // Anthropic doesn't have embeddings; fall back to OpenAI
};

// =============================================================================
// ADAPTER
// =============================================================================

export class MultiProviderAIAdapter implements AIServicesAdapter {
  private readonly provider: AIProvider;
  private readonly observability: ObservabilityConfig;

  readonly config: AdapterConfig = {
    id: 'multi-provider-ai',
    name: 'Multi-Provider AI Services',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
    timeout: { requestTimeoutMs: 60000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(provider?: AIProvider) {
    this.provider = provider ?? (Deno.env.get('AI_PROVIDER') as AIProvider) ?? detectProvider();
    this.observability = resolveObservabilityConfig();
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      // Quick completion test
      const result = await this.complete({
        messages: [{ role: 'user', content: 'Reply with "ok"' }],
        maxTokens: 5,
      });
      return {
        adapterId: this.config.id,
        healthy: !!result.content,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model ?? DEFAULT_MODELS[this.provider];
    const startMs = Date.now();

    try {
      let result: AICompletionResponse;

      switch (this.provider) {
        case 'vertex':
          result = await this.callVertex(request, model);
          break;
        case 'anthropic':
          result = await this.callAnthropic(request, model);
          break;
        case 'openai':
          result = await this.callOpenAI(request, model);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${this.provider}`);
      }

      result.latencyMs = Date.now() - startMs;

      // Fire-and-forget trace
      sendTrace(this.observability, {
        name: request.trace?.name ?? 'ai.complete',
        provider: this.provider,
        model,
        latencyMs: result.latencyMs,
        usage: result.usage,
        status: 'success',
        metadata: request.trace?.metadata,
        input: request.messages[request.messages.length - 1]?.content,
        output: result.content.slice(0, 500),
      });

      return result;
    } catch (err) {
      sendTrace(this.observability, {
        name: request.trace?.name ?? 'ai.complete',
        provider: this.provider,
        model,
        latencyMs: Date.now() - startMs,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        metadata: request.trace?.metadata,
      });
      throw err;
    }
  }

  async completeJSON<T = Record<string, unknown>>(request: AICompletionRequest): Promise<T> {
    const response = await this.complete({ ...request, jsonResponse: true });

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.content.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    return JSON.parse(jsonStr) as T;
  }

  async embed(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const model = request.model ?? EMBEDDING_MODELS[this.provider];

    // Use OpenAI-compatible embedding endpoint
    const apiKey = this.provider === 'openai'
      ? Deno.env.get('OPENAI_API_KEY')
      : Deno.env.get('OPENAI_API_KEY'); // Fall back to OpenAI for embeddings

    if (!apiKey) {
      // Return zero vectors if no embedding provider configured
      return {
        embeddings: inputs.map(() => new Array(1536).fill(0)),
        provider: this.provider,
        model,
        usage: { totalTokens: 0 },
      };
    }

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: inputs, model }),
    });

    if (!res.ok) throw new Error(`Embedding API error (${res.status})`);

    const data = await res.json();
    return {
      embeddings: data.data.map((d: { embedding: number[] }) => d.embedding),
      provider: this.provider,
      model,
      usage: { totalTokens: data.usage?.total_tokens ?? 0 },
    };
  }

  async listModels(): Promise<string[]> {
    return [
      // Vertex / Gemini
      'gemini-2.0-flash-001',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      // Anthropic
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
      'claude-haiku-4-5-20251001',
      // OpenAI
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'o1',
      'o1-mini',
    ];
  }

  getObservabilityConfig(): ObservabilityConfig {
    return this.observability;
  }

  // ---------------------------------------------------------------------------
  // Provider-specific implementations
  // ---------------------------------------------------------------------------

  private async callVertex(request: AICompletionRequest, model: string): Promise<AICompletionResponse> {
    // Use existing Vertex integration via ai.ts
    const { AIClient } = await import('../../ai.ts');
    const client = new AIClient({ provider: 'gemini', model });
    const result = await client.complete({
      messages: request.messages,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      jsonResponse: request.jsonResponse,
    });
    return {
      content: result.content,
      provider: 'vertex',
      model: result.model,
      usage: result.usage,
    };
  }

  private async callAnthropic(request: AICompletionRequest, model: string): Promise<AICompletionResponse> {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const systemMessage = request.messages.find(m => m.role === 'system');
    const nonSystemMessages = request.messages.filter(m => m.role !== 'system');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        system: systemMessage?.content,
        messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API error (${res.status}): ${await res.text()}`);

    const data = await res.json();
    return {
      content: data.content?.[0]?.text ?? '',
      provider: 'anthropic',
      model: data.model,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    };
  }

  private async callOpenAI(request: AICompletionRequest, model: string): Promise<AICompletionResponse> {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const body: Record<string, unknown> = {
      model,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
    };

    if (request.jsonResponse) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`OpenAI API error (${res.status}): ${await res.text()}`);

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      provider: 'openai',
      model: data.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }
}
