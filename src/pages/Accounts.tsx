import { Link } from "react-router-dom";
import {
  ChevronRight,
  Landmark,
  PiggyBank,
  TrendingUp,
  Landmark as CD,
  Banknote,
  Car,
  Home,
  GraduationCap,
  CreditCard,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatInterestRate } from "@/lib/common/currency";
import { useTranslation } from 'react-i18next';
import { useAccounts } from "@/hooks/useAccounts";
import { useLoans } from "@/hooks/useLoans";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { LoanType, LoanStatus } from "@/types";

// ---------------------------------------------------------------------------
// Icon maps
// ---------------------------------------------------------------------------

const accountIcons: Record<string, React.ElementType> = {
  checking: Landmark,
  savings: PiggyBank,
  money_market: TrendingUp,
  cd: CD,
};

const loanIcons: Record<LoanType, React.ElementType> = {
  personal: Banknote,
  auto: Car,
  mortgage: Home,
  heloc: Home,
  credit_builder: CreditCard,
  student: GraduationCap,
  business: Briefcase,
  line_of_credit: CreditCard,
  other: Banknote,
};

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

const accountStatusVariant = (status: string) => {
  switch (status) {
    case "active":
      return "secondary" as const;
    case "frozen":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

const loanStatusVariant = (status: LoanStatus) => {
  switch (status) {
    case "active":
      return "secondary" as const;
    case "delinquent":
    case "default":
    case "charged_off":
      return "destructive" as const;
    case "paid_off":
      return "outline" as const;
    default:
      return "outline" as const;
  }
};

const loanTypeLabels: Record<LoanType, string> = {
  personal: "Personal Loan",
  auto: "Auto Loan",
  mortgage: "Mortgage",
  heloc: "HELOC",
  credit_builder: "Credit Builder",
  student: "Student Loan",
  business: "Business Loan",
  line_of_credit: "Line of Credit",
  other: "Loan",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Accounts() {
  const { t } = useTranslation('banking');
  const { data: accountsData, isLoading: accountsLoading, error: accountsError } = useAccounts();
  const { data: loansData, isLoading: loansLoading } = useLoans();

  const accounts = accountsData?.accounts ?? [];
  const loans = loansData?.loans ?? [];
  const activeLoans = loans.filter((l) => l.status !== "closed" && l.status !== "charged_off");

  const isLoading = accountsLoading || loansLoading;

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (accountsError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">{t('accounts.failedToLoad')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {accountsError instanceof Error ? accountsError.message : "An unexpected error occurred."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalDepositCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);
  const totalLoanBalanceCents = activeLoans.reduce((sum, l) => sum + l.outstandingBalanceCents, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header with net position */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('accounts.title')}</h1>
        <div className="flex flex-wrap gap-4 mt-1">
          <p className="text-muted-foreground">
            {t('accounts.deposits')}: {formatCurrency(totalDepositCents)}
          </p>
          {activeLoans.length > 0 && (
            <p className="text-muted-foreground">
              {t('accounts.loans')}: {formatCurrency(totalLoanBalanceCents)}
            </p>
          )}
        </div>
      </div>

      {/* Deposit Accounts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t('accounts.depositAccounts')}</h2>
        {accounts.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={t('accounts.noDepositAccounts')}
            description={t('accounts.noDepositAccountsDesc')}
          />
        ) : (
          <div className="grid gap-4">
            {accounts.map((account) => {
              const Icon = accountIcons[account.type] ?? Landmark;
              return (
                <Card key={account.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted p-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {account.nickname ?? `${account.type} Account`}
                          </CardTitle>
                          <CardDescription className="capitalize">
                            {account.type.replace("_", " ")} &middot;{" "}
                            {account.accountNumberMasked}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={accountStatusVariant(account.status)} className="capitalize">
                        {account.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <p className="text-2xl font-bold">
                          {formatCurrency(account.balanceCents)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('accounts.availableBalance')}: {formatCurrency(account.availableBalanceCents)}
                          {account.interestRateBps > 0 && (
                            <span className="ml-3">
                              {t('accounts.apy')}: {formatInterestRate(account.interestRateBps)}
                            </span>
                          )}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/accounts/${account.id}`}>
                          {t('dashboard.viewDetails')}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Loans */}
      {activeLoans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t('accounts.loans')}</h2>
          <div className="grid gap-4">
            {activeLoans.map((loan) => {
              const loanType = loan.status === "active" ? (loan as unknown as { _loanType?: LoanType })?._loanType : undefined;
              const Icon = loanIcons[(loanType as LoanType) ?? "personal"] ?? Banknote;
              const progressPct = loan.principalCents > 0
                ? Math.round(((loan.principalCents - loan.outstandingBalanceCents) / loan.principalCents) * 100)
                : 0;

              return (
                <Card key={loan.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted p-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {loanTypeLabels[(loanType as LoanType) ?? "personal"]}
                          </CardTitle>
                          <CardDescription>
                            {loan.loanNumberMasked}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={loanStatusVariant(loan.status)} className="capitalize">
                        {loan.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="space-y-2">
                        <div>
                          <p className="text-2xl font-bold">
                            {formatCurrency(loan.outstandingBalanceCents)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('accounts.ofOriginal', { amount: formatCurrency(loan.principalCents) })}
                            <span className="ml-3">
                              {t('accounts.rate')}: {formatInterestRate(loan.interestRateBps)}
                            </span>
                          </p>
                        </div>
                        {/* Payoff progress bar */}
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{t('accounts.paidPercent', { percent: progressPct })}</span>
                        </div>
                        {loan.nextPaymentDueDate && loan.nextPaymentAmountCents && (
                          <p className="text-xs text-muted-foreground">
                            {t('accounts.nextPayment', { amount: formatCurrency(loan.nextPaymentAmountCents), date: new Date(loan.nextPaymentDueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) })}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/loans/${loan.id}`}>
                          {t('dashboard.viewDetails')}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
