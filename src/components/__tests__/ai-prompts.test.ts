import { describe, it, expect } from 'vitest';
import {
  resolvePrompt,
  buildMessages,
  DEFAULT_PROMPTS,
} from '../../../supabase/functions/_shared/ai/prompts';
import type { AIStakeholder } from '../../../supabase/functions/_shared/ai/prompts';

// =============================================================================
// DEFAULT_PROMPTS
// =============================================================================

describe('DEFAULT_PROMPTS', () => {
  const stakeholders: AIStakeholder[] = ['member', 'staff', 'marketing', 'audit'];

  it('has entries for all 4 stakeholders', () => {
    expect(Object.keys(DEFAULT_PROMPTS)).toHaveLength(4);
    for (const s of stakeholders) {
      expect(DEFAULT_PROMPTS[s]).toBeDefined();
    }
  });

  it.each(stakeholders)('"%s" has all required fields', (stakeholder) => {
    const config = DEFAULT_PROMPTS[stakeholder];
    expect(config.stakeholder).toBe(stakeholder);
    expect(typeof config.name).toBe('string');
    expect(config.name.length).toBeGreaterThan(0);
    expect(typeof config.description).toBe('string');
    expect(config.description.length).toBeGreaterThan(0);
    expect(typeof config.content).toBe('string');
    expect(config.content.length).toBeGreaterThan(0);
    expect(typeof config.temperature).toBe('number');
    expect(config.temperature).toBeGreaterThanOrEqual(0);
    expect(config.temperature).toBeLessThanOrEqual(2);
    expect(typeof config.maxTokens).toBe('number');
    expect(config.maxTokens).toBeGreaterThan(0);
  });

  it.each(stakeholders)('"%s" content includes safety rules', (stakeholder) => {
    const config = DEFAULT_PROMPTS[stakeholder];
    expect(config.content).toContain('SECURITY RULES');
    expect(config.content).toContain('NEVER reveal');
  });

  it.each(stakeholders)('"%s" content includes {{tenant_name}} placeholder', (stakeholder) => {
    const config = DEFAULT_PROMPTS[stakeholder];
    expect(config.content).toContain('{{tenant_name}}');
  });
});

// =============================================================================
// resolvePrompt
// =============================================================================

describe('resolvePrompt', () => {
  it('returns correct content for the "member" stakeholder', () => {
    const result = resolvePrompt('member', 'Acme CU');
    expect(result.content).toContain('Acme CU');
    expect(result.content).toContain('helpful, friendly digital banking assistant');
    expect(result.temperature).toBe(DEFAULT_PROMPTS.member.temperature);
    expect(result.maxTokens).toBe(DEFAULT_PROMPTS.member.maxTokens);
  });

  it('returns correct content for the "staff" stakeholder', () => {
    const result = resolvePrompt('staff', 'River Bank');
    expect(result.content).toContain('River Bank');
    expect(result.content).toContain('AI operations assistant');
    expect(result.temperature).toBe(DEFAULT_PROMPTS.staff.temperature);
    expect(result.maxTokens).toBe(DEFAULT_PROMPTS.staff.maxTokens);
  });

  it('returns correct content for the "marketing" stakeholder', () => {
    const result = resolvePrompt('marketing', 'Valley FCU');
    expect(result.content).toContain('Valley FCU');
    expect(result.content).toContain('marketing content assistant');
    expect(result.temperature).toBe(DEFAULT_PROMPTS.marketing.temperature);
  });

  it('returns correct content for the "audit" stakeholder', () => {
    const result = resolvePrompt('audit', 'Metro CU');
    expect(result.content).toContain('Metro CU');
    expect(result.content).toContain('compliance and audit assistant');
    expect(result.temperature).toBe(DEFAULT_PROMPTS.audit.temperature);
    expect(result.maxTokens).toBe(DEFAULT_PROMPTS.audit.maxTokens);
  });

  it('replaces all occurrences of {{tenant_name}}', () => {
    const result = resolvePrompt('marketing', 'TestBank');
    // marketing prompt uses {{tenant_name}} multiple times
    expect(result.content).not.toContain('{{tenant_name}}');
    // should contain the tenant name at least once
    expect(result.content).toContain('TestBank');
  });

  it('uses custom content when provided', () => {
    const custom = 'You are a custom bot for {{tenant_name}}. Be nice.';
    const result = resolvePrompt('member', 'CustomCU', custom);
    expect(result.content).toBe('You are a custom bot for CustomCU. Be nice.');
    // Should still use the default temperature/maxTokens for the stakeholder
    expect(result.temperature).toBe(DEFAULT_PROMPTS.member.temperature);
    expect(result.maxTokens).toBe(DEFAULT_PROMPTS.member.maxTokens);
  });

  it('replaces {{tenant_name}} in custom content', () => {
    const custom = 'Hello from {{tenant_name}}! Welcome to {{tenant_name}}.';
    const result = resolvePrompt('staff', 'DualCU', custom);
    expect(result.content).toBe('Hello from DualCU! Welcome to DualCU.');
  });
});

