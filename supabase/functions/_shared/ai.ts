/**
 * Unified AI Provider
 *
 * Shared AI abstraction layer that supports multiple providers:
 * - Gemini (via Vertex AI) - default
 * - OpenAI (GPT-4)
 * - Anthropic (Claude)
 *
 * Used by edge functions for:
 * - Email draft generation
 * - Document extraction
 * - Sentiment analysis
 * - Insight generation
 *
 * Location: supabase/functions/_shared/ai.ts
 */

import {
  getVertexConfig,
  callGemini,
  type VertexConfig,
} from './vertex.ts';

// =============================================================================
// TYPES
// =============================================================================

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AIConfig {
  provider: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonResponse?: boolean;
}

export interface AICompletionResult {
  content: string;
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// =============================================================================
// DEFAULT MODELS
// =============================================================================

const DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-2.0-flash-001',
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
};

// =============================================================================
// AI CLIENT
// =============================================================================

export class AIClient {
  private provider: AIProvider;
  private model: string;
  private vertexConfig: VertexConfig | null = null;

  constructor(config?: Partial<AIConfig>) {
    // Determine provider from config or environment
    this.provider = config?.provider || this.detectProvider();
    this.model = config?.model || DEFAULT_MODELS[this.provider];

    // Initialize provider-specific config
    if (this.provider === 'gemini') {
      this.vertexConfig = getVertexConfig();
      if (!this.vertexConfig) {
        console.warn('Gemini config not found, falling back to OpenAI');
        this.provider = 'openai';
        this.model = DEFAULT_MODELS.openai;
      }
    }
  }

  /**
   * Detect which provider to use based on available credentials
   */
  private detectProvider(): AIProvider {
    // Check for Vertex AI (Gemini) first - preferred
    if (Deno.env.get('VERTEX_PROJECT_ID') && Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')) {
      return 'gemini';
    }

    // Check for OpenAI
    if (Deno.env.get('OPENAI_API_KEY')) {
      return 'openai';
    }

    // Check for Anthropic
    if (Deno.env.get('ANTHROPIC_API_KEY')) {
      return 'anthropic';
    }

    // Default to Gemini (will fail if not configured)
    return 'gemini';
  }

  /**
   * Get a text completion from the AI
   */
  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const { messages, temperature = 0.1, maxTokens = 2048, jsonResponse = false } = options;

    switch (this.provider) {
      case 'gemini':
        return this.completeWithGemini(messages, temperature, maxTokens, jsonResponse);

      case 'openai':
        return this.completeWithOpenAI(messages, temperature, maxTokens, jsonResponse);

      case 'anthropic':
        return this.completeWithAnthropic(messages, temperature, maxTokens, jsonResponse);

      default:
        throw new Error(`Unknown AI provider: ${this.provider}`);
    }
  }

  /**
   * Get a structured JSON response from the AI
   */
  async completeJSON<T>(options: Omit<AICompletionOptions, 'jsonResponse'>): Promise<T> {
    const result = await this.complete({ ...options, jsonResponse: true });

    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const text = result.content;
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
      return JSON.parse(jsonStr) as T;
    } catch (err) {
      throw new Error(`Failed to parse AI JSON response: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // ===========================================================================
  // PROVIDER-SPECIFIC IMPLEMENTATIONS
  // ===========================================================================

  private async completeWithGemini(
    messages: AIMessage[],
    temperature: number,
    maxTokens: number,
    jsonResponse: boolean
  ): Promise<AICompletionResult> {
    if (!this.vertexConfig) {
      throw new Error('Vertex AI (Gemini) not configured');
    }

    // Convert messages to Gemini format
    // Gemini doesn't have a system role, so we prepend it to the first user message
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    let prompt = '';
    if (systemMessage) {
      prompt += `Instructions: ${systemMessage.content}\n\n`;
    }

    for (const msg of conversationMessages) {
      if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n\n`;
      }
    }

    prompt += 'Assistant:';

    const content = await callGemini(this.vertexConfig, prompt, {
      model: this.model,
      temperature,
      maxOutputTokens: maxTokens,
      jsonResponse,
    });

    return {
      content,
      provider: 'gemini',
      model: this.model,
    };
  }

  private async completeWithOpenAI(
    messages: AIMessage[],
    temperature: number,
    maxTokens: number,
    jsonResponse: boolean
  ): Promise<AICompletionResult> {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
        ...(jsonResponse && { response_format: { type: 'json_object' } }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      provider: 'openai',
      model: this.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  private async completeWithAnthropic(
    messages: AIMessage[],
    temperature: number,
    maxTokens: number,
    _jsonResponse: boolean
  ): Promise<AICompletionResult> {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system: systemMessage?.content,
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      provider: 'anthropic',
      model: this.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Get the default AI client (auto-detects provider)
 */
export function getAIClient(config?: Partial<AIConfig>): AIClient {
  return new AIClient(config);
}

/**
 * Simple text completion with auto-detected provider
 */
export async function aiComplete(
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    provider?: AIProvider;
  }
): Promise<string> {
  const client = getAIClient({ provider: options?.provider });

  const messages: AIMessage[] = [];
  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const result = await client.complete({
    messages,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });

  return result.content;
}

/**
 * JSON completion with auto-detected provider
 */
export async function aiCompleteJSON<T>(
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    provider?: AIProvider;
  }
): Promise<T> {
  const client = getAIClient({ provider: options?.provider });

  const messages: AIMessage[] = [];
  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  return client.completeJSON<T>({
    messages,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });
}
