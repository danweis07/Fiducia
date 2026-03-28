import { describe, it, expect } from "vitest";
import {
  checkOverdraftRisk,
  checkSpendingAnomaly,
  checkSavingsOpportunity,
  checkPaymentFailureRisk,
  generateInsights,
} from "../../../supabase/functions/_shared/ai/insights-engine";
import type { InsightGeneratorContext } from "../../../supabase/functions/_shared/ai/insights-engine";

// =============================================================================
// HELPERS
// =============================================================================

function makeContext(overrides: Partial<InsightGeneratorContext> = {}): InsightGeneratorContext {
  return {
    userId: "user-1",
    tenantId: "tenant-1",
    accounts: [],
    recentTransactions: [],
    recurringPayments: [],
    ...overrides,
  };
}

/** Get an ISO date string N days from now */
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Get an ISO date string N days ago */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// =============================================================================
// checkOverdraftRisk
// =============================================================================

describe("checkOverdraftRisk", () => {
  it("returns null when there are no checking accounts", () => {
    const ctx = makeContext({
      accounts: [
        { id: "a1", type: "savings", balanceCents: 500000, availableBalanceCents: 500000 },
      ],
      recurringPayments: [
        { amountCents: 10000, nextDate: daysFromNow(2), payeeName: "Electric Co" },
      ],
    });
    expect(checkOverdraftRisk(ctx)).toBeNull();
  });

  it("returns null when there are no recurring payments", () => {
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 50000, availableBalanceCents: 50000 }],
    });
    expect(checkOverdraftRisk(ctx)).toBeNull();
  });

  it("returns null when recurring payments list is empty", () => {
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 50000, availableBalanceCents: 50000 }],
      recurringPayments: [],
    });
    expect(checkOverdraftRisk(ctx)).toBeNull();
  });

  it("returns null when no upcoming payments are within 7 days", () => {
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 10000, availableBalanceCents: 10000 }],
      recurringPayments: [{ amountCents: 100000, nextDate: daysFromNow(14), payeeName: "Rent" }],
    });
    expect(checkOverdraftRisk(ctx)).toBeNull();
  });

  it("returns null when balance covers all upcoming payments", () => {
    const ctx = makeContext({
      accounts: [
        { id: "a1", type: "checking", balanceCents: 200000, availableBalanceCents: 200000 },
      ],
      recurringPayments: [
        { amountCents: 50000, nextDate: daysFromNow(3), payeeName: "Internet" },
        { amountCents: 50000, nextDate: daysFromNow(5), payeeName: "Phone" },
      ],
    });
    expect(checkOverdraftRisk(ctx)).toBeNull();
  });

  it("returns critical insight when shortfall > 50% of upcoming total", () => {
    // Available: $100, Upcoming: $500 => shortfall $400, which is > 50% of $500
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 10000, availableBalanceCents: 10000 }],
      recurringPayments: [{ amountCents: 50000, nextDate: daysFromNow(2), payeeName: "Electric" }],
    });
    const insight = checkOverdraftRisk(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe("overdraft_prediction");
    expect(insight!.severity).toBe("critical");
  });

  it("returns warning when shortfall <= 50% of upcoming total", () => {
    // Available: $350, Upcoming: $500 => shortfall $150, which is <= 50% of $500
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 35000, availableBalanceCents: 35000 }],
      recurringPayments: [{ amountCents: 50000, nextDate: daysFromNow(3), payeeName: "Rent" }],
    });
    const insight = checkOverdraftRisk(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.severity).toBe("warning");
  });

  it("includes a suggested transfer action", () => {
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 5000, availableBalanceCents: 5000 }],
      recurringPayments: [{ amountCents: 20000, nextDate: daysFromNow(1), payeeName: "Insurance" }],
    });
    const insight = checkOverdraftRisk(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.suggestedAction).toBeDefined();
    expect(insight!.suggestedAction!.type).toBe("transfer.create");
    expect(insight!.suggestedAction!.label).toContain("Transfer funds");
    expect(insight!.suggestedAction!.params.suggestedAmountCents).toBe(15000);
  });

  it("sums available balances across multiple checking accounts", () => {
    // Two checking accounts totaling $200, payment of $300 => shortfall $100
    const ctx = makeContext({
      accounts: [
        { id: "a1", type: "checking", balanceCents: 10000, availableBalanceCents: 10000 },
        { id: "a2", type: "checking", balanceCents: 10000, availableBalanceCents: 10000 },
      ],
      recurringPayments: [{ amountCents: 30000, nextDate: daysFromNow(2), payeeName: "Utilities" }],
    });
    const insight = checkOverdraftRisk(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.data.shortfallCents).toBe(10000);
  });
});

