import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Receipt, Plus, Calendar, AlertCircle, CheckCircle2, Clock, X, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/common/currency";
import { formatBankingDate } from "@/lib/common/date";
import { useAccounts } from "@/hooks/useAccounts";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { BillPayPayee, BillPayPayment } from "@/types";

import { getStatusStyle } from "@/lib/common/design-tokens";
import { useErrorHandler } from "@/hooks/useErrorHandler";

const statusConfig: Record<string, { icon: React.ElementType; label: string }> = {
  scheduled: { icon: Clock, label: "Scheduled" },
  processing: { icon: Clock, label: "Processing" },
  paid: { icon: CheckCircle2, label: "Paid" },
  failed: { icon: AlertCircle, label: "Failed" },
  cancelled: { icon: X, label: "Cancelled" },
};

// ---------------------------------------------------------------------------
// Hooks (adapter-backed)
// ---------------------------------------------------------------------------

const billpayKeys = {
  payees: () => ["billpay", "payees"] as const,
  payments: (params?: Record<string, unknown>) => ["billpay", "payments", params] as const,
  billers: (query: string) => ["billpay", "billers", query] as const,
  ebills: () => ["billpay", "ebills"] as const,
};

function usePayees() {
  return useQuery({
    queryKey: billpayKeys.payees(),
    queryFn: () => gateway.billpay.listPayees(),
  });
}

function usePayments(params: { status?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: billpayKeys.payments(params as Record<string, unknown>),
    queryFn: () => gateway.billpay.listPayments(params),
  });
}

