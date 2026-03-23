/**
 * Gateway Domain — Financial Data, Enrichment, Offers, Goals, Overdraft, SpendingAlerts, CashFlow
 */

import type { CallGatewayFn } from "./client";
import type {
  SavingsGoal,
  GoalContribution,
  GoalSummary,
  OverdraftSettings,
  OverdraftEvent,
  OverdraftProtectionType,
  SpendingAlertRule,
  SpendingAlertEvent,
  SpendingAlertType,
  CashFlowForecast,
} from "@/types";

export function createFinancialDomain(callGateway: CallGatewayFn) {
  return {
    financial: {
      async enrich(
        transactions: Array<{
          transactionId: string;
          description: string;
          amountCents: number;
          date: string;
          type: "debit" | "credit";
        }>,
      ) {
        return callGateway<{
          enrichedTransactions: Array<{
            transactionId: string;
            cleanDescription: string;
            rawDescription: string;
            merchant?: {
              name: string;
              logoUrl?: string;
              websiteUrl?: string;
              category: string;
              location?: string;
            };
            category: string;
            amountCents: number;
            date: string;
            isRecurring: boolean;
            transactionType: string;
          }>;
        }>("financial.enrich", { transactions } as Record<string, unknown>);
      },

      async spending(
        params: { periodStart?: string; periodEnd?: string; accountIds?: string[] } = {},
      ) {
        return callGateway<{
          totalSpendingCents: number;
          totalIncomeCents: number;
          netCashFlowCents: number;
          avgDailySpendingCents: number;
          periodStart: string;
          periodEnd: string;
          byCategory: Array<{
            category: string;
            totalCents: number;
            transactionCount: number;
            percentOfTotal: number;
            trend: string;
            changeFromPreviousCents: number;
            topMerchants: Array<{ name: string; totalCents: number; logoUrl?: string }>;
          }>;
        }>("financial.spending", params as Record<string, unknown>);
      },

      async trends(params: { months?: number; accountIds?: string[] } = {}) {
        return callGateway<{
          trends: Array<{
            month: string;
            spendingCents: number;
            incomeCents: number;
            savingsCents: number;
            topCategory: string;
          }>;
        }>("financial.trends", params as Record<string, unknown>);
      },

      async listBudgets() {
        return callGateway<{
          budgets: Array<{
            budgetId: string;
            category: string;
            limitCents: number;
            spentCents: number;
            remainingCents: number;
            percentUsed: number;
            isOverBudget: boolean;
            projectedCents: number;
          }>;
          totalBudgetCents: number;
          totalSpentCents: number;
        }>("financial.budgets.list", {});
      },

      async setBudget(category: string, limitCents: number) {
        return callGateway<{
          budgetId: string;
          category: string;
          limitCents: number;
          spentCents: number;
          remainingCents: number;
          percentUsed: number;
          isOverBudget: boolean;
          projectedCents: number;
        }>("financial.budgets.set", { category, limitCents });
      },

      async netWorth() {
        return callGateway<{
          date: string;
          totalAssetsCents: number;
          totalLiabilitiesCents: number;
          netWorthCents: number;
          accounts: Array<{
            accountId: string;
            name: string;
            type: string;
            balanceCents: number;
            institution?: string;
          }>;
        }>("financial.networth", {});
      },

      async netWorthHistory(months?: number) {
        return callGateway<
          Array<{
            date: string;
            totalAssetsCents: number;
            totalLiabilitiesCents: number;
            netWorthCents: number;
            accounts: Array<{
              accountId: string;
              name: string;
              type: string;
              balanceCents: number;
            }>;
          }>
        >("financial.networth.history", { months: months ?? 12 });
      },

      async recurring() {
        return callGateway<{
          recurring: Array<{
            recurringId: string;
            merchantName: string;
            merchantLogoUrl?: string;
            category: string;
            averageAmountCents: number;
            lastAmountCents: number;
            frequency: string;
            nextExpectedDate: string;
            isActive: boolean;
            lastChargeDate: string;
            chargeCount: number;
          }>;
          totalMonthlyCents: number;
          totalAnnualCents: number;
        }>("financial.recurring", {});
      },
    },

    enrichment: {
      async enhance(params: {
        description: string;
        amount: number;
        date: string;
        id?: string;
        accountId?: string;
      }) {
        return callGateway<{
          transaction: {
            description: string;
            amount: number;
            date: string;
            id?: string;
            accountId?: string;
            merchantName: string;
            merchantLogo: string | null;
            category: string;
            isRecurring: boolean;
            categoryCode?: string;
            confidence?: number;
          };
          adapter: string;
        }>("enrichment.enhance", params as unknown as Record<string, unknown>);
      },

      async batch(
        transactions: Array<{
          description: string;
          amount: number;
          date: string;
          id?: string;
          accountId?: string;
        }>,
      ) {
        return callGateway<{
          transactions: Array<{
            description: string;
            amount: number;
            date: string;
            id?: string;
            accountId?: string;
            merchantName: string;
            merchantLogo: string | null;
            category: string;
            isRecurring: boolean;
            categoryCode?: string;
            confidence?: number;
          }>;
          count: number;
          adapter: string;
        }>("enrichment.batch", { transactions } as Record<string, unknown>);
      },
    },

    offers: {
      async list(
        params: {
          cardId?: string;
          status?: string;
          category?: string;
          latitude?: number;
          longitude?: number;
          radiusMiles?: number;
          limit?: number;
          offset?: number;
        } = {},
      ) {
        return callGateway<{
          offers: Array<{
            offerId: string;
            merchant: {
              merchantId: string;
              name: string;
              logoUrl?: string;
              category: string;
              locations?: Array<{
                latitude: number;
                longitude: number;
                city?: string;
                state?: string;
              }>;
            };
            headline: string;
            description: string;
            offerType: string;
            rewardValue: number;
            minimumSpendCents?: number;
            maximumRewardCents?: number;
            status: string;
            expiresAt: string;
            activatedAt?: string;
            termsUrl?: string;
            isPersonalized: boolean;
            relevanceScore: number;
            tags: string[];
          }>;
          nearbyOffers?: Array<Record<string, unknown>>;
          _pagination?: import("./client").Pagination;
        }>("offers.list", params);
      },

      async activate(offerId: string, cardId: string) {
        return callGateway<{ success: boolean; offer: Record<string, unknown> }>(
          "offers.activate",
          { offerId, cardId },
        );
      },

      async deactivate(offerId: string) {
        return callGateway<{ success: boolean }>("offers.deactivate", { offerId });
      },

      async redemptions(params: { fromDate?: string; toDate?: string; limit?: number } = {}) {
        return callGateway<{
          redemptions: Array<{
            redemptionId: string;
            offerId: string;
            transactionId: string;
            transactionAmountCents: number;
            rewardAmountCents: number;
            rewardType: string;
            merchantName: string;
            redeemedAt: string;
            payoutStatus: string;
          }>;
          totalRewardsCents: number;
        }>("offers.redemptions", params);
      },

      async summary() {
        return callGateway<{
          availableCount: number;
          activatedCount: number;
          monthlyRewardsCents: number;
          totalRewardsCents: number;
          topOffers: Array<Record<string, unknown>>;
        }>("offers.summary", {});
      },
    },

    goals: {
      async list() {
        return callGateway<{ goals: SavingsGoal[] }>("goals.list", {});
      },
      async create(params: {
        name: string;
        targetAmountCents: number;
        accountId: string;
        targetDate?: string;
        iconEmoji?: string;
        autoContribute?: boolean;
        autoContributeAmountCents?: number;
        autoContributeFrequency?: "weekly" | "biweekly" | "monthly";
      }) {
        return callGateway<{ goal: SavingsGoal }>("goals.create", params);
      },
      async get(id: string) {
        return callGateway<{ goal: SavingsGoal; contributions: GoalContribution[] }>("goals.get", {
          id,
        });
      },
      async update(
        id: string,
        updates: {
          name?: string;
          targetAmountCents?: number;
          targetDate?: string;
          iconEmoji?: string;
          autoContribute?: boolean;
          autoContributeAmountCents?: number;
          autoContributeFrequency?: string;
          status?: string;
        },
      ) {
        return callGateway<{ goal: SavingsGoal }>("goals.update", { id, ...updates });
      },
      async remove(id: string) {
        return callGateway<{ success: boolean }>("goals.delete", { id });
      },
      async contribute(goalId: string, amountCents: number, fromAccountId?: string) {
        return callGateway<{ contribution: GoalContribution; goal: SavingsGoal | null }>(
          "goals.contribute",
          { goalId, amountCents, fromAccountId },
        );
      },
      async withdraw(goalId: string, amountCents: number) {
        return callGateway<{ contribution: GoalContribution; goal: SavingsGoal | null }>(
          "goals.withdraw",
          { goalId, amountCents },
        );
      },
      async summary() {
        return callGateway<{ summary: GoalSummary }>("goals.summary", {});
      },
    },

    overdraft: {
      async getSettings(accountId: string) {
        return callGateway<{ settings: OverdraftSettings }>("overdraft.settings.get", {
          accountId,
        });
      },
      async updateSettings(params: {
        accountId: string;
        isEnabled?: boolean;
        protectionType?: OverdraftProtectionType | null;
        linkedAccountId?: string | null;
        courtesyPayLimitCents?: number | null;
        optedIntoOverdraftFees?: boolean;
      }) {
        return callGateway<{ settings: OverdraftSettings }>("overdraft.settings.update", params);
      },
      async getHistory(accountId: string, limit?: number, offset?: number) {
        return callGateway<{ events: OverdraftEvent[] }>("overdraft.history", {
          accountId,
          limit,
          offset,
        });
      },
      async getFeeSchedule() {
        return callGateway<{
          feeSchedule: Array<{
            chargeType: string;
            name: string;
            amountCents: number;
            description: string | null;
            isPercentage: boolean;
            maxPerDay: number | null;
          }>;
        }>("overdraft.feeSchedule", {});
      },
    },

    spendingAlerts: {
      async list() {
        return callGateway<{ alerts: SpendingAlertRule[] }>("alerts.list", {});
      },
      async create(params: {
        name: string;
        alertType: SpendingAlertType;
        thresholdCents?: number;
        categoryId?: string;
        accountId?: string;
        channels: ("push" | "email" | "sms")[];
      }) {
        return callGateway<{ alert: SpendingAlertRule }>("alerts.create", params);
      },
      async update(params: {
        alertId: string;
        name?: string;
        alertType?: SpendingAlertType;
        thresholdCents?: number;
        categoryId?: string;
        accountId?: string;
        channels?: ("push" | "email" | "sms")[];
        isEnabled?: boolean;
      }) {
        return callGateway<{ alert: SpendingAlertRule }>("alerts.update", params);
      },
      async delete(alertId: string) {
        return callGateway<{ success: boolean }>("alerts.delete", { alertId });
      },
      async history(params: { limit?: number; offset?: number } = {}) {
        return callGateway<{ events: SpendingAlertEvent[] }>("alerts.history", params);
      },
      async summary() {
        return callGateway<{
          summary: { activeRules: number; triggeredThisWeek: number; triggeredThisMonth: number };
        }>("alerts.summary", {});
      },
    },

    cashFlow: {
      async getForecast(params: { accountId?: string; daysAhead?: number } = {}) {
        return callGateway<{ forecast: CashFlowForecast }>("cashflow.forecast", params);
      },
    },
  };
}