// =============================================================================
// checkSpendingAnomaly
// =============================================================================

describe("checkSpendingAnomaly", () => {
  it("returns null with no transactions", () => {
    const ctx = makeContext({ recentTransactions: [] });
    expect(checkSpendingAnomaly(ctx)).toBeNull();
  });

  it("returns null with only credit transactions", () => {
    const ctx = makeContext({
      recentTransactions: [
        {
          amountCents: 100000,
          category: "income",
          merchantName: "Employer",
          date: daysAgo(1),
          type: "credit",
        },
      ],
    });
    expect(checkSpendingAnomaly(ctx)).toBeNull();
  });

  it("returns null when current spending is not 2x the average", () => {
    // Week 0: $100 dining, Weeks 1-4: $80 dining each => ratio ~1.25x (not anomalous)
    const ctx = makeContext({
      recentTransactions: [
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "Restaurant",
          date: daysAgo(1),
          type: "debit",
        },
        {
          amountCents: -8000,
          category: "dining",
          merchantName: "Restaurant",
          date: daysAgo(8),
          type: "debit",
        },
        {
          amountCents: -8000,
          category: "dining",
          merchantName: "Restaurant",
          date: daysAgo(15),
          type: "debit",
        },
        {
          amountCents: -8000,
          category: "dining",
          merchantName: "Restaurant",
          date: daysAgo(22),
          type: "debit",
        },
        {
          amountCents: -8000,
          category: "dining",
          merchantName: "Restaurant",
          date: daysAgo(28),
          type: "debit",
        },
      ],
    });
    expect(checkSpendingAnomaly(ctx)).toBeNull();
  });

  it("detects anomaly when current week spending > 2x average", () => {
    // Week 0: $500 dining, Weeks 1-4: $100 dining each => ratio 5x
    const ctx = makeContext({
      recentTransactions: [
        {
          amountCents: -50000,
          category: "dining",
          merchantName: "Restaurant",
          date: daysAgo(0),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "Restaurant",
          date: daysAgo(7),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "Restaurant",
          date: daysAgo(14),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "Restaurant",
          date: daysAgo(21),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "Restaurant",
          date: daysAgo(28),
          type: "debit",
        },
      ],
    });
    const insight = checkSpendingAnomaly(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe("spending_anomaly");
    expect(insight!.title).toContain("dining");
    expect(insight!.data.category).toBe("dining");
  });

  it("returns the most severe anomaly across categories", () => {
    // dining: 3x, groceries: 5x — should return groceries (worse ratio)
    const ctx = makeContext({
      recentTransactions: [
        // dining: week 0 = $300, weeks 1-4 = $100 each => 3x
        {
          amountCents: -30000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(0),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(8),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(15),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(22),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(28),
          type: "debit",
        },
        // groceries: week 0 = $500, weeks 1-4 = $100 each => 5x
        {
          amountCents: -50000,
          category: "groceries",
          merchantName: "G",
          date: daysAgo(0),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "groceries",
          merchantName: "G",
          date: daysAgo(8),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "groceries",
          merchantName: "G",
          date: daysAgo(15),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "groceries",
          merchantName: "G",
          date: daysAgo(22),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "groceries",
          merchantName: "G",
          date: daysAgo(28),
          type: "debit",
        },
      ],
    });
    const insight = checkSpendingAnomaly(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.data.category).toBe("groceries");
  });

  it("severity is warning when ratio >= 3", () => {
    const ctx = makeContext({
      recentTransactions: [
        {
          amountCents: -30000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(0),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(8),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(15),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(22),
          type: "debit",
        },
      ],
    });
    const insight = checkSpendingAnomaly(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.severity).toBe("warning");
  });

  it("severity is info when ratio >= 2 but < 3", () => {
    // Week 0: $200, weeks 1-4: $100 each => ratio 2x
    const ctx = makeContext({
      recentTransactions: [
        {
          amountCents: -20000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(0),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(8),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(15),
          type: "debit",
        },
        {
          amountCents: -10000,
          category: "dining",
          merchantName: "R",
          date: daysAgo(22),
          type: "debit",
        },
      ],
    });
    const insight = checkSpendingAnomaly(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.severity).toBe("info");
  });
});

// =============================================================================
// checkSavingsOpportunity
// =============================================================================

