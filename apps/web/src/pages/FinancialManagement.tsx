import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Repeat,
  Wallet,
  ArrowUp,
  ArrowDown,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/common/currency";
import { gateway } from "@/lib/gateway";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";

// ---------------------------------------------------------------------------
// Types (derived from gateway return types)
// ---------------------------------------------------------------------------

interface SpendingCategory {
  category: string;
  totalCents: number;
  transactionCount: number;
  percentOfTotal: number;
  trend: string;
  changeFromPreviousCents: number;
  topMerchants: Array<{ name: string; totalCents: number; logoUrl?: string }>;
}

interface SpendingData {
  totalSpendingCents: number;
  totalIncomeCents: number;
  netCashFlowCents: number;
  avgDailySpendingCents: number;
  periodStart: string;
  periodEnd: string;
  byCategory: SpendingCategory[];
}

interface TrendItem {
  month: string;
  spendingCents: number;
  incomeCents: number;
  savingsCents: number;
  topCategory: string;
}

interface BudgetItem {
  budgetId: string;
  category: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  percentUsed: number;
  isOverBudget: boolean;
  projectedCents: number;
}

interface BudgetsData {
  budgets: BudgetItem[];
  totalBudgetCents: number;
  totalSpentCents: number;
}

interface RecurringItem {
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
}

interface RecurringData {
  recurring: RecurringItem[];
  totalMonthlyCents: number;
  totalAnnualCents: number;
}

interface NetWorthAccount {
  accountId: string;
  name: string;
  type: string;
  balanceCents: number;
  institution?: string;
}

