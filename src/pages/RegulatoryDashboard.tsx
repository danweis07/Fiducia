import { useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Leaf,
  Receipt,
  Building,
  TrendingDown,
  Info,
  ExternalLink,
  TreePine,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/AppShell";
import { formatCurrencyIntl } from "@/lib/common/currency";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useSafeguarding,
  useInterestWithholding,
  useCarbonSummary,
} from "@/hooks/useRegulatory";
import type { SafeguardingInfo, InterestWithholdingEntry, CarbonSummary } from "@/types";

const carbonRatingColors: Record<string, string> = {
  excellent: "text-green-600 bg-green-100 dark:bg-green-900",
  good: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900",
  average: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900",
  above_average: "text-orange-600 bg-orange-100 dark:bg-orange-900",
  high: "text-red-600 bg-red-100 dark:bg-red-900",
};

export default function RegulatoryDashboard() {
  const { t } = useTranslation('banking');
  const [activeTab, setActiveTab] = useState("safeguarding");

  const { data: safeguardingData, isLoading: sgLoading } = useSafeguarding();
  const { data: withholdingData, isLoading: whLoading } = useInterestWithholding();
  const { data: carbonData, isLoading: carbonLoading } = useCarbonSummary("2026-01-01", "2026-03-31");

  if (sgLoading && whLoading && carbonLoading) return <AppShell><PageSkeleton /></AppShell>;

  const safeguardingItems = safeguardingData?.safeguarding ?? [];
  const withholdingEntries = withholdingData?.entries ?? [];
  const carbon = carbonData as CarbonSummary | undefined;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {t('regulatory.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('regulatory.subtitle')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="safeguarding">
              <Building className="h-4 w-4 mr-2" /> {t('regulatory.tabs.safeguarding')}
            </TabsTrigger>
            <TabsTrigger value="withholding">
              <Receipt className="h-4 w-4 mr-2" /> {t('regulatory.tabs.taxWithholding')}
            </TabsTrigger>
            <TabsTrigger value="carbon">
              <Leaf className="h-4 w-4 mr-2" /> {t('regulatory.tabs.carbonTracker')}
            </TabsTrigger>
          </TabsList>

          {/* Safeguarding Tab */}
          <TabsContent value="safeguarding">
            <div className="space-y-4">
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <CardContent className="pt-4 flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold">{t('regulatory.safeguarding.fundsProtected')}</p>
                    <p className="text-muted-foreground mt-1">
                      {t('regulatory.safeguarding.fundsProtectedDesc')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {sgLoading ? (
                <PageSkeleton />
              ) : safeguardingItems.length === 0 ? (
                <EmptyState icon={Building} title={t('regulatory.safeguarding.noData')} description={t('regulatory.safeguarding.noDataDesc')} />
              ) : (
                <div className="space-y-3">
                  {safeguardingItems.map((item: SafeguardingInfo) => (
                    <Card key={`${item.country}-${item.custodianName}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Shield className="h-5 w-5 text-green-600" />
                              <p className="font-semibold">{item.custodianName}</p>
                              <Badge variant="outline">{item.country}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{item.custodianType}</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mt-2">
                              <div>
                                <span className="text-muted-foreground">{t('regulatory.safeguarding.protectionScheme')}:</span>
                                <p className="font-medium">{item.protectionScheme}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('regulatory.safeguarding.protectionLimit')}:</span>
                                <p className="font-bold text-green-600">{item.protectionLimit}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('regulatory.safeguarding.regulator')}:</span>
                                <p className="font-medium">{item.regulatoryBody}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t('regulatory.safeguarding.lastAudit')}:</span>
                                <p className="font-medium">{new Date(item.lastAuditDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {item.certificateUrl && (
                              <a
                                href={item.certificateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                              >
                                {t('regulatory.safeguarding.viewRegistration')} <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Withholding Tab */}
          <TabsContent value="withholding">
            <div className="space-y-4">
              {/* Summary Cards */}
              {withholdingData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">{t('regulatory.withholding.grossInterest')}</p>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrencyIntl(withholdingData.totalGrossInterestCents, "USD")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-red-200">
                    <CardContent className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">{t('regulatory.withholding.taxWithheld')}</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">
                        {formatCurrencyIntl(withholdingData.totalTaxWithheldCents, "USD")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200">
                    <CardContent className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">{t('regulatory.withholding.netInterest')}</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {formatCurrencyIntl(withholdingData.totalNetInterestCents, "USD")}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {whLoading ? (
                <PageSkeleton />
              ) : withholdingEntries.length === 0 ? (
                <EmptyState icon={Receipt} title={t('regulatory.withholding.noEntries')} description={t('regulatory.withholding.noEntriesDesc')} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('regulatory.withholding.ledgerTitle')}</CardTitle>
                    <CardDescription>{t('regulatory.withholding.ledgerDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium text-muted-foreground">{t('regulatory.withholding.period')}</th>
                            <th className="text-left py-2 font-medium text-muted-foreground">{t('regulatory.withholding.jurisdiction')}</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">{t('regulatory.withholding.gross')}</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">{t('regulatory.withholding.taxWithheldColumn')}</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">{t('regulatory.withholding.net')}</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">{t('regulatory.withholding.rate')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {withholdingEntries.map((entry: InterestWithholdingEntry) => (
                            <tr key={entry.entryId} className="border-b last:border-0">
                              <td className="py-2">
                                {new Date(entry.periodStart).toLocaleDateString()} – {new Date(entry.periodEnd).toLocaleDateString()}
                              </td>
                              <td className="py-2">
                                <div className="flex items-center gap-1">
                                  <span>{entry.jurisdiction}</span>
                                  <Badge variant="outline" className="text-xs">{entry.currency}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{entry.taxAuthority}</p>
                              </td>
                              <td className="py-2 text-right font-medium">{formatCurrencyIntl(entry.grossInterestCents, entry.currency)}</td>
                              <td className="py-2 text-right text-red-600">{formatCurrencyIntl(entry.taxWithheldCents, entry.currency)}</td>
                              <td className="py-2 text-right font-medium text-green-600">{formatCurrencyIntl(entry.netInterestCents, entry.currency)}</td>
                              <td className="py-2 text-right">{(entry.withholdingRateBps / 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Carbon Tracker Tab */}
          <TabsContent value="carbon">
            <div className="space-y-4">
              {carbonLoading ? (
                <PageSkeleton />
              ) : !carbon ? (
                <EmptyState icon={Leaf} title={t('regulatory.carbon.noData')} description={t('regulatory.carbon.noDataDesc')} />
              ) : (
                <>
                  {/* Carbon Score Card */}
                  <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Leaf className="h-6 w-6 text-green-600" />
                          <p className="text-sm text-muted-foreground">{t('regulatory.carbon.footprintLabel')}</p>
                        </div>
                        <p className="text-4xl font-bold">{t('regulatory.carbon.kgCO2', { value: carbon.totalCarbonKg.toFixed(1) })}</p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Badge className={carbonRatingColors[carbon.rating] ?? ""}>
                            {carbon.rating.replace("_", " ").toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {carbon.monthOverMonthChange < 0 ? (
                              <span className="text-green-600 flex items-center gap-0.5">
                                <TrendingDown className="h-3 w-3" /> {t('regulatory.carbon.vsLastPeriod', { percent: Math.abs(carbon.monthOverMonthChange) })}
                              </span>
                            ) : (
                              <span className="text-red-600">{t('regulatory.carbon.vsLastPeriodUp', { percent: carbon.monthOverMonthChange })}</span>
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {t('regulatory.carbon.countryAverage', { avg: carbon.countryAvgKg.toFixed(0), percent: ((carbon.totalCarbonKg / carbon.countryAvgKg) * 100).toFixed(0) })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-sm text-muted-foreground">{t('regulatory.carbon.transactionsTracked')}</p>
                        <p className="text-2xl font-bold mt-1">{carbon.transactionCount}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-sm text-muted-foreground">{t('regulatory.carbon.avgPerTransaction')}</p>
                        <p className="text-2xl font-bold mt-1">{t('regulatory.carbon.kgValue', { value: carbon.avgCarbonPerTransaction.toFixed(1) })}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TreePine className="h-4 w-4 text-green-600" />
                          <p className="text-sm text-muted-foreground">{t('regulatory.carbon.offsetCost')}</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">{formatCurrencyIntl(carbon.offsetCostCents, carbon.offsetCurrency)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top Categories */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('regulatory.carbon.emissionsByCategory')}</CardTitle>
                      <CardDescription>
                        {t('regulatory.carbon.emissionsByCategoryDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {carbon.topCategories.map((cat) => (
                          <div key={cat.category} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{cat.category}</span>
                              <span>{cat.carbonKg.toFixed(1)} kg ({cat.percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
