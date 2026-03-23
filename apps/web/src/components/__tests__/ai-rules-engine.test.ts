import { describe, it, expect, vi } from "vitest";
import {
  evaluateRule,
  parseNaturalLanguageRule,
  RULE_EXAMPLES,
} from "../../../supabase/functions/_shared/ai/rules-engine";
import type {
  RuleEvaluationContext,
  TriggerType,
} from "../../../supabase/functions/_shared/ai/rules-engine";
import type { AIServicesAdapter } from "../../../supabase/functions/_shared/adapters/ai-services/types";

// =============================================================================
// HELPERS
// =============================================================================

function makeRuleCtx(overrides: Partial<RuleEvaluationContext>): RuleEvaluationContext {
  return {
    trigger: { type: "transaction", event: {} },
    rule: {
      id: "rule-1",
      triggerType: "transaction",
      triggerConfig: {},
      actionType: "transfer",
      actionParams: {},
    },
    accounts: [],
    ...overrides,
  };
}

// =============================================================================
// evaluateRule — trigger type mismatch
// =============================================================================

describe("evaluateRule", () => {
  it("returns shouldExecute=false when trigger type does not match rule", () => {
    const ctx = makeRuleCtx({
      trigger: { type: "transaction", event: {} },
      rule: {
        id: "r1",
        triggerType: "schedule",
        triggerConfig: {},
        actionType: "transfer",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });
});

// =============================================================================
// evaluateRule — balance_threshold
// =============================================================================

describe("evaluateRule — balance_threshold", () => {
  it("fires when balance crosses above threshold", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "balance_threshold",
        event: { currentBalanceCents: 600000, previousBalanceCents: 400000 },
      },
      rule: {
        id: "r1",
        triggerType: "balance_threshold",
        triggerConfig: { accountType: "checking", thresholdCents: 500000, direction: "above" },
        actionType: "transfer",
        actionParams: {
          fromAccountType: "checking",
          toAccountType: "savings",
          amountStrategy: "excess_above_threshold",
          thresholdCents: 500000,
        },
      },
      accounts: [
        { id: "chk-1", type: "checking", balanceCents: 600000 },
        { id: "sav-1", type: "savings", balanceCents: 100000 },
      ],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
    expect(result.resolvedParams.resolvedAmountCents).toBe(100000); // 600000 - 500000
  });

  it("does not fire when balance has not crossed threshold", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "balance_threshold",
        event: { currentBalanceCents: 600000, previousBalanceCents: 550000 },
      },
      rule: {
        id: "r1",
        triggerType: "balance_threshold",
        triggerConfig: { accountType: "checking", thresholdCents: 500000, direction: "above" },
        actionType: "transfer",
        actionParams: {},
      },
    });
    // Both previous and current are above threshold — no crossing
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });

  it("fires when balance crosses below threshold", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "balance_threshold",
        event: { currentBalanceCents: 80000, previousBalanceCents: 120000 },
      },
      rule: {
        id: "r1",
        triggerType: "balance_threshold",
        triggerConfig: { accountType: "savings", thresholdCents: 100000, direction: "below" },
        actionType: "transfer",
        actionParams: {
          fromAccountType: "checking",
          toAccountType: "savings",
          amountStrategy: "fixed",
          amountCents: 20000,
        },
      },
      accounts: [
        { id: "chk-1", type: "checking", balanceCents: 500000 },
        { id: "sav-1", type: "savings", balanceCents: 80000 },
      ],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
    expect(result.resolvedParams.resolvedAmountCents).toBe(20000);
  });

  it("does not fire when balance data is missing", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "balance_threshold",
        event: {}, // no balance data
      },
      rule: {
        id: "r1",
        triggerType: "balance_threshold",
        triggerConfig: { accountType: "checking", thresholdCents: 500000, direction: "above" },
        actionType: "transfer",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });
});

// =============================================================================
// evaluateRule — transaction
// =============================================================================

