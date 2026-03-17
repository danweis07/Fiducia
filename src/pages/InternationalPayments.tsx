import { useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  Globe,
  ArrowRightLeft,
  CreditCard,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/common/currency";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { getStatusStyle } from "@/lib/common/design-tokens";
import {
  useInternationalPayments,
  useInternationalCoverage,
  useGlobalCards,
  useInternationalPayouts,
  useInternationalBillPayments,
  useInternationalBillPayCountries,
} from "@/hooks/useInternationalPayments";
import type {
  InternationalPayment,
  GlobalIssuedCard,
  InternationalPayout,
  InternationalBillPayment,
  CountryCoverage,
} from "@/types";

const paymentStatusConfig: Record<string, { icon: React.ElementType; label: string }> = {
  pending: { icon: Clock, label: "Pending" },
  processing: { icon: RefreshCw, label: "Processing" },
  requires_action: { icon: AlertCircle, label: "Action Required" },
  completed: { icon: CheckCircle2, label: "Completed" },
  failed: { icon: AlertCircle, label: "Failed" },
  cancelled: { icon: AlertCircle, label: "Cancelled" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InternationalPayments() {
  const { t } = useTranslation('banking');
  const [activeTab, setActiveTab] = useState("payments");
  const [regionFilter] = useState<string>("");

  const { data: paymentsData, isLoading: paymentsLoading } = useInternationalPayments();
  const { data: coverageData, isLoading: coverageLoading } = useInternationalCoverage(regionFilter || undefined);
  const { data: cardsData, isLoading: cardsLoading } = useGlobalCards();
  const { data: payoutsData } = useInternationalPayouts();
  const { data: billPayData } = useInternationalBillPayments();
  useInternationalBillPayCountries();

  if (paymentsLoading && cardsLoading) return <PageSkeleton />;

  const payments = (paymentsData ?? []) as InternationalPayment[];
  const cards = (cardsData ?? []) as GlobalIssuedCard[];
  const payouts = (payoutsData ?? []) as InternationalPayout[];
  const billPayments = (billPayData ?? []) as InternationalBillPayment[];
  const countries = coverageData?.countries ?? ([] as CountryCoverage[]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-6 w-6" />
            {t('internationalPayments.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('internationalPayments.subtitle')}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('internationalPayments.activePayments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter(p => p.status === "processing" || p.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('internationalPayments.globalCards')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('internationalPayments.pendingPayouts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payouts.filter(p => p.status === "pending" || p.status === "processing").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('internationalPayments.countriesCovered')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countries.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payments">
            <Send className="h-4 w-4 mr-1" /> {t('internationalPayments.payments')}
          </TabsTrigger>
          <TabsTrigger value="cards">
            <CreditCard className="h-4 w-4 mr-1" /> {t('internationalPayments.cards')}
          </TabsTrigger>
          <TabsTrigger value="payouts">
            <ArrowRightLeft className="h-4 w-4 mr-1" /> {t('internationalPayments.payouts')}
          </TabsTrigger>
          <TabsTrigger value="billpay">
            <Globe className="h-4 w-4 mr-1" /> {t('internationalPayments.billPay')}
          </TabsTrigger>
          <TabsTrigger value="coverage">
            <Globe className="h-4 w-4 mr-1" /> {t('internationalPayments.coverage')}
          </TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('internationalPayments.recentPayments')}</CardTitle>
              <CardDescription>{t('internationalPayments.recentPaymentsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <EmptyState
                  icon={Send}
                  title={t('internationalPayments.noPayments')}
                  description={t('internationalPayments.noPaymentsDesc')}
                />
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => {
                    const statusInfo = paymentStatusConfig[payment.status] ?? paymentStatusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <StatusIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{payment.beneficiaryName}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {payment.beneficiaryCountry}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(payment.fromAmountCents)} {payment.fromCurrency}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              &rarr; {formatCurrency(payment.toAmountCents)} {payment.toCurrency}
                            </div>
                          </div>
                          <Badge variant="outline" className={getStatusStyle(payment.status)}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cards Tab */}
        <TabsContent value="cards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('internationalPayments.globallyIssuedCards')}</CardTitle>
              <CardDescription>{t('internationalPayments.globallyIssuedCardsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {cards.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title={t('internationalPayments.noGlobalCards')}
                  description={t('internationalPayments.noGlobalCardsDesc')}
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {cards.map((card) => (
                    <Card key={card.cardId} className="border">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{card.cardholderName}</span>
                          <Badge variant="outline" className={getStatusStyle(card.status)}>
                            {card.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {card.type} &middot; {card.currency} &middot; {card.country}
                        </div>
                        <div className="text-sm mt-1">
                          {t('internationalPayments.spendLimit')}: {formatCurrency(card.spendLimitCents)} {card.currency}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('internationalPayments.internationalPayouts')}</CardTitle>
              <CardDescription>{t('internationalPayments.internationalPayoutsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <EmptyState
                  icon={ArrowRightLeft}
                  title={t('internationalPayments.noPayouts')}
                  description={t('internationalPayments.noPayoutsDesc')}
                />
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div key={payout.payoutId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{payout.recipientName}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {payout.destinationCountry} &middot; {payout.rail}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">
                          {formatCurrency(payout.amountCents)} {payout.destinationCurrency}
                        </span>
                        <Badge variant="outline" className={getStatusStyle(payout.status)}>
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* International Bill Pay Tab */}
        <TabsContent value="billpay" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('internationalPayments.internationalBillPayments')}</CardTitle>
              <CardDescription>{t('internationalPayments.internationalBillPaymentsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {billPayments.length === 0 ? (
                <EmptyState
                  icon={Globe}
                  title={t('internationalPayments.noBillPayments')}
                  description={t('internationalPayments.noBillPaymentsDesc')}
                />
              ) : (
                <div className="space-y-3">
                  {billPayments.map((bp) => (
                    <div key={bp.paymentId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{bp.billerName}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {bp.billerCountry} &middot; {bp.rail}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(bp.fromAmountCents)} {bp.fromCurrency}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            &rarr; {formatCurrency(bp.toAmountCents)} {bp.toCurrency}
                          </div>
                        </div>
                        <Badge variant="outline" className={getStatusStyle(bp.status)}>
                          {bp.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('internationalPayments.countryCoverage')}</CardTitle>
              <CardDescription>{t('internationalPayments.countryCoverageDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {coverageLoading ? (
                <PageSkeleton />
              ) : countries.length === 0 ? (
                <EmptyState
                  icon={Globe}
                  title={t('internationalPayments.noCoverageData')}
                  description={t('internationalPayments.noCoverageDataDesc')}
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {countries.map((country) => (
                    <Card key={country.countryCode} className="border">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{country.countryName}</span>
                          <Badge variant="outline">{country.currencyCode}</Badge>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {country.supportsPaymentAcceptance && (
                            <Badge variant="secondary" className="text-xs">Acceptance</Badge>
                          )}
                          {country.supportsPayouts && (
                            <Badge variant="secondary" className="text-xs">Payouts</Badge>
                          )}
                          {country.supportsCardIssuing && (
                            <Badge variant="secondary" className="text-xs">Card Issuing</Badge>
                          )}
                        </div>
                        {country.localPaymentMethods.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-2">
                            {t('internationalPayments.rails')}: {country.localPaymentMethods.join(", ")}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