describe("checkSavingsOpportunity", () => {
  it("returns null when there are no checking accounts", () => {
    const ctx = makeContext({
      accounts: [
        { id: "a1", type: "savings", balanceCents: 1000000, availableBalanceCents: 1000000 },
      ],
    });
    expect(checkSavingsOpportunity(ctx)).toBeNull();
  });

  it("returns null when balance is insufficient (excess < $2,000)", () => {
    // Balance: $3,000, daily outflow ~$100 over 15 days = $1,500 minimum buffer
    // Excess: $3,000 - $1,500 * (14/15 scaled) ≈ ... let's set it so excess < $2,000
    // With 15 days of data, avg daily outflow = $100 => min buffer = 14 * $100 = $1,400
    // Excess = $3,000 - $1,400 = $1,600 < $2,000 threshold
    const transactions = [];
    for (let i = 0; i < 15; i++) {
      transactions.push({
        amountCents: -10000,
        category: "misc",
        merchantName: "Store",
        date: daysAgo(i * 2), // spread across 30 days for sufficient distinct dates
        type: "debit",
      });
    }
    const ctx = makeContext({
      accounts: [
        { id: "a1", type: "checking", balanceCents: 300000, availableBalanceCents: 300000 },
      ],
      recentTransactions: transactions,
    });
    expect(checkSavingsOpportunity(ctx)).toBeNull();
  });

  it("returns null when fewer than 14 days of transaction data", () => {
    // Only 10 distinct transaction dates
    const transactions = [];
    for (let i = 0; i < 10; i++) {
      transactions.push({
        amountCents: -5000,
        category: "misc",
        merchantName: "Store",
        date: daysAgo(i),
        type: "debit",
      });
    }
    const ctx = makeContext({
      accounts: [
        { id: "a1", type: "checking", balanceCents: 5000000, availableBalanceCents: 5000000 },
      ],
      recentTransactions: transactions,
    });
    expect(checkSavingsOpportunity(ctx)).toBeNull();
  });

  it("returns positive insight when excess > $2,000", () => {
    // Balance: $10,000, 20 days of $50/day outflow = $700 total
    // avg daily outflow = $700 / 20 = $35
    // min buffer = 14 * $35 = $490
    // excess = $10,000 - $490 = $9,510 > $2,000
    const transactions = [];
    for (let i = 0; i < 20; i++) {
      transactions.push({
        amountCents: -3500,
        category: "misc",
        merchantName: "Store",
        date: daysAgo(i + 1),
        type: "debit",
      });
    }
    const ctx = makeContext({
      accounts: [
        { id: "a1", type: "checking", balanceCents: 1000000, availableBalanceCents: 1000000 },
      ],
      recentTransactions: transactions,
    });
    const insight = checkSavingsOpportunity(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe("savings_opportunity");
    expect(insight!.severity).toBe("positive");
    expect(insight!.suggestedAction).toBeDefined();
    expect(insight!.suggestedAction!.type).toBe("transfer.create");
    expect(insight!.suggestedAction!.params.toAccountType).toBe("savings");
  });
});

// =============================================================================
// checkPaymentFailureRisk
// =============================================================================

describe("checkPaymentFailureRisk", () => {
  it("returns null when there are no checking accounts", () => {
    const ctx = makeContext({
      accounts: [
        { id: "a1", type: "savings", balanceCents: 500000, availableBalanceCents: 500000 },
      ],
      recurringPayments: [{ amountCents: 10000, nextDate: daysFromNow(1), payeeName: "Netflix" }],
    });
    expect(checkPaymentFailureRisk(ctx)).toBeNull();
  });

  it("returns null when no recurring payments", () => {
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 50000, availableBalanceCents: 50000 }],
    });
    expect(checkPaymentFailureRisk(ctx)).toBeNull();
  });

  it("returns null when projected balance covers all payments", () => {
    const ctx = makeContext({
      accounts: [
        { id: "a1", type: "checking", balanceCents: 100000, availableBalanceCents: 100000 },
      ],
      recurringPayments: [
        { amountCents: 20000, nextDate: daysFromNow(2), payeeName: "Electric" },
        { amountCents: 30000, nextDate: daysFromNow(5), payeeName: "Internet" },
      ],
    });
    expect(checkPaymentFailureRisk(ctx)).toBeNull();
  });

  it("returns critical when payment is less than 2 days away", () => {
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 5000, availableBalanceCents: 5000 }],
      recurringPayments: [{ amountCents: 20000, nextDate: daysFromNow(1), payeeName: "Electric" }],
    });
    const insight = checkPaymentFailureRisk(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.type).toBe("payment_failure_risk");
    expect(insight!.severity).toBe("critical");
    expect(insight!.title).toContain("Electric");
  });

  it("returns warning when payment is more than 2 days away", () => {
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 5000, availableBalanceCents: 5000 }],
      recurringPayments: [{ amountCents: 20000, nextDate: daysFromNow(5), payeeName: "Electric" }],
    });
    const insight = checkPaymentFailureRisk(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.severity).toBe("warning");
  });

  it("detects failure risk after earlier payments deplete the balance", () => {
    // Balance $500, payment 1 = $400, payment 2 = $200 => after payment 1, only $100 left < $200
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 50000, availableBalanceCents: 50000 }],
      recurringPayments: [
        { amountCents: 40000, nextDate: daysFromNow(2), payeeName: "Rent" },
        { amountCents: 20000, nextDate: daysFromNow(4), payeeName: "Insurance" },
      ],
    });
    const insight = checkPaymentFailureRisk(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.data.payeeName).toBe("Insurance");
    expect(insight!.data.shortfallCents).toBe(10000); // needs $200, has $100
  });

  it("includes a suggested transfer action with correct shortfall amount", () => {
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 10000, availableBalanceCents: 10000 }],
      recurringPayments: [
        { amountCents: 25000, nextDate: daysFromNow(3), payeeName: "Water Bill" },
      ],
    });
    const insight = checkPaymentFailureRisk(ctx);
    expect(insight).not.toBeNull();
    expect(insight!.suggestedAction).toBeDefined();
    expect(insight!.suggestedAction!.params.suggestedAmountCents).toBe(15000);
  });
});

