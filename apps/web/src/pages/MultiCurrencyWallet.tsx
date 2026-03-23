import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Wallet, Plus, ArrowRightLeft, Copy, Globe, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { formatCurrencyIntl } from "@/lib/common/currency";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useCurrencyPots,
  useCreateCurrencyPot,
  useGenerateVIBAN,
  useSwapQuote,
  useExecuteSwap,
  useSwapHistory,
} from "@/hooks/useMultiCurrency";
import type { CurrencyPot, FXSwap } from "@/types";

const currencyFlags: Record<string, string> = {
  USD: "🇺🇸",
  GBP: "🇬🇧",
  EUR: "🇪🇺",
  BRL: "🇧🇷",
  INR: "🇮🇳",
  SGD: "🇸🇬",
  AUD: "🇦🇺",
  CAD: "🇨🇦",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
  MXN: "🇲🇽",
  SEK: "🇸🇪",
};

/** Map currency code to the primary country code for VIBAN generation */
const currencyCountryMap: Record<string, string> = {
  USD: "US",
  GBP: "GB",
  EUR: "DE",
  BRL: "BR",
  INR: "IN",
  SGD: "SG",
  AUD: "AU",
  CAD: "CA",
  JPY: "JP",
  CHF: "CH",
  MXN: "MX",
  SEK: "SE",
};

function currencyToCountry(currency: string): string {
  return currencyCountryMap[currency] ?? "US";
}