describe("evaluateRule — transaction", () => {
  it("fires when transaction matches type and amount filters", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "transaction",
        event: {
          transactionType: "debit",
          amountCents: 75000,
          merchantName: "Amazon",
          transactionId: "tx-1",
        },
      },
      rule: {
        id: "r1",
        triggerType: "transaction",
        triggerConfig: { transactionType: "debit", minAmountCents: 50000 },
        actionType: "notification",
        actionParams: { channel: "push", template: "large_charge_alert" },
      },
      accounts: [],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
  });

  it("does not fire when transaction type does not match", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "transaction",
        event: { transactionType: "credit", amountCents: 75000 },
      },
      rule: {
        id: "r1",
        triggerType: "transaction",
        triggerConfig: { transactionType: "debit", minAmountCents: 50000 },
        actionType: "notification",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });

  it("does not fire when amount is below minimum", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "transaction",
        event: { transactionType: "debit", amountCents: 30000 },
      },
      rule: {
        id: "r1",
        triggerType: "transaction",
        triggerConfig: { transactionType: "debit", minAmountCents: 50000 },
        actionType: "notification",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });

  it("does not fire when amount exceeds maximum", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "transaction",
        event: { transactionType: "debit", amountCents: 200000 },
      },
      rule: {
        id: "r1",
        triggerType: "transaction",
        triggerConfig: { transactionType: "debit", maxAmountCents: 100000 },
        actionType: "notification",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });

  it("matches merchant filter (case-insensitive partial match)", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "transaction",
        event: { transactionType: "debit", amountCents: 5000, merchantName: "AMAZON.COM" },
      },
      rule: {
        id: "r1",
        triggerType: "transaction",
        triggerConfig: { transactionType: "debit", merchantFilter: "amazon" },
        actionType: "notification",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
  });

  it("does not fire when merchant does not match filter", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "transaction",
        event: { transactionType: "debit", amountCents: 5000, merchantName: "Walmart" },
      },
      rule: {
        id: "r1",
        triggerType: "transaction",
        triggerConfig: { transactionType: "debit", merchantFilter: "amazon" },
        actionType: "notification",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });

  it("matches category filter", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "transaction",
        event: { transactionType: "debit", amountCents: 5000, category: "dining" },
      },
      rule: {
        id: "r1",
        triggerType: "transaction",
        triggerConfig: { categoryFilter: "dining" },
        actionType: "notification",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
  });

  it("does not fire when category does not match filter", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "transaction",
        event: { transactionType: "debit", amountCents: 5000, category: "groceries" },
      },
      rule: {
        id: "r1",
        triggerType: "transaction",
        triggerConfig: { categoryFilter: "dining" },
        actionType: "notification",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });
});

// =============================================================================
// evaluateRule — schedule
// =============================================================================

describe("evaluateRule — schedule", () => {
  it("always fires when called (schedule pre-filtered by cron)", () => {
    const ctx = makeRuleCtx({
      trigger: { type: "schedule", event: {} },
      rule: {
        id: "r1",
        triggerType: "schedule",
        triggerConfig: { cron: "0 8 15 * *", timezone: "America/New_York" },
        actionType: "transfer",
        actionParams: {
          fromAccountType: "checking",
          toAccountType: "credit_card",
          amountStrategy: "full_balance",
        },
      },
      accounts: [
        { id: "chk-1", type: "checking", balanceCents: 500000 },
        { id: "cc-1", type: "credit_card", balanceCents: -25000 },
      ],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
  });
});

// =============================================================================
// evaluateRule — direct_deposit
// =============================================================================

describe("evaluateRule — direct_deposit", () => {
  it("fires when deposit meets minimum amount", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "direct_deposit",
        event: { amountCents: 350000, depositSource: "Employer Inc" },
      },
      rule: {
        id: "r1",
        triggerType: "direct_deposit",
        triggerConfig: { minAmountCents: 100000 },
        actionType: "transfer",
        actionParams: {
          fromAccountType: "checking",
          toAccountType: "savings",
          amountStrategy: "percentage_of_trigger",
          percentage: 10,
        },
      },
      accounts: [
        { id: "chk-1", type: "checking", balanceCents: 500000 },
        { id: "sav-1", type: "savings", balanceCents: 200000 },
      ],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
    expect(result.resolvedParams.resolvedAmountCents).toBe(35000); // 10% of 350000
  });

  it("does not fire when deposit is below minimum amount", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "direct_deposit",
        event: { amountCents: 50000 },
      },
      rule: {
        id: "r1",
        triggerType: "direct_deposit",
        triggerConfig: { minAmountCents: 100000 },
        actionType: "transfer",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });

  it("does not fire when amountCents is missing from event", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "direct_deposit",
        event: {},
      },
      rule: {
        id: "r1",
        triggerType: "direct_deposit",
        triggerConfig: { minAmountCents: 0 },
        actionType: "transfer",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });
});

