/**
 * Mock AI Services Adapter
 *
 * Returns synthetic AI responses for development and testing.
 * Simulates latency and token usage for realistic behavior.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  AIServicesAdapter,
  AICompletionRequest,
  AICompletionResponse,
  AIEmbeddingRequest,
  AIEmbeddingResponse,
  ObservabilityConfig,
} from './types.ts';

export class MockAIServicesAdapter implements AIServicesAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-ai',
    name: 'Mock AI Services (Sandbox)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const startMs = Date.now();

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    const lastMessage = request.messages[request.messages.length - 1];
    const promptLength = request.messages.reduce((s, m) => s + m.content.length, 0);

    let content: string;
    if (request.jsonResponse) {
      content = JSON.stringify({
        result: 'mock_response',
        confidence: 0.95,
        summary: `Mock AI analysis of: "${lastMessage.content.slice(0, 50)}..."`,
      });
    } else {
      content = `[Mock AI Response] Based on the input "${lastMessage.content.slice(0, 80)}...", here is a synthesized response for development purposes.`;
    }

    return {
      content,
      provider: 'vertex',
      model: request.model ?? 'mock-model',
      usage: {
        promptTokens: Math.ceil(promptLength / 4),
        completionTokens: Math.ceil(content.length / 4),
        totalTokens: Math.ceil((promptLength + content.length) / 4),
      },
      latencyMs: Date.now() - startMs,
      traceId: `trace_mock_${Date.now()}`,
    };
  }

  async completeJSON<T = Record<string, unknown>>(request: AICompletionRequest): Promise<T> {
    const response = await this.complete({ ...request, jsonResponse: true });
    return JSON.parse(response.content) as T;
  }

  async embed(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const dimension = 768;

    return {
      embeddings: inputs.map(() =>
        Array.from({ length: dimension }, () => (Math.random() - 0.5) * 2)
      ),
      provider: 'vertex',
      model: request.model ?? 'mock-embedding-model',
      usage: {
        totalTokens: inputs.reduce((s, t) => s + Math.ceil(t.length / 4), 0),
      },
    };
  }

  async listModels(): Promise<string[]> {
    return [
      'gemini-2.0-flash-001',
      'gemini-1.5-pro',
      'gpt-4o',
      'gpt-4o-mini',
      'claude-sonnet-4-20250514',
      'claude-haiku-4-5-20251001',
    ];
  }

  getObservabilityConfig(): ObservabilityConfig {
    return {
      provider: 'none',
      logPrompts: false,
    };
  }
}