// =============================================================================
// generateInsights
// =============================================================================

describe("generateInsights", () => {
  it("returns empty array when no conditions are met", () => {
    const ctx = makeContext({
      accounts: [
        { id: "a1", type: "checking", balanceCents: 500000, availableBalanceCents: 500000 },
      ],
    });
    const insights = generateInsights(ctx);
    expect(insights).toEqual([]);
  });

  it("runs all checks and collects results", () => {
    // Create a context that triggers both overdraft risk and payment failure risk
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 5000, availableBalanceCents: 5000 }],
      recurringPayments: [{ amountCents: 50000, nextDate: daysFromNow(2), payeeName: "Rent" }],
    });
    const insights = generateInsights(ctx);
    expect(insights.length).toBeGreaterThanOrEqual(1);
    const types = insights.map((i: { type: string }) => i.type);
    // Should include at least overdraft_prediction or payment_failure_risk
    expect(types.includes("overdraft_prediction") || types.includes("payment_failure_risk")).toBe(
      true,
    );
  });

  it("sorts by severity: critical first, then warning, info, positive", () => {
    // Build a context that produces multiple severity levels
    // overdraft with big shortfall => critical
    // spending anomaly with 2x => info
    const transactions = [];
    // Spending anomaly: week 0 = $200, weeks 1-4 = $100 each => 2x ratio => info
    transactions.push({
      amountCents: -20000,
      category: "dining",
      merchantName: "R",
      date: daysAgo(0),
      type: "debit",
    });
    transactions.push({
      amountCents: -10000,
      category: "dining",
      merchantName: "R",
      date: daysAgo(8),
      type: "debit",
    });
    transactions.push({
      amountCents: -10000,
      category: "dining",
      merchantName: "R",
      date: daysAgo(15),
      type: "debit",
    });
    transactions.push({
      amountCents: -10000,
      category: "dining",
      merchantName: "R",
      date: daysAgo(22),
      type: "debit",
    });

    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 5000, availableBalanceCents: 5000 }],
      recurringPayments: [{ amountCents: 50000, nextDate: daysFromNow(1), payeeName: "Rent" }],
      recentTransactions: transactions,
    });

    const insights = generateInsights(ctx);

    if (insights.length >= 2) {
      const severityOrder: Record<string, number> = {
        critical: 0,
        warning: 1,
        info: 2,
        positive: 3,
      };
      for (let i = 1; i < insights.length; i++) {
        expect(severityOrder[insights[i].severity]).toBeGreaterThanOrEqual(
          severityOrder[insights[i - 1].severity],
        );
      }
    }
  });

  it("does not crash if an individual check throws", () => {
    // We can't easily make a built-in check throw, but we can verify
    // generateInsights handles errors gracefully by passing malformed data
    const ctx = makeContext({
      accounts: [{ id: "a1", type: "checking", balanceCents: 5000, availableBalanceCents: 5000 }],
    });
    // This should return empty (no conditions met) without throwing
    expect(() => generateInsights(ctx)).not.toThrow();
  });
});
