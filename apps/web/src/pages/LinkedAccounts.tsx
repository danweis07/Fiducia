import { useState } from "react";
import {
  ExternalLink,
  Plus,
  Building2,
  CreditCard,
  PiggyBank,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/common/currency";
import { formatBankingDate } from "@/lib/common/date";
import { AppShell } from "@/components/AppShell";
import { useLinkedAccounts, useExternalTransactions } from "@/hooks/useExternalAccounts";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { Spinner } from "@/components/common/Spinner";
import { useTranslation } from "react-i18next";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const accountIcons: Record<string, React.ElementType> = {
  checking: Building2,
  savings: PiggyBank,
  credit: CreditCard,
  loan: TrendingDown,
  investment: TrendingDown,
  other: Building2,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LinkedAccounts() {
  const { t } = useTranslation("banking");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { data: linkedAccountsData, isLoading: accountsLoading } = useLinkedAccounts();
  const { data: transactionsData, isLoading: transactionsLoading } = useExternalTransactions(
    selectedAccountId ?? undefined,
  );

  const linkedAccounts = linkedAccountsData?.accounts ?? [];
  const transactions = transactionsData?.transactions ?? [];

  const totalBalanceCents = linkedAccounts.reduce((sum, a) => sum + a.balanceCents, 0);

  const selectedAccount = selectedAccountId
    ? linkedAccounts.find((a) => a.accountId === selectedAccountId)
    : null;

  if (accountsLoading) {
    return (
      <AppShell>
        <main className="flex-1 overflow-y-auto">
          <PageSkeleton />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("linkedAccounts.title")}</h1>
              <p className="text-muted-foreground">
                {t("linkedAccounts.externalBalance", { amount: formatCurrency(totalBalanceCents) })}
              </p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("linkedAccounts.linkAccount")}
            </Button>
          </div>

          {/* Accounts grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {linkedAccounts.map((account) => {
              const Icon = accountIcons[account.type] ?? Building2;
              const isSelected = selectedAccountId === account.accountId;

              return (
                <Card
                  key={account.accountId}
                  className={`cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
                  onClick={() => setSelectedAccountId(isSelected ? null : account.accountId)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted p-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {account.institutionName} {account.mask}
                          </CardDescription>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold">{formatCurrency(account.balanceCents)}</p>
                    {account.availableBalanceCents != null && (
                      <p className="text-xs text-muted-foreground">
                        {t("accounts.availableBalance")}:{" "}
                        {formatCurrency(account.availableBalanceCents)}
                      </p>
                    )}
                    <Badge variant="secondary" className="mt-2 capitalize text-xs">
                      {account.type}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedAccount
                  ? t("linkedAccounts.transactionsFor", { name: selectedAccount.name })
                  : t("linkedAccounts.allExternalTransactions")}
              </CardTitle>
              <CardDescription>
                {selectedAccount
                  ? `${selectedAccount.institutionName} ${selectedAccount.mask}`
                  : t("linkedAccounts.recentActivity")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div
                  className="flex justify-center py-4"
                  role="status"
                  aria-label="Loading transactions"
                >
                  <Spinner />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t("linkedAccounts.noTransactions")}
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((txn) => {
                    const isCredit = txn.amountCents > 0;
                    return (
                      <div
                        key={txn.transactionId}
                        className="flex items-center justify-between py-2 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-full p-1.5 ${isCredit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {txn.merchantName ?? txn.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatBankingDate(txn.date)}
                              {txn.pending && (
                                <Badge variant="outline" className="ml-2 text-[10px] py-0">
                                  {t("linkedAccounts.pending")}
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-semibold ${isCredit ? "text-green-700" : "text-foreground"}`}
                        >
                          {isCredit ? "+" : ""}
                          {formatCurrency(Math.abs(txn.amountCents))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}
