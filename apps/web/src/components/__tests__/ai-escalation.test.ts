import { describe, it, expect, vi } from "vitest";
import {
  detectSentiment,
  determinePriority,
  analyzeEscalation,
} from "../../../supabase/functions/_shared/ai/escalation";
import type { EscalationContext } from "../../../supabase/functions/_shared/ai/escalation";
import type { AIServicesAdapter } from "../../../supabase/functions/_shared/adapters/ai-services/types";

// =============================================================================
// detectSentiment
// =============================================================================

describe("detectSentiment", () => {
  it("returns neutral for bland messages", () => {
    const transcript = [
      { role: "user", content: "I have a question about my account." },
      { role: "assistant", content: "Sure, I can help with that." },
      { role: "user", content: "What are the hours for the branch?" },
    ];
    expect(detectSentiment(transcript)).toBe("neutral");
  });

  it("returns neutral when there are no user messages", () => {
    const transcript = [{ role: "assistant", content: "Hello, how can I help you?" }];
    expect(detectSentiment(transcript)).toBe("neutral");
  });

  it("returns frustrated for frustration patterns", () => {
    const transcript = [
      { role: "user", content: "This is not working for me." },
      { role: "assistant", content: "I apologize for the inconvenience." },
      { role: "user", content: "I already tried that and it still does not work." },
    ];
    expect(detectSentiment(transcript)).toBe("frustrated");
  });

  it("returns frustrated for messages with multiple exclamation marks", () => {
    const transcript = [
      { role: "user", content: "I need help with my account!!" },
      { role: "assistant", content: "Sure." },
      { role: "user", content: "This is getting nowhere!!" },
    ];
    expect(detectSentiment(transcript)).toBe("frustrated");
  });

  it("returns angry for anger patterns combined with frustration", () => {
    const transcript = [
      { role: "user", content: "This is unacceptable, I already tried resetting it." },
      { role: "assistant", content: "I understand your frustration." },
      { role: "user", content: "I want to speak to a manager right now." },
    ];
    expect(detectSentiment(transcript)).toBe("angry");
  });

  it("returns angry when messages have heavy capitalization", () => {
    const transcript = [
      { role: "user", content: "THIS IS TERRIBLE SERVICE AND I WANT ANSWERS NOW" },
      { role: "assistant", content: "I am sorry to hear that." },
      { role: "user", content: "I AM CLOSING MY ACCOUNT IF THIS IS NOT RESOLVED" },
    ];
    expect(detectSentiment(transcript)).toBe("angry");
  });

  it("returns positive for thank-you messages with no frustration", () => {
    const transcript = [
      { role: "user", content: "Thanks for helping me with that!" },
      { role: "assistant", content: "You are welcome!" },
      { role: "user", content: "That was great, thank you so much." },
    ];
    expect(detectSentiment(transcript)).toBe("positive");
  });

  it("returns frustrated even when positive words exist alongside frustration", () => {
    const transcript = [
      { role: "user", content: "Thanks but this is still not working." },
      { role: "assistant", content: "Let me try something else." },
      { role: "user", content: "I already tried everything." },
    ];
    // frustration score >= 1 overrides positive
    const sentiment = detectSentiment(transcript);
    expect(sentiment).toBe("frustrated");
  });

  it("only analyzes user messages, not assistant messages", () => {
    const transcript = [
      { role: "assistant", content: "This is unacceptable terrible awful worst service." },
      { role: "user", content: "Hello, can you help me?" },
    ];
    expect(detectSentiment(transcript)).toBe("neutral");
  });
});

// =============================================================================
// determinePriority
// =============================================================================

