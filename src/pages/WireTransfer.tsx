import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Globe, Building2, Clock, XCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/common/currency";
import { useAccounts } from "@/hooks/useAccounts";
import { useWires, useCreateDomesticWire, useCreateInternationalWire, useCancelWire, useWireFees, useWireLimits } from "@/hooks/useWireTransfers";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { WireStatus } from "@/types";

type Step = "form" | "confirm";

const STATUS_KEYS: Record<WireStatus, { variant: "default" | "secondary" | "destructive" | "outline"; labelKey: string }> = {
  pending: { variant: "secondary", labelKey: "wireTransfer.status.pending" },
  processing: { variant: "default", labelKey: "wireTransfer.status.processing" },
  completed: { variant: "default", labelKey: "wireTransfer.status.completed" },
  failed: { variant: "destructive", labelKey: "wireTransfer.status.failed" },
  cancelled: { variant: "outline", labelKey: "wireTransfer.status.cancelled" },
  returned: { variant: "destructive", labelKey: "wireTransfer.status.returned" },
};

export default function WireTransfer() {
  const { t } = useTranslation("banking");
  const [tab, setTab] = useState<"domestic" | "international">("domestic");
  const [step, setStep] = useState<Step>("form");
  const [cancelId, setCancelId] = useState<string | null>(null);

  // Domestic form
  const [fromAccountId, setFromAccountId] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [bankName, setBankName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [purpose, setPurpose] = useState("");

  // International additional fields
  const [swiftCode, setSwiftCode] = useState("");
  const [iban, setIban] = useState("");
  const [bankCountry, setBankCountry] = useState("");
  const [currency, setCurrency] = useState("USD");

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: wiresData, isLoading: wiresLoading } = useWires();
  const { data: feesData } = useWireFees();
  const { data: limitsData } = useWireLimits();
  const createDomestic = useCreateDomesticWire();
  const createInternational = useCreateInternationalWire();
  const cancelWire = useCancelWire();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const accounts = accountsData?.accounts ?? [];
  const wires = wiresData?.wires ?? [];
  const fees = feesData?.fees;
  const limits = limitsData?.limits;

  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const feeCents = tab === "domestic" ? (fees?.domesticFeeCents ?? 2500) : (fees?.internationalFeeCents ?? 4500);

  const resetForm = () => {
    setStep("form");
    setBeneficiaryName("");
    setBankName("");
    setRoutingNumber("");
    setAccountNumber("");
    setAmount("");
    setMemo("");
    setPurpose("");
    setSwiftCode("");
    setIban("");
    setBankCountry("");
    setCurrency("USD");
  };

  const handleSubmit = async () => {
    try {
      if (tab === "domestic") {
        await createDomestic.mutateAsync({
          fromAccountId, beneficiaryName, bankName, routingNumber,
          accountNumber, amountCents, memo: memo || undefined, purpose,
        });
      } else {
        await createInternational.mutateAsync({
          fromAccountId, beneficiaryName, swiftCode, iban, bankName,
          bankCountry, amountCents, currency, memo: memo || undefined, purpose,
        });
      }
      toast({ title: t("wireTransfer.toast.initiatedTitle"), description: t("wireTransfer.toast.initiatedDescription") });
      resetForm();
    } catch (err) {
      handleError(err, { fallbackTitle: t("wireTransfer.toast.failedTitle") });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelWire.mutateAsync(id);
      toast({ title: t("wireTransfer.toast.cancelledTitle"), description: t("wireTransfer.toast.cancelledDescription") });
    } catch (err) {
      handleError(err, { fallbackTitle: t("wireTransfer.toast.cancelFailedTitle") });
    }
    setCancelId(null);
  };

  const isDomesticValid = fromAccountId && beneficiaryName && bankName && /^\d{9}$/.test(routingNumber) && accountNumber && amountCents > 0 && purpose;
  const isIntlValid = fromAccountId && beneficiaryName && /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(swiftCode) && iban && bankName && bankCountry && amountCents > 0 && currency && purpose;
  const isValid = tab === "domestic" ? isDomesticValid : isIntlValid;

  if (accountsLoading || wiresLoading) return <AppShell><PageSkeleton /></AppShell>;

  return (
    <AppShell>
      <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("wireTransfer.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("wireTransfer.subtitle")}</p>
          </div>
          {limits && (
            <div className="text-right text-sm text-muted-foreground">
              <p>{t("wireTransfer.dailyRemaining")}: <span className="font-semibold text-foreground">{formatCurrency(limits.remainingDailyCents)}</span></p>
              <p>{t("wireTransfer.perTransactionMax")}: {formatCurrency(limits.perTransactionLimitCents)}</p>
            </div>
          )}
        </div>

        {/* New Wire Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("wireTransfer.newWireTransfer")}</CardTitle>
            <CardDescription>{t("wireTransfer.newWireDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === "form" ? (
              <Tabs value={tab} onValueChange={(v) => setTab(v as "domestic" | "international")}>
                <TabsList className="mb-4">
                  <TabsTrigger value="domestic"><Building2 className="w-4 h-4 mr-2" />{t("wireTransfer.domestic")}</TabsTrigger>
                  <TabsTrigger value="international"><Globe className="w-4 h-4 mr-2" />{t("wireTransfer.international")}</TabsTrigger>
                </TabsList>

                <div className="grid gap-4 max-w-lg">
                  <div>
                    <Label>{t("wireTransfer.fromAccount")}</Label>
                    <Select value={fromAccountId} onValueChange={setFromAccountId}>
                      <SelectTrigger><SelectValue placeholder={t("wireTransfer.selectAccount")} /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nickname || a.type} ({a.accountNumberMasked}) - {formatCurrency(a.availableBalanceCents)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("wireTransfer.beneficiaryName")}</Label>
                    <Input value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder={t("wireTransfer.beneficiaryNamePlaceholder")} />
                  </div>
                  <div>
                    <Label>{t("wireTransfer.bankName")}</Label>
                    <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder={t("wireTransfer.bankNamePlaceholder")} />
                  </div>

                  <TabsContent value="domestic" className="mt-0 space-y-4">
                    <div>
                      <Label>{t("wireTransfer.routingNumber")}</Label>
                      <Input value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder={t("wireTransfer.routingNumberPlaceholder")} maxLength={9} />
                      {routingNumber && !/^\d{9}$/.test(routingNumber) && <p className="text-xs text-destructive mt-1">{t("wireTransfer.validation.routingNumber")}</p>}
                    </div>
                    <div>
                      <Label>{t("wireTransfer.accountNumber")}</Label>
                      <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder={t("wireTransfer.accountNumberPlaceholder")} />
                    </div>
                  </TabsContent>

                  <TabsContent value="international" className="mt-0 space-y-4">
                    <div>
                      <Label>{t("wireTransfer.swiftCode")}</Label>
                      <Input value={swiftCode} onChange={(e) => setSwiftCode(e.target.value.toUpperCase().slice(0, 11))} placeholder={t("wireTransfer.swiftCodePlaceholder")} maxLength={11} />
                      {swiftCode && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swiftCode) && <p className="text-xs text-destructive mt-1">{t("wireTransfer.validation.swiftCode")}</p>}
                    </div>
                    <div>
                      <Label>{t("wireTransfer.iban")}</Label>
                      <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder={t("wireTransfer.ibanPlaceholder")} />
                    </div>
                    <div>
                      <Label>{t("wireTransfer.bankCountry")}</Label>
                      <Input value={bankCountry} onChange={(e) => setBankCountry(e.target.value)} placeholder={t("wireTransfer.bankCountryPlaceholder")} />
                    </div>
                    <div>
                      <Label>{t("wireTransfer.currency")}</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF"].map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <div>
                    <Label>{t("wireTransfer.amount")}</Label>
                    <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>{t("wireTransfer.purpose")}</Label>
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger><SelectValue placeholder={t("wireTransfer.selectPurpose")} /></SelectTrigger>
                      <SelectContent>
                        {(["businessPayment", "realEstate", "investment", "giftOrFamilySupport", "loanRepayment", "other"] as const).map((key) => (
                          <SelectItem key={key} value={t(`wireTransfer.purposeOptions.${key}`)}>{t(`wireTransfer.purposeOptions.${key}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("wireTransfer.memo")}</Label>
                    <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={t("wireTransfer.memoPlaceholder")} rows={2} />
                  </div>

                  <Button onClick={() => setStep("confirm")} disabled={!isValid} className="mt-2">
                    {t("wireTransfer.reviewWireTransfer")}
                  </Button>
                </div>
              </Tabs>
            ) : (
              <div className="max-w-lg space-y-4">
                <h3 className="font-semibold text-lg">{t("wireTransfer.confirmWireTransfer")}</h3>
                <div className="rounded-lg border p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("wireTransfer.summary.type")}</span><span className="font-medium capitalize">{tab === "domestic" ? t("wireTransfer.domestic") : t("wireTransfer.international")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("wireTransfer.summary.to")}</span><span className="font-medium">{beneficiaryName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("wireTransfer.summary.bank")}</span><span className="font-medium">{bankName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("wireTransfer.summary.amount")}</span><span className="font-medium">{formatCurrency(amountCents)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("wireTransfer.summary.fee")}</span><span className="font-medium">{formatCurrency(feeCents)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold"><span>{t("wireTransfer.summary.total")}</span><span>{formatCurrency(amountCents + feeCents)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("wireTransfer.summary.purpose")}</span><span className="font-medium">{purpose}</span></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("form")}>{t("wireTransfer.back")}</Button>
                  <Button onClick={handleSubmit} disabled={createDomestic.isPending || createInternational.isPending}>
                    {(createDomestic.isPending || createInternational.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("wireTransfer.sendWireTransfer")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wire Transfer History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("wireTransfer.history")}</CardTitle>
          </CardHeader>
          <CardContent>
            {wires.length === 0 ? (
              <EmptyState icon={ArrowUpRight} title={t("wireTransfer.noWireTransfers")} description={t("wireTransfer.noWireTransfersDescription")} />
            ) : (
              <div className="space-y-3">
                {wires.map((wire) => {
                  const style = STATUS_KEYS[wire.status];
                  return (
                    <div key={wire.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {wire.type === "domestic" ? <Building2 className="w-5 h-5 text-muted-foreground" /> : <Globe className="w-5 h-5 text-muted-foreground" />}
                        <div>
                          <p className="font-medium text-sm">{wire.beneficiaryName}</p>
                          <p className="text-xs text-muted-foreground">{wire.bankName} - {wire.referenceNumber}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(wire.createdAt).toLocaleDateString(undefined)}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-sm">{formatCurrency(wire.amountCents)}</p>
                          <Badge variant={style.variant} className="text-xs">{t(style.labelKey)}</Badge>
                        </div>
                        {wire.status === "pending" && (
                          <Button variant="ghost" size="icon" onClick={() => setCancelId(wire.id)}><XCircle className="w-4 h-4 text-destructive" /></Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("wireTransfer.cancelDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("wireTransfer.cancelDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("wireTransfer.cancelDialog.keep")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelId && handleCancel(cancelId)}>{t("wireTransfer.cancelDialog.cancelWire")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
