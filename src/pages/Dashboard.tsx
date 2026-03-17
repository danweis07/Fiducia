import { Wallet, Banknote, Calendar, Sparkles, PiggyBank, TrendingUp, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/common/currency";
import { useTranslation } from "react-i18next";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useLoans } from "@/hooks/useLoans";
import { useCMSBanners, useCMSAnnouncements } from "@/hooks/useCMSContent";
import { CMSBannerList } from "@/components/common/CMSBanner";
import { PageSkeleton, TransactionRowSkeleton } from "@/components/common/LoadingSkeleton";
import { Spinner } from "@/components/common/Spinner";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { TransactionRow } from "@/components/common/TransactionRow";
import { useAuth } from "@/contexts/TenantContext";
import { getQuickActions } from "@/lib/regional-quick-actions";
import { DEFAULT_FEATURES } from "@/contexts/TenantContext";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { t, i18n } = useTranslation("banking");
  const queryClient = useQueryClient();
  const { isRefreshing } = usePullToRefresh({ onRefresh: () => queryClient.invalidateQueries() });
  const { tenant } = useAuth();
  const region = tenant?.region ?? "us";
  const features = tenant?.features ?? DEFAULT_FEATURES;
  const quickActions = getQuickActions(region, features);
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: txData, isLoading: txLoading } = useTransactions({ limit: 5 });
  const { data: loansData } = useLoans();
  const { data: banners = [] } = useCMSBanners();
  const { data: announcements = [] } = useCMSAnnouncements();

  const { data: spendingData } = useQuery({
    queryKey: ["financial", "spending"],
    queryFn: () => gateway.financial.spending(),
  });

  const accounts = accountsData?.accounts ?? [];
  const transactions = txData?.transactions ?? [];
  const loans = loansData?.loans ?? [];
  const activeLoans = loans.filter((l) => l.status === "active" || l.status === "delinquent");

  const totalBalanceCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);
  const totalLoanBalanceCents = activeLoans.reduce((sum, l) => sum + l.outstandingBalanceCents, 0);

  const accountTypeStyles: Record<string, { icon: LucideIcon; color: string }> = {
    checking: { icon: Wallet, color: "text-primary" },
    savings: { icon: PiggyBank, color: "text-status-success" },
    money_market: { icon: TrendingUp, color: "text-risk-medium" },
    cd: { icon: Lock, color: "text-risk-high" },
  };

  if (accountsLoading) {
    return <PageSkeleton />;
  }

  // Find next loan payment due (earliest due date across all active loans)
  const nextLoanPayment = activeLoans
    .filter((l) => l.nextPaymentDueDate && l.nextPaymentAmountCents)
    .sort(
      (a, b) =>
        new Date(a.nextPaymentDueDate!).getTime() - new Date(b.nextPaymentDueDate!).getTime(),
    )[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="flex justify-center py-2">
          <Spinner />
        </div>
      )}

      {/* CMS Banners & Announcements */}
      <CMSBannerList items={[...banners, ...announcements]} channel="web_portal" />

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.welcomeBack")}</h1>
        <p className="text-muted-foreground">{t("dashboard.financialOverview")}</p>
      </div>

      {/* Contextual insight */}
      {spendingData?.byCategory && spendingData.byCategory.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm">
              {t("dashboard.insight", {
                category: spendingData.byCategory[0]?.category ?? "",
                percent: spendingData.byCategory[0]?.percentOfTotal ?? 0,
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Balance summary row */}
      <div className={`grid gap-4 ${activeLoans.length > 0 ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
        {/* Total deposit balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.totalBalance")}
            </CardTitle>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalBalanceCents)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.acrossAccounts", { count: accounts.length })}
            </p>
          </CardContent>
        </Card>

        {/* Loan summary */}
        {activeLoans.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.loanBalance")}
              </CardTitle>
              <Banknote className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(totalLoanBalanceCents)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("dashboard.acrossLoans", { count: activeLoans.length })}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Next loan payment alert */}
      {nextLoanPayment && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    {t("dashboard.nextLoanPayment", {
                      amount: formatCurrency(nextLoanPayment.nextPaymentAmountCents!),
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Due{" "}
                    {new Date(nextLoanPayment.nextPaymentDueDate!).toLocaleDateString(
                      i18n.language,
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                    {nextLoanPayment.autopayAccountId && ` · ${t("dashboard.autopayEnabled")}`}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/loans/${nextLoanPayment.id}`}>{t("dashboard.view")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div
        className={`grid grid-cols-2 gap-4 ${quickActions.length <= 3 ? "md:grid-cols-3" : quickActions.length === 4 ? "md:grid-cols-4" : "md:grid-cols-5"}`}
      >
        {quickActions.map((action) => (
          <Button
            key={action.labelKey}
            variant="outline"
            className="h-auto flex flex-col items-center gap-2 py-5"
            asChild
          >
            <Link to={action.to}>
              <div className={`rounded-full p-2 ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{t(action.labelKey)}</span>
            </Link>
          </Button>
        ))}
      </div>

      {/* Spending snapshot */}
      {spendingData?.byCategory && spendingData.byCategory.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.monthlySpending")}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/financial">{t("dashboard.viewDetails")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold mb-3">
              {formatCurrency(spendingData.totalSpendingCents)}
            </p>
            <div className="space-y-2">
              {spendingData.byCategory.slice(0, 3).map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{cat.category}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(cat.totalCents)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(cat.percentOfTotal, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("dashboard.yourAccounts")}</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/accounts">{t("dashboard.viewAll")}</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <Link key={account.id} to={`/accounts/${account.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const style = accountTypeStyles[account.type] ?? {
                          icon: Wallet,
                          color: "text-muted-foreground",
                        };
                        const Icon = style.icon;
                        return <Icon className={`h-4 w-4 ${style.color}`} />;
                      })()}
                      <CardDescription className="capitalize">
                        {account.type} {account.accountNumberMasked}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {account.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">
                    {account.nickname ?? t("dashboard.account", { type: account.type })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(account.balanceCents)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.available", {
                        amount: formatCurrency(account.availableBalanceCents),
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Active loans on dashboard */}
      {activeLoans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t("dashboard.yourLoans")}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/apply-loan">{t("dashboard.applyForLoan")}</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/accounts">{t("dashboard.viewAll")}</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {activeLoans.map((loan) => {
              const progressPct =
                loan.principalCents > 0
                  ? Math.round(
                      ((loan.principalCents - loan.outstandingBalanceCents) / loan.principalCents) *
                        100,
                    )
                  : 0;
              return (
                <Link key={loan.id} to={`/loans/${loan.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardDescription>{loan.loanNumberMasked}</CardDescription>
                        <Badge
                          variant={loan.daysPastDue > 0 ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {loan.daysPastDue > 0
                            ? t("dashboard.daysPastDue", { days: loan.daysPastDue })
                            : loan.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">{t("dashboard.loan")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold">
                          {formatCurrency(loan.outstandingBalanceCents)}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{progressPct}%</span>
                        </div>
                        {loan.nextPaymentDueDate && loan.nextPaymentAmountCents && (
                          <p className="text-xs text-muted-foreground">
                            Next: {formatCurrency(loan.nextPaymentAmountCents)} due{" "}
                            {new Date(loan.nextPaymentDueDate).toLocaleDateString(i18n.language, {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t("dashboard.recentTransactions")}</h2>
        <Card>
          <CardContent className="p-0">
            {txLoading ? (
              <div className="divide-y">
                <TransactionRowSkeleton />
                <TransactionRowSkeleton />
                <TransactionRowSkeleton />
              </div>
            ) : transactions.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">
                {t("dashboard.noRecentTransactions")}
              </p>
            ) : (
              <ul className="divide-y">
                {transactions.map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow
                      description={tx.description}
                      amountCents={tx.amountCents}
                      category={tx.category}
                      status={tx.status}
                      compact
                      className="px-6"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