interface NetWorthData {
  date: string;
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  netWorthCents: number;
  accounts: NetWorthAccount[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function budgetProgressColor(percent: number): string {
  if (percent > 100) return "bg-red-500";
  if (percent >= 80) return "bg-yellow-500";
  return "bg-green-500";
}

function formatMonth(monthStr: string): string {
  const date = new Date(monthStr + "-01");
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FinancialManagement() {
  const { t } = useTranslation("banking");
  const {
    data: spendingData,
    isLoading: spendingLoading,
    error: spendingError,
  } = useQuery<SpendingData>({
    queryKey: ["financial-spending"],
    queryFn: () => gateway.financial.spending(),
  });

  const {
    data: trendsData,
    isLoading: trendsLoading,
    error: trendsError,
  } = useQuery<{ trends: TrendItem[] }>({
    queryKey: ["financial-trends"],
    queryFn: () => gateway.financial.trends({ months: 6 }),
  });

  const {
    data: budgetsData,
    isLoading: budgetsLoading,
    error: budgetsError,
  } = useQuery<BudgetsData>({
    queryKey: ["financial-budgets"],
    queryFn: () => gateway.financial.listBudgets(),
  });

  const {
    data: recurringData,
    isLoading: recurringLoading,
    error: recurringError,
  } = useQuery<RecurringData>({
    queryKey: ["financial-recurring"],
    queryFn: () => gateway.financial.recurring(),
  });

  const {
    data: netWorthData,
    isLoading: netWorthLoading,
    error: netWorthError,
  } = useQuery<NetWorthData>({
    queryKey: ["financial-networth"],
    queryFn: () => gateway.financial.netWorth(),
  });

  const isLoading =
    spendingLoading || trendsLoading || budgetsLoading || recurringLoading || netWorthLoading;
  const error = spendingError || trendsError || budgetsError || recurringError || netWorthError;

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">{t("financialManagement.failedToLoad")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : t("financialManagement.unexpectedError")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = spendingData?.byCategory ?? [];
  const trends = trendsData?.trends ?? [];
  const budgets = budgetsData?.budgets ?? [];
  const subscriptions = recurringData?.recurring ?? [];
  const accounts = netWorthData?.accounts ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("financialManagement.title")}</h1>
        <p className="text-muted-foreground">{t("financialManagement.subtitle")}</p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Spending Summary */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <ArrowDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("financialManagement.totalSpending")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(spendingData?.totalSpendingCents ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <ArrowUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("financialManagement.totalIncome")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(spendingData?.totalIncomeCents ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("financialManagement.netCashFlow")}
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    (spendingData?.netCashFlowCents ?? 0) >= 0 ? "text-green-600" : "text-red-600",
                  )}
                >
                  {formatCurrency(spendingData?.netCashFlowCents ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Spending by Category */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("financialManagement.spendingByCategory")}</CardTitle>
          </div>
          <CardDescription>{t("financialManagement.spendingByCategoryDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("financialManagement.noSpendingData")}
            </p>
          ) : (
            <div className="space-y-5">
              {categories.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cat.category}</span>
                      {cat.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : cat.trend === "down" ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {cat.percentOfTotal.toFixed(1)}%
                      </span>
                      <span className="font-medium">{formatCurrency(cat.totalCents)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(cat.percentOfTotal, 100)}%` }}
                    />
                  </div>
                  {cat.topMerchants.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-1">
                      {cat.topMerchants.map((m) => (
                        <Badge key={m.name} variant="outline" className="text-xs font-normal">
                          {m.name} &middot; {formatCurrency(m.totalCents)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Monthly Trends */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("financialManagement.monthlyTrends")}</CardTitle>
          </div>
          <CardDescription>{t("financialManagement.monthlyTrendsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("financialManagement.noTrendData")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                      {t("financialManagement.month")}
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">
                      {t("financialManagement.spending")}
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">
                      {t("financialManagement.income")}
                    </th>
                    <th className="text-right py-2 pl-4 font-medium text-muted-foreground">
                      {t("financialManagement.savings")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((trend) => (
                    <tr key={trend.month} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{formatMonth(trend.month)}</td>
                      <td className="py-3 px-4 text-right text-red-600">
                        {formatCurrency(trend.spendingCents)}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600">
                        {formatCurrency(trend.incomeCents)}
                      </td>
                      <td
                        className={cn(
                          "py-3 pl-4 text-right",
                          trend.savingsCents >= 0 ? "text-green-600" : "text-red-600",
                        )}
                      >
                        {formatCurrency(trend.savingsCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Budgets */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("financialManagement.budgets")}</CardTitle>
          </div>
          <CardDescription>
            {budgetsData
              ? t("financialManagement.budgetUsed", {
                  spent: formatCurrency(budgetsData.totalSpentCents),
                  total: formatCurrency(budgetsData.totalBudgetCents),
                })
              : t("financialManagement.budgetsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("financialManagement.noBudgets")}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {budgets.map((b) => {
                const clampedPercent = Math.min(b.percentUsed, 100);
                const colorClass = budgetProgressColor(b.percentUsed);

                return (
                  <div key={b.budgetId} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{b.category}</span>
                      {b.isOverBudget && (
                        <Badge variant="destructive" className="text-xs">
                          {t("financialManagement.overBudget")}
                        </Badge>
                      )}
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", colorClass)}
                        style={{ width: `${clampedPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {t("financialManagement.spent", { amount: formatCurrency(b.spentCents) })}
                      </span>
                      <span>
                        {t("financialManagement.limit", { amount: formatCurrency(b.limitCents) })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Recurring Transactions */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("financialManagement.recurringTransactions")}</CardTitle>
          </div>
          <CardDescription>
            {recurringData
              ? t("financialManagement.recurringCost", {
                  monthly: formatCurrency(recurringData.totalMonthlyCents),
                  annual: formatCurrency(recurringData.totalAnnualCents),
                })
              : t("financialManagement.recurringDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("financialManagement.noRecurring")}
            </p>
          ) : (
            <div className="divide-y">
              {subscriptions.map((sub) => (
                <div
                  key={sub.recurringId}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {sub.merchantLogoUrl ? (
                      <img
                        src={sub.merchantLogoUrl}
                        alt={sub.merchantName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{sub.merchantName}</p>
                      {!sub.isActive && (
                        <Badge variant="outline" className="text-xs">
                          {t("financialManagement.inactive")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sub.frequency} &middot; {t("financialManagement.next")}:{" "}
                      {new Date(sub.nextExpectedDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">{formatCurrency(sub.lastAmountCents)}</p>
                    <p className="text-xs text-muted-foreground">{sub.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Net Worth */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("financialManagement.netWorth")}</CardTitle>
          </div>
          {netWorthData && (
            <CardDescription>
              {t("financialManagement.asOfDate", {
                date: new Date(netWorthData.date).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
              })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("financialManagement.totalAssets")}
              </p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {formatCurrency(netWorthData?.totalAssetsCents ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("financialManagement.totalLiabilities")}
              </p>
              <p className="text-xl font-bold text-red-600 mt-1">
                {formatCurrency(netWorthData?.totalLiabilitiesCents ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("financialManagement.netWorth")}
              </p>
              <p
                className={cn(
                  "text-xl font-bold mt-1",
                  (netWorthData?.netWorthCents ?? 0) >= 0 ? "text-green-600" : "text-red-600",
                )}
              >
                {formatCurrency(netWorthData?.netWorthCents ?? 0)}
              </p>
            </div>
          </div>

          {/* Accounts list */}
          {accounts.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">{t("financialManagement.accounts")}</p>
              <div className="divide-y rounded-lg border">
                {accounts.map((acct) => (
                  <div key={acct.accountId} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{acct.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {acct.type}
                        {acct.institution ? ` \u00b7 ${acct.institution}` : ""}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        acct.balanceCents >= 0 ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {formatCurrency(acct.balanceCents)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