// =============================================================================
// buildMessages
// =============================================================================

describe('buildMessages', () => {
  it('returns system message as first element', () => {
    const messages = buildMessages({
      systemPrompt: 'You are a helper.',
      currentMessage: 'Hi there',
    });
    expect(messages[0]).toEqual({ role: 'system', content: 'You are a helper.' });
  });

  it('places the current user message last', () => {
    const messages = buildMessages({
      systemPrompt: 'System',
      currentMessage: 'What is my balance?',
    });
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg).toEqual({ role: 'user', content: 'What is my balance?' });
  });

  it('returns correct length with no optional fields', () => {
    const messages = buildMessages({
      systemPrompt: 'System',
      currentMessage: 'Hello',
    });
    // system + current user message
    expect(messages).toHaveLength(2);
  });

  it('includes RAG context in the system message', () => {
    const messages = buildMessages({
      systemPrompt: 'System prompt text.',
      ragContext: 'Checking accounts have no monthly fee.',
      currentMessage: 'Tell me about fees',
    });
    const systemContent = messages[0].content;
    expect(systemContent).toContain('RELEVANT KNOWLEDGE BASE CONTEXT');
    expect(systemContent).toContain('Checking accounts have no monthly fee.');
    expect(systemContent).toContain('Cite sources when available');
    expect(systemContent).toContain('do not make up information');
  });

  it('includes member context in the system message', () => {
    const messages = buildMessages({
      systemPrompt: 'System prompt.',
      memberContext: 'Name: Jane, Balance: $5,000',
      currentMessage: 'What is my balance?',
    });
    const systemContent = messages[0].content;
    expect(systemContent).toContain('CURRENT MEMBER CONTEXT');
    expect(systemContent).toContain('Name: Jane, Balance: $5,000');
    expect(systemContent).toContain('do not reveal raw data');
  });

  it('includes both RAG and member context', () => {
    const messages = buildMessages({
      systemPrompt: 'Base prompt.',
      ragContext: 'FAQ: you can deposit checks via mobile.',
      memberContext: 'Has 2 accounts, member for 3 years.',
      currentMessage: 'Can I deposit a check?',
    });
    const systemContent = messages[0].content;
    expect(systemContent).toContain('RELEVANT KNOWLEDGE BASE CONTEXT');
    expect(systemContent).toContain('CURRENT MEMBER CONTEXT');
  });

  it('includes conversation history in correct order', () => {
    const history = [
      { role: 'user' as const, content: 'Hi' },
      { role: 'assistant' as const, content: 'Hello! How can I help?' },
      { role: 'user' as const, content: 'I need to check my balance' },
      { role: 'assistant' as const, content: 'Your checking balance is $1,500.' },
    ];

    const messages = buildMessages({
      systemPrompt: 'System',
      conversationHistory: history,
      currentMessage: 'What about savings?',
    });

    // 1 system + 4 history + 1 current = 6
    expect(messages).toHaveLength(6);
    expect(messages[0].role).toBe('system');
    expect(messages[1]).toEqual({ role: 'user', content: 'Hi' });
    expect(messages[2]).toEqual({ role: 'assistant', content: 'Hello! How can I help?' });
    expect(messages[3]).toEqual({ role: 'user', content: 'I need to check my balance' });
    expect(messages[4]).toEqual({ role: 'assistant', content: 'Your checking balance is $1,500.' });
    expect(messages[5]).toEqual({ role: 'user', content: 'What about savings?' });
  });

  it('handles empty conversation history', () => {
    const messages = buildMessages({
      systemPrompt: 'System',
      conversationHistory: [],
      currentMessage: 'Hello',
    });
    expect(messages).toHaveLength(2);
  });

  it('does not modify system message when ragContext and memberContext are absent', () => {
    const prompt = 'You are a banking assistant.';
    const messages = buildMessages({
      systemPrompt: prompt,
      currentMessage: 'Hello',
    });
    expect(messages[0].content).toBe(prompt);
  });
});