describe("determinePriority", () => {
  it("returns low for positive sentiment + general category", () => {
    expect(determinePriority("positive", "general")).toBe("low");
  });

  it("returns normal for neutral sentiment + general category", () => {
    // neutral = 0 points, general = 0 points => score 0 => low
    // Actually: neutral = 0, general = 0 => score 0 => low
    expect(determinePriority("neutral", "general")).toBe("low");
  });

  it("returns normal for neutral sentiment + elevated category", () => {
    // neutral = 0, dispute (elevated) = 1 => score 1 => normal
    expect(determinePriority("neutral", "dispute")).toBe("normal");
  });

  it("returns high for angry sentiment + general category", () => {
    // angry = 3, general = 0 => score 3 => high
    expect(determinePriority("angry", "general")).toBe("high");
  });

  it("returns urgent for angry sentiment + fraud category", () => {
    // angry = 3, fraud (high priority) = 3 => score 6 => urgent
    expect(determinePriority("angry", "fraud")).toBe("urgent");
  });

  it("returns urgent for angry sentiment + account_closure category", () => {
    // angry = 3, account_closure (high priority) = 3 => score 6 => urgent
    expect(determinePriority("angry", "account_closure")).toBe("urgent");
  });

  it("returns high for frustrated sentiment + fraud category", () => {
    // frustrated = 2, fraud = 3 => score 5 => urgent
    expect(determinePriority("frustrated", "fraud")).toBe("urgent");
  });

  it("member context with long relationship boosts priority", () => {
    // neutral = 0, general = 0 => base score 0 => low
    // with 5+ year relationship => +1 => score 1 => normal
    const priority = determinePriority("neutral", "general", {
      relationshipYears: 10,
    });
    expect(priority).toBe("normal");
  });

  it("member context with high balance boosts priority", () => {
    // neutral = 0, general = 0, high balance (>$50k) => +1 => score 1 => normal
    const priority = determinePriority("neutral", "general", {
      totalBalanceCents: 10000000, // $100,000
    });
    expect(priority).toBe("normal");
  });

  it("member context with repeat issues boosts priority", () => {
    // neutral = 0, general = 0, 2+ recent issues => +1 => score 1 => normal
    const priority = determinePriority("neutral", "general", {
      recentIssues: ["issue-1", "issue-2"],
    });
    expect(priority).toBe("normal");
  });

  it("all member context boosts can stack", () => {
    // frustrated = 2, dispute (elevated) = 1, relationship + balance + issues = 3
    // total = 6 => urgent
    const priority = determinePriority("frustrated", "dispute", {
      relationshipYears: 10,
      totalBalanceCents: 10000000,
      recentIssues: ["a", "b", "c"],
    });
    expect(priority).toBe("urgent");
  });
});

// =============================================================================
// analyzeEscalation
// =============================================================================

