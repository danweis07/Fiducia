import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/backend", () => ({
  getBackend: vi.fn().mockReturnValue({
    gateway: { invoke: vi.fn() },
  }),
}));
vi.mock("@/lib/demo", () => ({
  isDemoMode: vi.fn().mockReturnValue(false),
}));

import { gateway } from "../../gateway";
import { getBackend } from "@/lib/backend";

function mockInvoke(data: unknown) {
  const backend = getBackend();
  vi.mocked(backend.gateway.invoke).mockResolvedValue({ data, error: undefined, meta: {} });
  return vi.mocked(backend.gateway.invoke);
}

describe("Financial Domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // FINANCIAL
  // ===========================================================================

  describe("financial", () => {
    it("enrich calls financial.enrich with transactions", async () => {
      const invoke = mockInvoke({ enrichedTransactions: [] });
      const transactions = [
        {
          transactionId: "t1",
          description: "Coffee",
          amountCents: 450,
          date: "2026-03-01",
          type: "debit" as const,
        },
      ];
      await gateway.financial.enrich(transactions);
      expect(invoke).toHaveBeenCalledWith("financial.enrich", { transactions });
    });

    it("spending calls financial.spending with params", async () => {
      const invoke = mockInvoke({ totalSpendingCents: 100000, byCategory: [] });
      const params = { periodStart: "2026-03-01", periodEnd: "2026-03-31" };
      await gateway.financial.spending(params);
      expect(invoke).toHaveBeenCalledWith("financial.spending", params);
    });

    it("trends calls financial.trends with params", async () => {
      const invoke = mockInvoke({ trends: [] });
      await gateway.financial.trends({ months: 6 });
      expect(invoke).toHaveBeenCalledWith("financial.trends", { months: 6 });
    });

    it("listBudgets calls financial.budgets.list", async () => {
      const invoke = mockInvoke({ budgets: [], totalBudgetCents: 0, totalSpentCents: 0 });
      await gateway.financial.listBudgets();
      expect(invoke).toHaveBeenCalledWith("financial.budgets.list", {});
    });

    it("setBudget calls financial.budgets.set with category and limitCents", async () => {
      const invoke = mockInvoke({ budgetId: "b1", category: "food", limitCents: 50000 });
      await gateway.financial.setBudget("food", 50000);
      expect(invoke).toHaveBeenCalledWith("financial.budgets.set", {
        category: "food",
        limitCents: 50000,
      });
    });

    it("netWorth calls financial.networth", async () => {
      const invoke = mockInvoke({
        netWorthCents: 250000,
        totalAssetsCents: 500000,
        totalLiabilitiesCents: 250000,
      });
      await gateway.financial.netWorth();
      expect(invoke).toHaveBeenCalledWith("financial.networth", {});
    });

    it("netWorthHistory calls financial.networth.history with months", async () => {
      const invoke = mockInvoke([{ date: "2026-01", netWorthCents: 200000 }]);
      await gateway.financial.netWorthHistory(6);
      expect(invoke).toHaveBeenCalledWith("financial.networth.history", { months: 6 });
    });

    it("netWorthHistory defaults to 12 months", async () => {
      const invoke = mockInvoke([]);
      await gateway.financial.netWorthHistory();
      expect(invoke).toHaveBeenCalledWith("financial.networth.history", { months: 12 });
    });

    it("recurring calls financial.recurring", async () => {
      const invoke = mockInvoke({ recurring: [], totalMonthlyCents: 0, totalAnnualCents: 0 });
      await gateway.financial.recurring();
      expect(invoke).toHaveBeenCalledWith("financial.recurring", {});
    });
  });

  // ===========================================================================
  // ENRICHMENT
  // ===========================================================================

  describe("enrichment", () => {
    it("enhance calls enrichment.enhance with params", async () => {
      const invoke = mockInvoke({ transaction: { merchantName: "Starbucks", category: "food" } });
      const params = { description: "SBUX #1234", amount: 450, date: "2026-03-01" };
      await gateway.enrichment.enhance(params);
      expect(invoke).toHaveBeenCalledWith("enrichment.enhance", params);
    });

    it("batch calls enrichment.batch with transactions", async () => {
      const invoke = mockInvoke({ transactions: [], count: 0 });
      const transactions = [{ description: "Coffee", amount: 450, date: "2026-03-01" }];
      await gateway.enrichment.batch(transactions);
      expect(invoke).toHaveBeenCalledWith("enrichment.batch", { transactions });
    });
  });

  // ===========================================================================
  // OFFERS
  // ===========================================================================

  describe("offers", () => {
    it("list calls offers.list with params", async () => {
      const invoke = mockInvoke({ offers: [] });
      await gateway.offers.list({ cardId: "c1", status: "available", limit: 10 });
      expect(invoke).toHaveBeenCalledWith("offers.list", {
        cardId: "c1",
        status: "available",
        limit: 10,
      });
    });

    it("activate calls offers.activate with offerId and cardId", async () => {
      const invoke = mockInvoke({ success: true, offer: {} });
      await gateway.offers.activate("o1", "c1");
      expect(invoke).toHaveBeenCalledWith("offers.activate", { offerId: "o1", cardId: "c1" });
    });

    it("deactivate calls offers.deactivate with offerId", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.offers.deactivate("o1");
      expect(invoke).toHaveBeenCalledWith("offers.deactivate", { offerId: "o1" });
    });

    it("redemptions calls offers.redemptions with params", async () => {
      const invoke = mockInvoke({ redemptions: [], totalRewardsCents: 0 });
      await gateway.offers.redemptions({ fromDate: "2026-01-01", limit: 20 });
      expect(invoke).toHaveBeenCalledWith("offers.redemptions", {
        fromDate: "2026-01-01",
        limit: 20,
      });
    });

    it("summary calls offers.summary", async () => {
      const invoke = mockInvoke({
        availableCount: 5,
        activatedCount: 2,
        monthlyRewardsCents: 1500,
      });
      await gateway.offers.summary();
      expect(invoke).toHaveBeenCalledWith("offers.summary", {});
    });
  });

  // ===========================================================================
  // GOALS
  // ===========================================================================

  describe("goals", () => {
    it("list calls goals.list", async () => {
      const invoke = mockInvoke({ goals: [] });
      await gateway.goals.list();
      expect(invoke).toHaveBeenCalledWith("goals.list", {});
    });

    it("create calls goals.create with params", async () => {
      const invoke = mockInvoke({ goal: { id: "g1" } });
      const params = {
        name: "Vacation",
        targetAmountCents: 500000,
        accountId: "a1",
        targetDate: "2027-01-01",
      };
      await gateway.goals.create(params);
      expect(invoke).toHaveBeenCalledWith("goals.create", params);
    });

    it("get calls goals.get with id", async () => {
      const invoke = mockInvoke({ goal: { id: "g1" }, contributions: [] });
      await gateway.goals.get("g1");
      expect(invoke).toHaveBeenCalledWith("goals.get", { id: "g1" });
    });

    it("update calls goals.update with id and updates", async () => {
      const invoke = mockInvoke({ goal: { id: "g1" } });
      await gateway.goals.update("g1", { name: "New Vacation", targetAmountCents: 600000 });
      expect(invoke).toHaveBeenCalledWith("goals.update", {
        id: "g1",
        name: "New Vacation",
        targetAmountCents: 600000,
      });
    });

    it("remove calls goals.delete with id", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.goals.remove("g1");
      expect(invoke).toHaveBeenCalledWith("goals.delete", { id: "g1" });
    });

    it("contribute calls goals.contribute with goalId and amountCents", async () => {
      const invoke = mockInvoke({ contribution: { id: "c1" }, goal: { id: "g1" } });
      await gateway.goals.contribute("g1", 10000, "a1");
      expect(invoke).toHaveBeenCalledWith("goals.contribute", {
        goalId: "g1",
        amountCents: 10000,
        fromAccountId: "a1",
      });
    });

    it("withdraw calls goals.withdraw with goalId and amountCents", async () => {
      const invoke = mockInvoke({ contribution: { id: "c2" }, goal: { id: "g1" } });
      await gateway.goals.withdraw("g1", 5000);
      expect(invoke).toHaveBeenCalledWith("goals.withdraw", { goalId: "g1", amountCents: 5000 });
    });

    it("summary calls goals.summary", async () => {
      const invoke = mockInvoke({ summary: { totalGoals: 3 } });
      await gateway.goals.summary();
      expect(invoke).toHaveBeenCalledWith("goals.summary", {});
    });
  });

  // ===========================================================================
  // OVERDRAFT
  // ===========================================================================

  describe("overdraft", () => {
    it("getSettings calls overdraft.settings.get with accountId", async () => {
      const invoke = mockInvoke({ settings: { isEnabled: true } });
      await gateway.overdraft.getSettings("a1");
      expect(invoke).toHaveBeenCalledWith("overdraft.settings.get", { accountId: "a1" });
    });

    it("updateSettings calls overdraft.settings.update with params", async () => {
      const invoke = mockInvoke({ settings: { isEnabled: false } });
      const params = {
        accountId: "a1",
        isEnabled: false,
        protectionType: "linked_account" as never,
      };
      await gateway.overdraft.updateSettings(params);
      expect(invoke).toHaveBeenCalledWith("overdraft.settings.update", params);
    });

    it("getHistory calls overdraft.history with accountId and pagination", async () => {
      const invoke = mockInvoke({ events: [] });
      await gateway.overdraft.getHistory("a1", 20, 0);
      expect(invoke).toHaveBeenCalledWith("overdraft.history", {
        accountId: "a1",
        limit: 20,
        offset: 0,
      });
    });

    it("getFeeSchedule calls overdraft.feeSchedule", async () => {
      const invoke = mockInvoke({ feeSchedule: [] });
      await gateway.overdraft.getFeeSchedule();
      expect(invoke).toHaveBeenCalledWith("overdraft.feeSchedule", {});
    });
  });

  // ===========================================================================
  // SPENDING ALERTS
  // ===========================================================================

  describe("spendingAlerts", () => {
    it("list calls alerts.list", async () => {
      const invoke = mockInvoke({ alerts: [] });
      await gateway.spendingAlerts.list();
      expect(invoke).toHaveBeenCalledWith("alerts.list", {});
    });

    it("create calls alerts.create with params", async () => {
      const invoke = mockInvoke({ alert: { id: "al1" } });
      const params = {
        name: "High spend",
        alertType: "threshold" as never,
        thresholdCents: 100000,
        channels: ["push" as never],
      };
      await gateway.spendingAlerts.create(params);
      expect(invoke).toHaveBeenCalledWith("alerts.create", params);
    });

    it("update calls alerts.update with params", async () => {
      const invoke = mockInvoke({ alert: { id: "al1" } });
      const params = {
        alertId: "al1",
        name: "Updated alert",
        thresholdCents: 200000,
        isEnabled: true,
      };
      await gateway.spendingAlerts.update(params);
      expect(invoke).toHaveBeenCalledWith("alerts.update", params);
    });

    it("delete calls alerts.delete with alertId", async () => {
      const invoke = mockInvoke({ success: true });
      await gateway.spendingAlerts.delete("al1");
      expect(invoke).toHaveBeenCalledWith("alerts.delete", { alertId: "al1" });
    });

    it("history calls alerts.history with params", async () => {
      const invoke = mockInvoke({ events: [] });
      await gateway.spendingAlerts.history({ limit: 50, offset: 0 });
      expect(invoke).toHaveBeenCalledWith("alerts.history", { limit: 50, offset: 0 });
    });

    it("summary calls alerts.summary", async () => {
      const invoke = mockInvoke({
        summary: { activeRules: 3, triggeredThisWeek: 1, triggeredThisMonth: 5 },
      });
      await gateway.spendingAlerts.summary();
      expect(invoke).toHaveBeenCalledWith("alerts.summary", {});
    });
  });

  // ===========================================================================
  // CASH FLOW
  // ===========================================================================

  describe("cashFlow", () => {
    it("getForecast calls cashflow.forecast with params", async () => {
      const invoke = mockInvoke({ forecast: { projectedBalanceCents: 500000 } });
      await gateway.cashFlow.getForecast({ accountId: "a1", daysAhead: 30 });
      expect(invoke).toHaveBeenCalledWith("cashflow.forecast", { accountId: "a1", daysAhead: 30 });
    });
  });
});