// =============================================================================
// evaluateRule — recurring_payment
// =============================================================================

describe("evaluateRule — recurring_payment", () => {
  it("fires when payment matches filters", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "recurring_payment",
        event: { amountCents: 15000, merchantName: "Netflix", transactionId: "tx-99" },
      },
      rule: {
        id: "r1",
        triggerType: "recurring_payment",
        triggerConfig: { minAmountCents: 0 },
        actionType: "notification",
        actionParams: { channel: "push", template: "recurring_payment_processed" },
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
  });

  it("matches merchant filter (case-insensitive)", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "recurring_payment",
        event: { amountCents: 15000, merchantName: "NETFLIX SUBSCRIPTION" },
      },
      rule: {
        id: "r1",
        triggerType: "recurring_payment",
        triggerConfig: { merchantFilter: "netflix" },
        actionType: "notification",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
  });

  it("does not fire when merchant does not match filter", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "recurring_payment",
        event: { amountCents: 15000, merchantName: "Spotify" },
      },
      rule: {
        id: "r1",
        triggerType: "recurring_payment",
        triggerConfig: { merchantFilter: "netflix" },
        actionType: "notification",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });

  it("does not fire when amount is below minimum", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "recurring_payment",
        event: { amountCents: 500, merchantName: "App Store" },
      },
      rule: {
        id: "r1",
        triggerType: "recurring_payment",
        triggerConfig: { minAmountCents: 1000 },
        actionType: "notification",
        actionParams: {},
      },
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(false);
  });
});

// =============================================================================
// Amount resolution strategies
// =============================================================================