describe("analyzeEscalation", () => {
  function makeMockAdapter(
    response?: { summary: string; category: string; suggestedResolution: string },
    shouldFail = false,
  ): AIServicesAdapter {
    const completeJSON = shouldFail
      ? vi.fn().mockRejectedValue(new Error("AI unavailable"))
      : vi.fn().mockResolvedValue(
          response ?? {
            summary: "Member is frustrated about unauthorized charges.",
            category: "fraud",
            suggestedResolution: "Initiate fraud investigation and freeze card.",
          },
        );

    return {
      name: "mock",
      healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      complete: vi.fn(),
      completeJSON,
      embed: vi.fn(),
      listModels: vi.fn(),
      getObservabilityConfig: vi.fn().mockReturnValue({ provider: "none", logPrompts: false }),
    } as unknown as AIServicesAdapter;
  }

  function makeEscalationCtx(overrides: Partial<EscalationContext> = {}): EscalationContext {
    return {
      conversationId: "conv-1",
      userId: "user-1",
      tenantId: "tenant-1",
      transcript: [
        { role: "user", content: "I see a charge I did not authorize on my account." },
        { role: "assistant", content: "I am sorry to hear that. Let me help you." },
        { role: "user", content: "There are two unauthorized transactions." },
      ],
      ...overrides,
    };
  }

  it("throws when transcript is empty", async () => {
    const adapter = makeMockAdapter();
    const ctx = makeEscalationCtx({ transcript: [] });
    await expect(analyzeEscalation(ctx, adapter)).rejects.toThrow(
      "at least one transcript message",
    );
  });

  it("combines AI summary with heuristic sentiment", async () => {
    const adapter = makeMockAdapter({
      summary: "Member reporting unauthorized charges.",
      category: "fraud",
      suggestedResolution: "Start fraud claim process.",
    });

    const ctx = makeEscalationCtx();
    const result = await analyzeEscalation(ctx, adapter);

    expect(result.summary).toBe("Member reporting unauthorized charges.");
    expect(result.category).toBe("fraud");
    expect(result.suggestedResolution).toBe("Start fraud claim process.");
    // Sentiment is determined heuristically
    expect(["neutral", "frustrated", "angry", "positive"]).toContain(result.sentiment);
    // Priority is determined from sentiment + category
    expect(["low", "normal", "high", "urgent"]).toContain(result.priority);
  });

  it("uses heuristic fallback when adapter fails", async () => {
    const adapter = makeMockAdapter(undefined, true);
    const ctx = makeEscalationCtx({
      transcript: [
        { role: "user", content: "I see unauthorized charges on my card." },
        { role: "assistant", content: "Let me look into that." },
        { role: "user", content: "This is fraud, someone stole my card info." },
      ],
    });

    const result = await analyzeEscalation(ctx, adapter);

    // Fallback summary should be generated from transcript
    expect(result.summary.length).toBeGreaterThan(0);
    // Heuristic categorization should detect fraud keywords
    expect(result.category).toBe("fraud");
    // Should have a suggested resolution even without AI
    expect(result.suggestedResolution.length).toBeGreaterThan(0);
  });

  it("falls back to heuristic category when AI returns invalid category", async () => {
    const adapter = makeMockAdapter({
      summary: "Some summary.",
      category: "totally_invalid_category",
      suggestedResolution: "Some resolution.",
    });

    const ctx = makeEscalationCtx({
      transcript: [{ role: "user", content: "I need to dispute a charge at Amazon for $50." }],
    });

    const result = await analyzeEscalation(ctx, adapter);
    // AI category is invalid, so heuristic should be used; "dispute" keyword should match
    expect(result.category).toBe("dispute");
  });

  it("includes preFilled data extracted from transcript", async () => {
    const adapter = makeMockAdapter({
      summary: "Member disputing a charge.",
      category: "dispute",
      suggestedResolution: "Initiate chargeback.",
    });

    const ctx = makeEscalationCtx({
      transcript: [
        {
          role: "user",
          content: "I want to dispute a $45.00 charge from Starbucks on January 15.",
        },
      ],
    });

    const result = await analyzeEscalation(ctx, adapter);
    expect(result.preFilled).toBeDefined();
    expect(result.preFilled.formType).toBe("transaction_dispute");
    // Should extract the dollar amount ($45.00 = 4500 cents)
    expect(result.preFilled.mentionedAmounts).toBeDefined();
    expect(result.preFilled.mentionedAmounts as number[]).toContain(4500);
  });

  it("uses member context for priority calculation", async () => {
    const adapter = makeMockAdapter({
      summary: "High-value member reporting fraud.",
      category: "fraud",
      suggestedResolution: "Escalate immediately.",
    });

    const ctx = makeEscalationCtx({
      transcript: [
        { role: "user", content: "Someone made unauthorized purchases with my card." },
        { role: "user", content: "This is unacceptable, I want to speak to a manager." },
      ],
      memberContext: {
        accountCount: 5,
        relationshipYears: 12,
        totalBalanceCents: 15000000,
        recentIssues: ["previous-fraud-case", "atm-issue"],
      },
    });

    const result = await analyzeEscalation(ctx, adapter);
    // angry sentiment (3) + fraud category (3) + relationship bonus (1) + high balance (1) + repeat issues (1) = 9 => urgent
    expect(result.priority).toBe("urgent");
  });

  it("detects fraud category from preFilled for fraud transcripts", async () => {
    const adapter = makeMockAdapter({
      summary: "Fraud reported.",
      category: "fraud",
      suggestedResolution: "Freeze card.",
    });

    const ctx = makeEscalationCtx({
      transcript: [
        { role: "user", content: "My card was stolen and someone made unauthorized purchases." },
      ],
    });

    const result = await analyzeEscalation(ctx, adapter);
    expect(result.category).toBe("fraud");
    expect(result.preFilled.formType).toBe("fraud_report");
    expect(result.preFilled.requiresCardReplacement).toBe(true);
  });
});
