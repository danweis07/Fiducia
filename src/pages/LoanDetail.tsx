import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, DollarSign, Send, Clock } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatInterestRate, parseToCents } from "@/lib/common/currency";
import { formatBankingDate } from "@/lib/common/date";
import { useLoan, useLoanSchedule, useLoanPayments, useMakeLoanPayment } from "@/hooks/useLoans";
import { useAccounts } from "@/hooks/useAccounts";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { SuccessAnimation } from "@/components/common/SuccessAnimation";
import { Spinner } from "@/components/common/Spinner";
import type { LoanScheduleStatus } from "@/types";

type TabType = "overview" | "schedule" | "payments" | "make_payment";

const scheduleStatusVariant = (status: LoanScheduleStatus) => {
  switch (status) {
    case "paid":
      return "secondary" as const;
    case "due":
      return "default" as const;
    case "late":
      return "destructive" as const;
    case "partial":
      return "outline" as const;
    default:
      return "outline" as const;
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoanDetail() {
  const { t } = useTranslation("banking");
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [extraPrincipal, setExtraPrincipal] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { toast } = useToast();

  const { data: loanData, isLoading: loanLoading, error: loanError } = useLoan(id ?? "");
  const { data: scheduleData, isLoading: scheduleLoading } = useLoanSchedule(id ?? "");
  const { data: paymentsData, isLoading: paymentsLoading } = useLoanPayments(id ?? "");
  const { data: accountsData } = useAccounts();
  const makePayment = useMakeLoanPayment();

  const loan = loanData?.loan;
  const schedule = scheduleData?.schedule ?? [];
  const payments = paymentsData?.payments ?? [];
  const accounts = accountsData?.accounts ?? [];

  if (loanLoading) {
    return <PageSkeleton />;
  }

  if (loanError || !loan) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-muted-foreground">
          {loanError instanceof Error ? loanError.message : t("loanDetail.notFound")}
        </p>
        <Button variant="ghost" className="mt-4" asChild>
          <Link to="/accounts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("loanDetail.backToAccounts")}
          </Link>
        </Button>
      </div>
    );
  }

  const progressPct =
    loan.principalCents > 0
      ? Math.round(
          ((loan.principalCents - loan.outstandingBalanceCents) / loan.principalCents) * 100,
        )
      : 0;

  const handleMakePayment = async () => {
    if (!id || !fromAccountId) return;
    const amountCents = parseToCents(paymentAmount);
    const extraCents = extraPrincipal ? parseToCents(extraPrincipal) : 0;
    if (amountCents <= 0) return;

    try {
      await makePayment.mutateAsync({
        loanId: id,
        amountCents,
        fromAccountId,
        extraPrincipalCents: extraCents > 0 ? extraCents : undefined,
      });
      setPaymentSuccess(true);
      setPaymentAmount("");
      setExtraPrincipal("");
    } catch (err) {
      toast({
        title: t("loanDetail.paymentFailed"),
        description: err instanceof Error ? err.message : t("loanDetail.pleaseTryAgain"),
        variant: "destructive",
      });
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "overview", label: t("loanDetail.tabs.overview") },
    { key: "schedule", label: t("loanDetail.tabs.paymentSchedule") },
    { key: "payments", label: t("loanDetail.tabs.paymentHistory") },
    { key: "make_payment", label: t("loanDetail.tabs.makePayment") },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/accounts">{t("loanDetail.breadcrumbAccounts")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {t("loanDetail.title")} {loan.loanNumberMasked}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Loan header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>{loan.loanNumberMasked}</CardDescription>
              <CardTitle className="text-xl mt-1">{t("loanDetail.title")}</CardTitle>
            </div>
            <Badge
              variant={
                loan.status === "active"
                  ? "secondary"
                  : loan.status === "delinquent"
                    ? "destructive"
                    : "outline"
              }
              className="capitalize"
            >
              {loan.status.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("loanDetail.outstandingBalance")}</p>
              <p className="text-xl font-bold">{formatCurrency(loan.outstandingBalanceCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("loanDetail.originalAmount")}</p>
              <p className="text-xl font-bold">{formatCurrency(loan.principalCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("loanDetail.interestRate")}</p>
              <p className="text-xl font-bold">{formatInterestRate(loan.interestRateBps)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("loanDetail.term")}</p>
              <p className="text-xl font-bold">
                {t("loanDetail.termMonths", { count: loan.termMonths })}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("loanDetail.paidOff", { percent: progressPct })}</span>
              <span>
                {t("loanDetail.paymentsRemaining", { count: loan.paymentsRemaining ?? "—" })}
              </span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Next payment due */}
          {loan.nextPaymentDueDate && loan.nextPaymentAmountCents && (
            <div className="flex items-center gap-3 rounded-md border p-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {t("loanDetail.nextPayment", {
                    amount: formatCurrency(loan.nextPaymentAmountCents),
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("loanDetail.due", { date: formatBankingDate(loan.nextPaymentDueDate) })}
                  {loan.autopayAccountId && (
                    <span className="ml-2 text-green-600">{t("loanDetail.autopayEnabled")}</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {loan.daysPastDue > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <Clock className="h-4 w-4 shrink-0" />
              <p>{t("loanDetail.daysPastDue", { count: loan.daysPastDue })}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPaymentSuccess(false);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("loanDetail.loanDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("loanDetail.principalPaid")}</span>
                <span className="font-medium">{formatCurrency(loan.principalPaidCents)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("loanDetail.interestPaid")}</span>
                <span className="font-medium">{formatCurrency(loan.interestPaidCents)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("loanDetail.firstPayment")}</span>
                <span className="font-medium">
                  {loan.firstPaymentDate ? formatBankingDate(loan.firstPaymentDate) : "—"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("loanDetail.maturityDate")}</span>
                <span className="font-medium">
                  {loan.maturityDate ? formatBankingDate(loan.maturityDate) : "—"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("loanDetail.disbursed")}</span>
                <span className="font-medium">
                  {loan.disbursedAt ? formatBankingDate(loan.disbursedAt) : "—"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("loanDetail.autopay")}</span>
                <span className="font-medium">
                  {loan.autopayAccountId ? t("loanDetail.enabled") : t("loanDetail.notSetUp")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Schedule tab */}
      {activeTab === "schedule" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("loanDetail.paymentSchedule")}</CardTitle>
            <CardDescription>{t("loanDetail.amortizationDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {scheduleLoading ? (
              <div className="flex justify-center py-8" role="status" aria-label="Loading">
                <Spinner />
              </div>
            ) : schedule.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">{t("loanDetail.noSchedule")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left px-4 py-2 font-medium">#</th>
                      <th className="text-left px-4 py-2 font-medium">
                        {t("loanDetail.table.dueDate")}
                      </th>
                      <th className="text-right px-4 py-2 font-medium">
                        {t("loanDetail.table.principal")}
                      </th>
                      <th className="text-right px-4 py-2 font-medium">
                        {t("loanDetail.table.interest")}
                      </th>
                      <th className="text-right px-4 py-2 font-medium">
                        {t("loanDetail.table.total")}
                      </th>
                      <th className="text-center px-4 py-2 font-medium">
                        {t("loanDetail.table.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {schedule.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/50">
                        <td className="px-4 py-2">{item.installmentNumber}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatBankingDate(item.dueDate)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(item.principalCents)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(item.interestCents)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatCurrency(item.totalCents)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge
                            variant={scheduleStatusVariant(item.status)}
                            className="capitalize"
                          >
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment History tab */}
      {activeTab === "payments" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("loanDetail.paymentHistory")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paymentsLoading ? (
              <div className="flex justify-center py-8" role="status" aria-label="Loading">
                <Spinner />
              </div>
            ) : payments.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">{t("loanDetail.noPayments")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left px-4 py-2 font-medium">
                        {t("loanDetail.table.date")}
                      </th>
                      <th className="text-right px-4 py-2 font-medium">
                        {t("loanDetail.table.amount")}
                      </th>
                      <th className="text-right px-4 py-2 font-medium">
                        {t("loanDetail.table.principal")}
                      </th>
                      <th className="text-right px-4 py-2 font-medium">
                        {t("loanDetail.table.interest")}
                      </th>
                      <th className="text-left px-4 py-2 font-medium">
                        {t("loanDetail.table.method")}
                      </th>
                      <th className="text-center px-4 py-2 font-medium">
                        {t("loanDetail.table.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((pmt) => (
                      <tr key={pmt.id} className="hover:bg-muted/50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatBankingDate(pmt.processedAt ?? pmt.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatCurrency(pmt.amountCents)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(pmt.principalPortionCents)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(pmt.interestPortionCents)}
                        </td>
                        <td className="px-4 py-2 capitalize">
                          {pmt.paymentMethod.replace("_", " ")}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge
                            variant={
                              pmt.status === "completed"
                                ? "secondary"
                                : pmt.status === "failed"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="capitalize"
                          >
                            {pmt.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Make a Payment tab */}
      {activeTab === "make_payment" && (
        <Card>
          <CardContent className="py-6">
            {paymentSuccess ? (
              <SuccessAnimation
                title={t("loanDetail.paymentSubmitted")}
                description={t("loanDetail.paymentSubmittedDesc")}
              >
                <Button
                  onClick={() => {
                    setPaymentSuccess(false);
                    setActiveTab("payments");
                  }}
                >
                  {t("loanDetail.viewPaymentHistory")}
                </Button>
              </SuccessAnimation>
            ) : (
              <div className="space-y-6 max-w-md mx-auto">
                <div className="text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <h2 className="text-lg font-semibold">{t("loanDetail.makePayment")}</h2>
                  {loan.nextPaymentAmountCents && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("loanDetail.minimumPayment", {
                        amount: formatCurrency(loan.nextPaymentAmountCents),
                      })}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="pay-from">{t("loanDetail.payFrom")}</Label>
                  <Select value={fromAccountId} onValueChange={setFromAccountId}>
                    <SelectTrigger id="pay-from">
                      <SelectValue placeholder={t("loanDetail.selectAccount")} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acct) => (
                        <SelectItem key={acct.id} value={acct.id}>
                          {acct.nickname ?? acct.type} ({acct.accountNumberMasked}) —{" "}
                          {formatCurrency(acct.availableBalanceCents)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-amount">{t("loanDetail.paymentAmountLabel")}</Label>
                  <Input
                    id="payment-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  {loan.nextPaymentAmountCents && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setPaymentAmount((loan.nextPaymentAmountCents! / 100).toFixed(2))
                      }
                    >
                      {t("loanDetail.useMinimum", {
                        amount: formatCurrency(loan.nextPaymentAmountCents),
                      })}
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="extra-principal">
                    {t("loanDetail.additionalPrincipalLabel")}
                  </Label>
                  <Input
                    id="extra-principal"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={extraPrincipal}
                    onChange={(e) => setExtraPrincipal(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("loanDetail.extraPrincipalHint")}
                  </p>
                </div>

                <Button
                  className="w-full"
                  disabled={
                    !fromAccountId || parseToCents(paymentAmount) <= 0 || makePayment.isPending
                  }
                  onClick={handleMakePayment}
                >
                  {makePayment.isPending ? (
                    <Spinner size="sm" className="mr-2 text-primary-foreground" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {makePayment.isPending
                    ? t("loanDetail.processing")
                    : t("loanDetail.submitPayment")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