describe("amount resolution strategies", () => {
  it("fixed: resolves to the configured amountCents", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "balance_threshold",
        event: { currentBalanceCents: 80000, previousBalanceCents: 120000 },
      },
      rule: {
        id: "r1",
        triggerType: "balance_threshold",
        triggerConfig: { accountType: "savings", thresholdCents: 100000, direction: "below" },
        actionType: "transfer",
        actionParams: {
          fromAccountType: "checking",
          toAccountType: "savings",
          amountStrategy: "fixed",
          amountCents: 25000,
        },
      },
      accounts: [
        { id: "chk-1", type: "checking", balanceCents: 500000 },
        { id: "sav-1", type: "savings", balanceCents: 80000 },
      ],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
    expect(result.resolvedParams.resolvedAmountCents).toBe(25000);
  });

  it("percentage_of_trigger: resolves to percentage of trigger amount", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "direct_deposit",
        event: { amountCents: 400000 },
      },
      rule: {
        id: "r1",
        triggerType: "direct_deposit",
        triggerConfig: { minAmountCents: 0 },
        actionType: "transfer",
        actionParams: {
          fromAccountType: "checking",
          toAccountType: "savings",
          amountStrategy: "percentage_of_trigger",
          percentage: 15,
        },
      },
      accounts: [
        { id: "chk-1", type: "checking", balanceCents: 500000 },
        { id: "sav-1", type: "savings", balanceCents: 100000 },
      ],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
    expect(result.resolvedParams.resolvedAmountCents).toBe(60000); // 15% of 400000
  });

  it("round_up_difference: resolves to the round-up amount", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "transaction",
        event: { transactionType: "debit", amountCents: 350 },
      },
      rule: {
        id: "r1",
        triggerType: "transaction",
        triggerConfig: { transactionType: "debit", minAmountCents: 1 },
        actionType: "transfer",
        actionParams: {
          fromAccountType: "checking",
          toAccountType: "savings",
          amountStrategy: "round_up_difference",
          roundTo: 100,
        },
      },
      accounts: [
        { id: "chk-1", type: "checking", balanceCents: 500000 },
        { id: "sav-1", type: "savings", balanceCents: 100000 },
      ],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
    // 350 rounds up to 400, difference = 50
    expect(result.resolvedParams.resolvedAmountCents).toBe(50);
  });

  it("round_up_difference: returns full roundTo when amount is already round", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "transaction",
        event: { transactionType: "debit", amountCents: 500 },
      },
      rule: {
        id: "r1",
        triggerType: "transaction",
        triggerConfig: { transactionType: "debit", minAmountCents: 1 },
        actionType: "transfer",
        actionParams: {
          fromAccountType: "checking",
          toAccountType: "savings",
          amountStrategy: "round_up_difference",
          roundTo: 100,
        },
      },
      accounts: [{ id: "chk-1", type: "checking", balanceCents: 500000 }],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
    // 500 is already round to 100, so difference is 0, function returns roundTo (100)
    expect(result.resolvedParams.resolvedAmountCents).toBe(100);
  });

  it("excess_above_threshold: resolves to amount above threshold", () => {
    const ctx = makeRuleCtx({
      trigger: {
        type: "balance_threshold",
        event: { currentBalanceCents: 750000, previousBalanceCents: 400000 },
      },
      rule: {
        id: "r1",
        triggerType: "balance_threshold",
        triggerConfig: { accountType: "checking", thresholdCents: 500000, direction: "above" },
        actionType: "transfer",
        actionParams: {
          fromAccountType: "checking",
          toAccountType: "savings",
          amountStrategy: "excess_above_threshold",
          thresholdCents: 500000,
        },
      },
      accounts: [
        { id: "chk-1", type: "checking", balanceCents: 750000 },
        { id: "sav-1", type: "savings", balanceCents: 100000 },
      ],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
    expect(result.resolvedParams.resolvedAmountCents).toBe(250000); // 750000 - 500000
  });

  it("resolves fromAccountId and toAccountId from account types", () => {
    const ctx = makeRuleCtx({
      trigger: { type: "schedule", event: {} },
      rule: {
        id: "r1",
        triggerType: "schedule",
        triggerConfig: { cron: "0 8 1 * *" },
        actionType: "transfer",
        actionParams: {
          fromAccountType: "checking",
          toAccountType: "savings",
          amountStrategy: "fixed",
          amountCents: 10000,
        },
      },
      accounts: [
        { id: "chk-abc", type: "checking", balanceCents: 500000 },
        { id: "sav-xyz", type: "savings", balanceCents: 100000 },
      ],
    });
    const result = evaluateRule(ctx);
    expect(result.shouldExecute).toBe(true);
    expect(result.resolvedParams.fromAccountId).toBe("chk-abc");
    expect(result.resolvedParams.toAccountId).toBe("sav-xyz");
  });
});

// =============================================================================
// parseNaturalLanguageRule
// =============================================================================

