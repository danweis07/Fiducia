import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, BarChart3, Vault, Plus, ArrowRight, Wallet, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useCashFlowForecast } from "@/hooks/useCashFlow";
import { useTreasuryVaults, useCreateTreasuryVault, useCloseTreasuryVault, useTreasurySummary } from "@/hooks/useTreasury";
import { useAccounts } from "@/hooks/useAccounts";
import { useToast } from "@/hooks/use-toast";
import type { CashFlowInsight, TreasuryVault } from "@/types";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/**
 * Treasury provider options with APY sourced from the treasury summary.
 * TODO: Fetch live APY rates from the treasury.providers endpoint once available.
 */
const TREASURY_PROVIDERS = [
  { value: "column", label: "Column" },
  { value: "increase", label: "Increase" },
  { value: "stripe_treasury", label: "Stripe Treasury" },
  { value: "mercury", label: "Mercury" },
] as const;

const INSIGHT_ICONS = {
  warning: AlertTriangle,
  opportunity: Lightbulb,
  info: Info,
};

const INSIGHT_COLORS = {
  warning: "border-yellow-300 bg-yellow-50/50",
  opportunity: "border-green-300 bg-green-50/50",
  info: "border-blue-300 bg-blue-50/50",
};

export default function LiquidityDashboardPage() {
  const { t } = useTranslation('banking');
  const { toast } = useToast();
  const { data: forecastData, isLoading: forecastLoading } = useCashFlowForecast(undefined, 30);
  const forecast = forecastData?.forecast;
  const { data: treasuryData } = useTreasurySummary();
  const treasurySummary = treasuryData?.summary;
  const { data: vaultsData } = useTreasuryVaults();
  const vaults = vaultsData?.vaults ?? [];
  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.accounts ?? [];

  const createVault = useCreateTreasuryVault();
  const closeVault = useCloseTreasuryVault();

  const [vaultDialogOpen, setVaultDialogOpen] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const [vaultAccountId, setVaultAccountId] = useState("");
  const [vaultProvider, setVaultProvider] = useState("column");
  const [vaultDeposit, setVaultDeposit] = useState("");

  const handleCreateVault = () => {
    if (!vaultName || !vaultAccountId) {
      toast({ title: t('liquidityDashboard.nameAndAccountRequired'), variant: "destructive" });
      return;
    }
    createVault.mutate(
      {
        name: vaultName,
        linkedAccountId: vaultAccountId,
        providerName: vaultProvider,
        initialDepositCents: vaultDeposit ? Math.round(parseFloat(vaultDeposit) * 100) : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: t('liquidityDashboard.vaultCreated'), description: t('liquidityDashboard.vaultCreatedDesc', { name: vaultName }) });
          setVaultDialogOpen(false);
          setVaultName("");
          setVaultDeposit("");
        },
      }
    );
  };

  // Build mini chart from forecast data points
  const dataPoints = forecast?.dataPoints ?? [];
  const maxBalance = Math.max(...dataPoints.map(d => d.balanceCents), 1);

  return (
    <AppShell>
      <div className="container mx-auto max-w-6xl py-6 px-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            {t('liquidityDashboard.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('liquidityDashboard.subtitle')}
          </p>
        </div>

        {/* Cash Flow Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('liquidityDashboard.currentBalance')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(forecast?.currentBalanceCents ?? 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('liquidityDashboard.projected30d')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(forecast?.projectedBalanceCents ?? 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('liquidityDashboard.avgDailyInflow')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(forecast?.avgDailyInflowCents ?? 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={(forecast?.runwayDays ?? 999) < 60 ? "border-yellow-300" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(forecast?.runwayDays ?? 999) < 60 ? "bg-yellow-100" : "bg-gray-100"}`}>
                  <TrendingDown className={`w-5 h-5 ${(forecast?.runwayDays ?? 999) < 60 ? "text-yellow-600" : "text-gray-600"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('liquidityDashboard.cashRunway')}</p>
                  <p className="text-2xl font-bold">{(forecast?.runwayDays ?? 0) >= 999 ? t('liquidityDashboard.infinite') : `${forecast?.runwayDays}d`}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Chart (simplified bar chart) */}
        <Card>
          <CardHeader>
            <CardTitle>{t('liquidityDashboard.cashFlowForecast')}</CardTitle>
            <CardDescription>
              {t('liquidityDashboard.cashFlowForecastDesc', { date: forecast?.projectedDate ?? "--", amount: formatCurrency(forecast?.projectedBalanceCents ?? 0) })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forecastLoading ? (
              <div className="text-center py-12 text-muted-foreground">{t('liquidityDashboard.analyzingHistory')}</div>
            ) : (
              <>
                <div className="flex items-end gap-px h-40">
                  {dataPoints.filter((_, i) => i % 2 === 0).map((point, idx) => {
                    const height = Math.max(2, (point.balanceCents / maxBalance) * 100);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end" title={`${point.date}: ${formatCurrency(point.balanceCents)}`}>
                        <div
                          className={`w-full rounded-t-sm ${point.isProjected ? "bg-primary/30" : "bg-primary"}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{t('liquidityDashboard.thirtyDaysAgo')}</span>
                  <span className="font-medium">{t('liquidityDashboard.today')}</span>
                  <span>{t('liquidityDashboard.thirtyDaysProjected')}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        {forecast?.insights && forecast.insights.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{t('liquidityDashboard.aiInsights')}</h2>
            {forecast.insights.map((insight: CashFlowInsight, idx: number) => {
              const Icon = INSIGHT_ICONS[insight.type];
              return (
                <Card key={idx} className={INSIGHT_COLORS[insight.type]}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      </div>
                      {insight.actionLabel && insight.actionRoute && (
                        <Link to={insight.actionRoute}>
                          <Button size="sm" variant="outline">
                            {insight.actionLabel} <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Treasury Vaults */}
        <Tabs defaultValue="vaults">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="vaults">{t('liquidityDashboard.treasuryVaults')}</TabsTrigger>
              <TabsTrigger value="upcoming">{t('liquidityDashboard.upcomingObligations')}</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => { setVaultName(""); setVaultDeposit(""); setVaultDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> {t('liquidityDashboard.openVault')}
            </Button>
          </div>

          <TabsContent value="vaults">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Vault className="w-5 h-5" /> {t('liquidityDashboard.treasuryVaults')}
                    </CardTitle>
                    <CardDescription>{t('liquidityDashboard.treasuryVaultsDesc')}</CardDescription>
                  </div>
                  {treasurySummary && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{formatBps(treasurySummary.weightedAvgApyBps)} {t('liquidityDashboard.apy')}</p>
                      <p className="text-sm text-muted-foreground">{t('liquidityDashboard.deposited', { amount: formatCurrency(treasurySummary.totalVaultBalanceCents) })}</p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {vaults.length === 0 ? (
                  <div className="text-center py-12">
                    <Vault className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                    <h3 className="text-lg font-semibold">{t('liquidityDashboard.noVaultsYet')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('liquidityDashboard.noVaultsYetDesc')}
                    </p>
                    <Button className="mt-4" onClick={() => setVaultDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> {t('liquidityDashboard.openFirstVault')}
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('liquidityDashboard.vault')}</TableHead>
                        <TableHead>{t('liquidityDashboard.provider')}</TableHead>
                        <TableHead>{t('liquidityDashboard.balance')}</TableHead>
                        <TableHead>{t('liquidityDashboard.apy')}</TableHead>
                        <TableHead>{t('liquidityDashboard.interestEarned')}</TableHead>
                        <TableHead>{t('liquidityDashboard.status')}</TableHead>
                        <TableHead className="text-right">{t('liquidityDashboard.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vaults.map((vault: TreasuryVault) => (
                        <TableRow key={vault.id}>
                          <TableCell className="font-medium">{vault.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{vault.providerName}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(vault.balanceCents)}</TableCell>
                          <TableCell className="text-green-600 font-medium">{formatBps(vault.apyBps)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(vault.accruedInterestCents)}</TableCell>
                          <TableCell>
                            <Badge variant={vault.status === "active" ? "default" : "secondary"}>{vault.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {vault.status === "active" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => closeVault.mutate(vault.id, {
                                  onSuccess: () => toast({ title: t('liquidityDashboard.vaultClosed'), description: t('liquidityDashboard.vaultClosedDesc') }),
                                })}
                              >
                                {t('liquidityDashboard.close')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>{t('liquidityDashboard.upcomingCashObligations')}</CardTitle>
                <CardDescription>{t('liquidityDashboard.upcomingCashObligationsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-muted/20">
                    <p className="text-sm text-muted-foreground">{t('liquidityDashboard.estPayroll')}</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(forecast?.upcomingPayrollCents ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('liquidityDashboard.estPayrollBasis')}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/20">
                    <p className="text-sm text-muted-foreground">{t('liquidityDashboard.estRecurringBills')}</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(forecast?.upcomingBillsCents ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('liquidityDashboard.estRecurringBillsBasis')}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/20">
                    <p className="text-sm text-muted-foreground">{t('liquidityDashboard.avgDailyOutflow')}</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(forecast?.avgDailyOutflowCents ?? 0)}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted/20">
                    <p className="text-sm text-muted-foreground">{t('liquidityDashboard.netDailyChange')}</p>
                    <p className="text-xl font-bold mt-1">
                      {formatCurrency((forecast?.avgDailyInflowCents ?? 0) - (forecast?.avgDailyOutflowCents ?? 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Vault Dialog */}
        <Dialog open={vaultDialogOpen} onOpenChange={setVaultDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('liquidityDashboard.openTreasuryVault')}</DialogTitle>
              <DialogDescription>
                {t('liquidityDashboard.openTreasuryVaultDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('liquidityDashboard.vaultName')}</Label>
                <Input placeholder={t('liquidityDashboard.vaultNamePlaceholder')} value={vaultName} onChange={(e) => setVaultName(e.target.value)} />
              </div>
              <div>
                <Label>{t('liquidityDashboard.linkToAccount')}</Label>
                <Select value={vaultAccountId} onValueChange={setVaultAccountId}>
                  <SelectTrigger><SelectValue placeholder={t('liquidityDashboard.selectAccount')} /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('liquidityDashboard.provider')}</Label>
                  <Select value={vaultProvider} onValueChange={setVaultProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TREASURY_PROVIDERS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('liquidityDashboard.initialDeposit')}</Label>
                  <Input type="number" placeholder="10000" value={vaultDeposit} onChange={(e) => setVaultDeposit(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVaultDialogOpen(false)}>{t('liquidityDashboard.cancel')}</Button>
              <Button onClick={handleCreateVault} disabled={createVault.isPending}>
                {createVault.isPending ? t('liquidityDashboard.creating') : t('liquidityDashboard.openVault')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