function useSearchBillers(query: string) {
  return useQuery({
    queryKey: billpayKeys.billers(query),
    queryFn: () => gateway.billpay.searchBillers({ query }),
    enabled: query.length >= 2,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BillPay() {
  const { t } = useTranslation("banking");
  const [showAddPayee, setShowAddPayee] = useState(false);
  const [billerSearch, setBillerSearch] = useState("");
  const [selectedBillerId, setSelectedBillerId] = useState<string | null>(null);
  const [enrollAccount, setEnrollAccount] = useState("");

  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.accounts ?? [];
  const defaultAccountId = accounts[0]?.id ?? "";

  const { data: payeesData, isLoading: payeesLoading, error: payeesError } = usePayees();
  const { data: paymentsData } = usePayments({ limit: 20 });
  const { data: billersData } = useSearchBillers(billerSearch);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  const enrollPayee = useMutation({
    mutationFn: (input: { billerId: string; accountNumber: string; nickname?: string }) =>
      gateway.billpay.enrollPayee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billpayKeys.payees() });
      setShowAddPayee(false);
      setBillerSearch("");
      setSelectedBillerId(null);
      setEnrollAccount("");
      toast({ title: t("billPay.payeeEnrolled"), description: t("billPay.payeeEnrolledDesc") });
    },
    onError: (err) => {
      handleError(err, { fallbackTitle: "Enrollment failed" });
    },
  });

  const schedulePayment = useMutation({
    mutationFn: (input: {
      payeeId: string;
      fromAccountId: string;
      amountCents: number;
      scheduledDate: string;
    }) => gateway.billpay.schedulePayment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billpayKeys.payments() });
      queryClient.invalidateQueries({ queryKey: billpayKeys.payees() });
      toast({
        title: t("billPay.paymentScheduled"),
        description: t("billPay.paymentScheduledDesc"),
      });
    },
    onError: (err) => {
      handleError(err, { fallbackTitle: "Payment failed" });
    },
  });

  const payees: BillPayPayee[] = (payeesData as { payees?: BillPayPayee[] })?.payees ?? [];
  const payments: BillPayPayment[] =
    (paymentsData as { payments?: BillPayPayment[] })?.payments ?? [];
  const billers = billersData?.billers ?? [];

  const upcomingPayees = payees.filter((p) => p.nextDueDate);
  const totalUpcomingCents = upcomingPayees.reduce(
    (sum, p) => sum + (p.nextAmountDueCents ?? 0),
    0,
  );

  const handleEnrollPayee = () => {
    if (!selectedBillerId || !enrollAccount) return;
    enrollPayee.mutate({ billerId: selectedBillerId, accountNumber: enrollAccount });
  };

  if (payeesLoading) {
    return <PageSkeleton />;
  }

  if (payeesError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">{t("billPay.failedToLoad")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {payeesError instanceof Error ? payeesError.message : "An unexpected error occurred."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("billPay.title")}</h1>
          <p className="text-muted-foreground">{t("billPay.subtitle")}</p>
        </div>
        <Button onClick={() => setShowAddPayee(!showAddPayee)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("billPay.addPayee")}
        </Button>
      </div>

      {/* Add payee form — searches biller directory via adapter */}
      {showAddPayee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("billPay.enrollNewPayee")}</CardTitle>
            <CardDescription>{t("billPay.searchBillersDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="biller-search">{t("billPay.searchBillers")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="biller-search"
                  placeholder={t("billPay.searchBillersPlaceholder")}
                  value={billerSearch}
                  onChange={(e) => {
                    setBillerSearch(e.target.value);
                    setSelectedBillerId(null);
                  }}
                  className="pl-10"
                />
              </div>
              {billers.length > 0 && !selectedBillerId && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {billers.map((b) => (
                    <button
                      key={b.billerId}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center"
                      onClick={() => {
                        setSelectedBillerId(b.billerId);
                        setBillerSearch(b.name);
                      }}
                    >
                      <span className="font-medium">{b.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {b.category}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedBillerId && (
              <div className="space-y-2">
                <Label htmlFor="enroll-account">{t("billPay.yourAccountNumber")}</Label>
                <Input
                  id="enroll-account"
                  placeholder="e.g. 1234567890"
                  value={enrollAccount}
                  onChange={(e) => setEnrollAccount(e.target.value)}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                disabled={!selectedBillerId || !enrollAccount || enrollPayee.isPending}
                onClick={handleEnrollPayee}
              >
                {enrollPayee.isPending ? t("billPay.enrolling") : t("billPay.enrollPayee")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddPayee(false);
                  setBillerSearch("");
                  setSelectedBillerId(null);
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("billPay.upcomingBills")}
          </CardTitle>
          <Receipt className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatCurrency(totalUpcomingCents)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {upcomingPayees.length} payees with upcoming bills
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="payees">
        <TabsList>
          <TabsTrigger value="payees">{t("billPay.enrolledPayees")}</TabsTrigger>
          <TabsTrigger value="payments">{t("billPay.recentPayments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="payees" className="space-y-4 mt-4">
          {payees.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={t("billPay.noPayeesEnrolled")}
              description={t("billPay.noPayeesEnrolledDesc")}
              action={{ label: t("billPay.addPayee"), onClick: () => setShowAddPayee(true) }}
            />
          ) : (
            payees.map((payee) => (
              <Card key={payee.payeeId}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-2 bg-risk-medium-light text-risk-medium">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{payee.billerName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{payee.accountNumberMasked}</span>
                        {payee.nextDueDate && (
                          <>
                            <Calendar className="h-3 w-3" />
                            <span>Due {formatBankingDate(payee.nextDueDate)}</span>
                          </>
                        )}
                        {payee.autopayEnabled && (
                          <Badge variant="secondary" className="text-[10px] py-0">
                            Autopay
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {payee.nextAmountDueCents != null && (
                      <p className="font-bold text-lg">
                        {formatCurrency(payee.nextAmountDueCents)}
                      </p>
                    )}
                    <Button
                      size="sm"
                      disabled={
                        schedulePayment.isPending || !payee.nextAmountDueCents || !defaultAccountId
                      }
                      onClick={() => {
                        schedulePayment.mutate({
                          payeeId: payee.payeeId,
                          fromAccountId: defaultAccountId,
                          amountCents: payee.nextAmountDueCents ?? 0,
                          scheduledDate: new Date().toISOString().split("T")[0],
                        });
                      }}
                    >
                      {t("billPay.payNow")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 mt-4">
          {payments.length === 0 ? (
            <EmptyState
              icon={Clock}
              title={t("billPay.noRecentPayments")}
              description={t("billPay.noRecentPaymentsDesc")}
            />
          ) : (
            payments.map((payment) => {
              const config = statusConfig[payment.status] ?? statusConfig.scheduled;
              const StatusIcon = config.icon;
              const statusStyle = getStatusStyle(payment.status);
              return (
                <Card key={payment.paymentId}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-full p-2 ${statusStyle.icon}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{t("billPay.payment")}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.paidAt
                            ? formatBankingDate(payment.paidAt.split("T")[0])
                            : formatBankingDate(payment.scheduledDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-muted-foreground">
                        {formatCurrency(payment.amountCents)}
                      </p>
                      <Badge variant="secondary" className="capitalize">
                        {config.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