export default function MultiCurrencyWallet() {
  const [activeTab, setActiveTab] = useState("pots");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [newCurrency, setNewCurrency] = useState("EUR");
  const [fromPotId, setFromPotId] = useState("");
  const [toPotId, setToPotId] = useState("");
  const [swapAmount, setSwapAmount] = useState("");

  const { t } = useTranslation("banking");
  const { toast } = useToast();
  const { data: potsData, isLoading: potsLoading } = useCurrencyPots();
  const { data: swapsData, isLoading: swapsLoading } = useSwapHistory();
  const createPot = useCreateCurrencyPot();
  const generateVIBAN = useGenerateVIBAN();
  const executeSwap = useExecuteSwap();

  const swapAmountCents = Math.round((parseFloat(swapAmount) || 0) * 100);
  const { data: quoteData } = useSwapQuote(fromPotId, toPotId, swapAmountCents);

  if (potsLoading)
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );

  const pots = potsData?.pots ?? [];
  const swaps = swapsData?.swaps ?? [];
  const totalBalanceUSD = pots.reduce((sum: number, p: CurrencyPot) => {
    const fxEstimate: Record<string, number> = {
      USD: 1,
      GBP: 1.265,
      EUR: 1.085,
      BRL: 0.2,
      INR: 0.012,
      SGD: 0.75,
      AUD: 0.65,
    };
    return sum + Math.round(p.balanceCents * (fxEstimate[p.currency] ?? 0.5));
  }, 0);

  function handleCreatePot() {
    createPot.mutate(
      { currency: newCurrency },
      {
        onSuccess: () => {
          toast({
            title: t("multiCurrencyWallet.potCreated"),
            description: t("multiCurrencyWallet.potCreatedDesc", { currency: newCurrency }),
          });
          setShowCreateDialog(false);
        },
        onError: () =>
          toast({ title: t("multiCurrencyWallet.failedToCreatePot"), variant: "destructive" }),
      },
    );
  }

  function handleGenerateVIBAN(potId: string, country: string) {
    generateVIBAN.mutate(
      { potId, country },
      {
        onSuccess: (data) => {
          toast({
            title: t("multiCurrencyWallet.vibanGenerated"),
            description: t("multiCurrencyWallet.vibanGeneratedDesc", { iban: data.viban.iban }),
          });
        },
        onError: () =>
          toast({ title: t("multiCurrencyWallet.failedToGenerateViban"), variant: "destructive" }),
      },
    );
  }

  function handleExecuteSwap() {
    if (!quoteData) return;
    executeSwap.mutate(
      {
        quoteId: quoteData.quoteId,
        fromPotId,
        toPotId,
        fromAmountCents: swapAmountCents,
        idempotencyKey: `swap-${Date.now()}`,
      },
      {
        onSuccess: () => {
          toast({ title: t("multiCurrencyWallet.swapComplete") });
          setShowSwapDialog(false);
          setSwapAmount("");
        },
        onError: () =>
          toast({ title: t("multiCurrencyWallet.swapFailed"), variant: "destructive" }),
      },
    );
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: t("multiCurrencyWallet.copiedToClipboard") });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              {t("multiCurrencyWallet.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("multiCurrencyWallet.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSwapDialog(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" /> {t("multiCurrencyWallet.swap")}
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> {t("multiCurrencyWallet.newCurrency")}
            </Button>
          </div>
        </div>

        {/* Total Balance Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("multiCurrencyWallet.estimatedTotalBalance")}
              </p>
              <p className="text-4xl font-bold mt-1">
                {formatCurrencyIntl(totalBalanceUSD, "USD")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("multiCurrencyWallet.activePots", { count: pots.length })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pots">{t("multiCurrencyWallet.currencyPots")}</TabsTrigger>
            <TabsTrigger value="vibans">{t("multiCurrencyWallet.virtualIbans")}</TabsTrigger>
            <TabsTrigger value="history">{t("multiCurrencyWallet.swapHistory")}</TabsTrigger>
          </TabsList>

          {/* Currency Pots */}
          <TabsContent value="pots">
            {pots.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title={t("multiCurrencyWallet.noPots")}
                description={t("multiCurrencyWallet.noPotsDesc")}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pots.map((pot: CurrencyPot) => (
                  <Card key={pot.potId} className={pot.isDefault ? "border-primary" : ""}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{currencyFlags[pot.currency] ?? "💱"}</span>
                          <div>
                            <p className="font-semibold">{pot.currencyName}</p>
                            <p className="text-sm text-muted-foreground">{pot.currency}</p>
                          </div>
                        </div>
                        {pot.isDefault && <Badge>{t("multiCurrencyWallet.default")}</Badge>}
                        <Badge variant={pot.status === "active" ? "outline" : "destructive"}>
                          {pot.status}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold">
                        {formatCurrencyIntl(pot.balanceCents, pot.currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("multiCurrencyWallet.available", {
                          amount: formatCurrencyIntl(pot.availableBalanceCents, pot.currency),
                        })}
                      </p>

                      {pot.viban ? (
                        <div className="mt-3 p-2 bg-muted rounded-md text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              {t("multiCurrencyWallet.localDetails")}
                            </span>
                            <Building className="h-3 w-3 text-muted-foreground" />
                          </div>
                          {pot.viban.iban && (
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs">{pot.viban.iban}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(pot.viban!.iban)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {pot.viban.sortCode && (
                            <p className="text-xs">
                              {t("multiCurrencyWallet.sortCode")}: {pot.viban.sortCode} &middot;{" "}
                              {t("multiCurrencyWallet.acc")}: {pot.viban.accountNumber}
                            </p>
                          )}
                          {pot.viban.routingNumber && (
                            <p className="text-xs">
                              {t("multiCurrencyWallet.routing")}: {pot.viban.routingNumber} &middot;{" "}
                              {t("multiCurrencyWallet.acc")}: {pot.viban.accountNumber}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">{pot.viban.bankName}</p>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() =>
                            handleGenerateVIBAN(pot.potId, currencyToCountry(pot.currency))
                          }
                          disabled={generateVIBAN.isPending}
                        >
                          <Globe className="h-4 w-4 mr-2" />{" "}
                          {t("multiCurrencyWallet.generateLocalBankDetails")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Virtual IBANs */}
          <TabsContent value="vibans">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {t("multiCurrencyWallet.vibanDirectory")}
                  </CardTitle>
                  <CardDescription>{t("multiCurrencyWallet.vibanDirectoryDesc")}</CardDescription>
                </CardHeader>
              </Card>

              {pots.filter((p: CurrencyPot) => p.viban).length === 0 ? (
                <EmptyState
                  icon={Building}
                  title={t("multiCurrencyWallet.noVibans")}
                  description={t("multiCurrencyWallet.noVibansDesc")}
                />
              ) : (
                <div className="space-y-3">
                  {pots
                    .filter((p: CurrencyPot) => p.viban)
                    .map((pot: CurrencyPot) => (
                      <Card key={pot.potId}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">
                                {currencyFlags[pot.currency] ?? "💱"}
                              </span>
                              <div>
                                <p className="font-semibold">
                                  {pot.currencyName} ({pot.currency})
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {pot.viban!.bankName} &middot; {pot.viban!.country}
                                </p>
                                {pot.viban!.iban && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="font-mono text-sm">{pot.viban!.iban}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(pot.viban!.iban)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                {pot.viban!.bic && (
                                  <p className="text-xs text-muted-foreground">
                                    BIC: {pot.viban!.bic}
                                  </p>
                                )}
                                {pot.viban!.sortCode && (
                                  <p className="text-xs text-muted-foreground">
                                    {t("multiCurrencyWallet.sortCode")} {pot.viban!.sortCode}{" "}
                                    &middot; {t("multiCurrencyWallet.account")}:{" "}
                                    {pot.viban!.accountNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={pot.viban!.status === "active" ? "outline" : "destructive"}
                            >
                              {pot.viban!.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Swap History */}
          <TabsContent value="history">
            {swapsLoading ? (
              <PageSkeleton />
            ) : swaps.length === 0 ? (
              <EmptyState
                icon={ArrowRightLeft}
                title={t("multiCurrencyWallet.noSwaps")}
                description={t("multiCurrencyWallet.noSwapsDesc")}
              />
            ) : (
              <div className="space-y-3">
                {swaps.map((swap: FXSwap) => (
                  <Card key={swap.swapId}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center">
                            <span className="text-xl">
                              {currencyFlags[swap.fromCurrency] ?? "💱"}
                            </span>
                            <ArrowRightLeft className="h-4 w-4 mx-1 text-muted-foreground" />
                            <span className="text-xl">
                              {currencyFlags[swap.toCurrency] ?? "💱"}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">
                              {formatCurrencyIntl(swap.fromAmountCents, swap.fromCurrency)} →{" "}
                              {formatCurrencyIntl(swap.toAmountCents, swap.toCurrency)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("multiCurrencyWallet.rate")} {swap.exchangeRate.toFixed(4)}{" "}
                              &middot; {t("multiCurrencyWallet.fee")}{" "}
                              {formatCurrencyIntl(swap.feeAmountCents, swap.feeCurrency)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={swap.status === "completed" ? "default" : "outline"}>
                            {swap.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(swap.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Pot Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("multiCurrencyWallet.createPotTitle")}</DialogTitle>
              <DialogDescription>{t("multiCurrencyWallet.createPotDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("multiCurrencyWallet.currency")}</Label>
                <Select value={newCurrency} onValueChange={setNewCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "EUR",
                      "GBP",
                      "USD",
                      "BRL",
                      "INR",
                      "SGD",
                      "AUD",
                      "CAD",
                      "JPY",
                      "CHF",
                      "MXN",
                      "SEK",
                    ].map((c) => (
                      <SelectItem key={c} value={c}>
                        {currencyFlags[c] ?? "💱"} {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t("multiCurrencyWallet.cancel")}
              </Button>
              <Button onClick={handleCreatePot} disabled={createPot.isPending}>
                {createPot.isPending
                  ? t("multiCurrencyWallet.creating")
                  : t("multiCurrencyWallet.createPot")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Swap Dialog */}
        <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("multiCurrencyWallet.swapCurrencyTitle")}</DialogTitle>
              <DialogDescription>{t("multiCurrencyWallet.swapCurrencyDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("multiCurrencyWallet.from")}</Label>
                  <Select value={fromPotId} onValueChange={setFromPotId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("multiCurrencyWallet.selectPot")} />
                    </SelectTrigger>
                    <SelectContent>
                      {pots
                        .filter((p: CurrencyPot) => p.potId !== toPotId)
                        .map((p: CurrencyPot) => (
                          <SelectItem key={p.potId} value={p.potId}>
                            {currencyFlags[p.currency] ?? "💱"} {p.currency} (
                            {formatCurrencyIntl(p.balanceCents, p.currency)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("multiCurrencyWallet.to")}</Label>
                  <Select value={toPotId} onValueChange={setToPotId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("multiCurrencyWallet.selectPot")} />
                    </SelectTrigger>
                    <SelectContent>
                      {pots
                        .filter((p: CurrencyPot) => p.potId !== fromPotId)
                        .map((p: CurrencyPot) => (
                          <SelectItem key={p.potId} value={p.potId}>
                            {currencyFlags[p.currency] ?? "💱"} {p.currency}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("multiCurrencyWallet.amount")}</Label>
                <Input
                  type="number"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {quoteData && swapAmountCents > 0 && (
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <CardContent className="pt-4 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>{t("multiCurrencyWallet.exchangeRate")}</span>
                      <span className="font-semibold">{quoteData.exchangeRate.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("multiCurrencyWallet.midMarketRate")}</span>
                      <span>{quoteData.midMarketRate.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("multiCurrencyWallet.youReceive")}</span>
                      <span className="font-bold text-lg">
                        {formatCurrencyIntl(quoteData.toAmountCents, quoteData.toCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("multiCurrencyWallet.feeLabel")}</span>
                      <span>
                        {formatCurrencyIntl(quoteData.feeAmountCents, quoteData.feeCurrency)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("multiCurrencyWallet.quoteExpires")} &middot; Markup:{" "}
                      {(quoteData.markup * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSwapDialog(false)}>
                {t("multiCurrencyWallet.cancel")}
              </Button>
              <Button
                onClick={handleExecuteSwap}
                disabled={!quoteData || !swapAmount || executeSwap.isPending}
              >
                {executeSwap.isPending
                  ? t("multiCurrencyWallet.swapping")
                  : t("multiCurrencyWallet.confirmSwap")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