describe("parseNaturalLanguageRule", () => {
  function makeMockAdapter(response: unknown): AIServicesAdapter {
    return {
      name: "mock",
      healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
      complete: vi.fn().mockResolvedValue({ content: JSON.stringify(response) }),
      completeJSON: vi.fn().mockResolvedValue(response),
      embed: vi.fn().mockResolvedValue({ embeddings: [] }),
      listModels: vi.fn().mockResolvedValue([]),
      getObservabilityConfig: vi.fn().mockReturnValue({ provider: "none", logPrompts: false }),
    } as unknown as AIServicesAdapter;
  }

  it("throws on empty input", async () => {
    const adapter = makeMockAdapter({});
    await expect(parseNaturalLanguageRule("", adapter)).rejects.toThrow(
      "Rule input cannot be empty",
    );
    await expect(parseNaturalLanguageRule("   ", adapter)).rejects.toThrow(
      "Rule input cannot be empty",
    );
  });

  it("throws on input exceeding max length", async () => {
    const adapter = makeMockAdapter({});
    const longInput = "a".repeat(2001);
    await expect(parseNaturalLanguageRule(longInput, adapter)).rejects.toThrow(
      "exceeds maximum length",
    );
  });

  it("calls the adapter and returns the parsed rule", async () => {
    const mockParsed = {
      name: "Test Rule",
      triggerType: "transaction",
      triggerConfig: { transactionType: "debit", minAmountCents: 100 },
      actionType: "notification",
      actionParams: { channel: "push" },
    };
    const adapter = makeMockAdapter(mockParsed);

    const result = await parseNaturalLanguageRule("Alert me on every purchase", adapter);
    expect(result.name).toBe("Test Rule");
    expect(result.triggerType).toBe("transaction");
    expect(adapter.completeJSON).toHaveBeenCalledTimes(1);
  });

  it("throws when parsed rule has invalid trigger type", async () => {
    const mockParsed = {
      name: "Bad Rule",
      triggerType: "invalid_trigger",
      triggerConfig: {},
      actionType: "notification",
      actionParams: {},
    };
    const adapter = makeMockAdapter(mockParsed);
    await expect(parseNaturalLanguageRule("Do something weird", adapter)).rejects.toThrow(
      "Invalid triggerType",
    );
  });

  it("throws when parsed rule has invalid action type", async () => {
    const mockParsed = {
      name: "Bad Action Rule",
      triggerType: "transaction",
      triggerConfig: { transactionType: "debit" },
      actionType: "explode",
      actionParams: {},
    };
    const adapter = makeMockAdapter(mockParsed);
    await expect(parseNaturalLanguageRule("Do something", adapter)).rejects.toThrow(
      "Invalid actionType",
    );
  });

  it("throws when parsed rule is missing name", async () => {
    const mockParsed = {
      name: "",
      triggerType: "transaction",
      triggerConfig: {},
      actionType: "notification",
      actionParams: {},
    };
    const adapter = makeMockAdapter(mockParsed);
    await expect(parseNaturalLanguageRule("Do something", adapter)).rejects.toThrow(
      "missing required field: name",
    );
  });

  it("throws when balance_threshold rule has invalid config", async () => {
    const mockParsed = {
      name: "Threshold Rule",
      triggerType: "balance_threshold",
      triggerConfig: { thresholdCents: -100, direction: "above" },
      actionType: "transfer",
      actionParams: { fromAccountType: "checking" },
    };
    const adapter = makeMockAdapter(mockParsed);
    await expect(parseNaturalLanguageRule("When balance drops", adapter)).rejects.toThrow(
      "non-negative thresholdCents",
    );
  });

  it("throws when schedule rule is missing cron expression", async () => {
    const mockParsed = {
      name: "Schedule Rule",
      triggerType: "schedule",
      triggerConfig: { timezone: "America/New_York" },
      actionType: "transfer",
      actionParams: { fromAccountType: "checking" },
    };
    const adapter = makeMockAdapter(mockParsed);
    await expect(parseNaturalLanguageRule("Every month", adapter)).rejects.toThrow(
      "cron expression",
    );
  });
});

// =============================================================================
// RULE_EXAMPLES
// =============================================================================

describe("RULE_EXAMPLES", () => {
  it("has at least 5 examples", () => {
    expect(RULE_EXAMPLES.length).toBeGreaterThanOrEqual(5);
  });

  it("each example has valid trigger and action types", () => {
    const validTriggers: TriggerType[] = [
      "transaction",
      "balance_threshold",
      "schedule",
      "direct_deposit",
      "recurring_payment",
    ];
    const validActions = ["transfer", "notification", "card_control", "categorize", "tag"];

    for (const example of RULE_EXAMPLES) {
      expect(typeof example.input).toBe("string");
      expect(example.input.length).toBeGreaterThan(0);
      expect(validTriggers).toContain(example.parsed.triggerType);
      expect(validActions).toContain(example.parsed.actionType);
      expect(typeof example.parsed.name).toBe("string");
    }
  });
});
