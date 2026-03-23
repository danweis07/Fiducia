import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, Clock, Plus, RefreshCw, XCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import {
  useStopPayments,
  useCreateStopPayment,
  useCancelStopPayment,
  useRenewStopPayment,
  useStopPaymentFee,
} from "@/hooks/useStopPayments";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { StopPaymentStatus } from "@/types";

const STATUS_STYLES: Record<
  StopPaymentStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; labelKey: string }
> = {
  active: { variant: "default", labelKey: "stopPayments.statusActive" },
  expired: { variant: "secondary", labelKey: "stopPayments.statusExpired" },
  cancelled: { variant: "outline", labelKey: "stopPayments.statusCancelled" },
  matched: { variant: "destructive", labelKey: "stopPayments.statusMatched" },
};

const DURATION_LABEL_KEYS: Record<string, string> = {
  "6months": "stopPayments.sixMonths",
  "12months": "stopPayments.twelveMonths",
  permanent: "stopPayments.permanent",
};

export default function StopPayments() {
  const { t } = useTranslation("banking");
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [renewId, setRenewId] = useState<string | null>(null);
  const [renewDuration, setRenewDuration] = useState<"6months" | "12months" | "permanent">(
    "6months",
  );

  // Form fields
  const [accountId, setAccountId] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [isRange, setIsRange] = useState(false);
  const [checkNumberEnd, setCheckNumberEnd] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<"6months" | "12months" | "permanent">("6months");

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: spData, isLoading: spLoading } = useStopPayments();
  const { data: feeData } = useStopPaymentFee();
  const createSP = useCreateStopPayment();
  const cancelSP = useCancelStopPayment();
  const renewSP = useRenewStopPayment();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const accounts = accountsData?.accounts ?? [];
  const stopPayments = spData?.stopPayments ?? [];
  const feeCents = feeData?.feeCents ?? 3000;

  const resetForm = () => {
    setAccountId("");
    setCheckNumber("");
    setIsRange(false);
    setCheckNumberEnd("");
    setPayeeName("");
    setAmountStr("");
    setReason("");
    setDuration("6months");
  };

  const handleCreate = async () => {
    try {
      const amountCents = amountStr ? Math.round(parseFloat(amountStr) * 100) : undefined;
      await createSP.mutateAsync({
        accountId,
        checkNumber,
        checkNumberEnd: isRange ? checkNumberEnd : undefined,
        payeeName: payeeName || undefined,
        amountCents,
        reason,
        duration,
      });
      toast({ title: t("stopPayments.created"), description: t("stopPayments.createdDesc") });
      resetForm();
      setCreateOpen(false);
    } catch (err) {
      handleError(err, { fallbackTitle: t("stopPayments.createFailed") });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelSP.mutateAsync(id);
      toast({ title: t("stopPayments.cancelled"), description: t("stopPayments.cancelledDesc") });
    } catch (err) {
      handleError(err, { fallbackTitle: t("stopPayments.cancelFailed") });
    }
    setCancelId(null);
  };

  const handleRenew = async () => {
    if (!renewId) return;
    try {
      await renewSP.mutateAsync({ stopPaymentId: renewId, duration: renewDuration });
      toast({
        title: t("stopPayments.renewed"),
        description: t("stopPayments.renewedDesc", {
          duration: t(DURATION_LABEL_KEYS[renewDuration]),
        }),
      });
    } catch (err) {
      handleError(err, { fallbackTitle: t("stopPayments.renewFailed") });
    }
    setRenewId(null);
  };

  const isFormValid = accountId && checkNumber && reason && duration;

  if (accountsLoading || spLoading)
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );

  return (
    <AppShell>
      <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("stopPayments.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("stopPayments.subtitle")}</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t("stopPayments.newStopPayment")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("stopPayments.createStopPayment")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div>
                  <Label>{t("stopPayments.account")}</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("stopPayments.selectAccount")} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nickname || a.type} ({a.accountNumberMasked})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("stopPayments.checkNumber")}</Label>
                  <Input
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    placeholder={t("stopPayments.checkNumberPlaceholder")}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isRange} onCheckedChange={setIsRange} />
                  <Label>{t("stopPayments.checkNumberRange")}</Label>
                </div>
                {isRange && (
                  <div>
                    <Label>{t("stopPayments.endCheckNumber")}</Label>
                    <Input
                      value={checkNumberEnd}
                      onChange={(e) => setCheckNumberEnd(e.target.value)}
                      placeholder={t("stopPayments.endCheckNumberPlaceholder")}
                    />
                  </div>
                )}
                <div>
                  <Label>{t("stopPayments.payeeNameOptional")}</Label>
                  <Input
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder={t("stopPayments.payeeNamePlaceholder")}
                  />
                </div>
                <div>
                  <Label>{t("stopPayments.amountOptional")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder={t("stopPayments.amountPlaceholder")}
                  />
                </div>
                <div>
                  <Label>{t("stopPayments.reason")}</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("stopPayments.reasonPlaceholder")}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>{t("stopPayments.duration")}</Label>
                  <Select
                    value={duration}
                    onValueChange={(v) => setDuration(v as "6months" | "12months" | "permanent")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6months">{t("stopPayments.sixMonths")}</SelectItem>
                      <SelectItem value="12months">{t("stopPayments.twelveMonths")}</SelectItem>
                      <SelectItem value="permanent">{t("stopPayments.permanent")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border p-3 text-sm flex justify-between">
                  <span className="text-muted-foreground">{t("stopPayments.stopPaymentFee")}</span>
                  <span className="font-semibold">{formatCurrency(feeCents)}</span>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("stopPayments.cancel")}</Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={!isFormValid || createSP.isPending}>
                  {createSP.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("stopPayments.placeStopPayment")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stop Payment List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("stopPayments.activeAndPast")}</CardTitle>
            <CardDescription>{t("stopPayments.yourHistory")}</CardDescription>
          </CardHeader>
          <CardContent>
            {stopPayments.length === 0 ? (
              <EmptyState
                icon={Ban}
                title={t("stopPayments.noStopPayments")}
                description={t("stopPayments.noStopPaymentsDesc")}
              />
            ) : (
              <div className="space-y-3">
                {stopPayments.map((sp) => {
                  const style = STATUS_STYLES[sp.status];
                  return (
                    <div
                      key={sp.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Ban className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">
                            Check #{sp.checkNumberStart}
                            {sp.checkNumberEnd ? ` - #${sp.checkNumberEnd}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("stopPayments.accountLabel")} {sp.accountMasked}
                          </p>
                          {sp.payeeName && (
                            <p className="text-xs text-muted-foreground">
                              {t("stopPayments.payeeLabel")} {sp.payeeName}
                            </p>
                          )}
                          {sp.amountCents != null && (
                            <p className="text-xs text-muted-foreground">
                              {t("stopPayments.amountLabel")} {formatCurrency(sp.amountCents)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t(DURATION_LABEL_KEYS[sp.duration])}
                            {sp.expirationDate &&
                              ` - ${t("stopPayments.expires")} ${new Date(sp.expirationDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(sp.feeCents)}</p>
                          <Badge variant={style.variant} className="text-xs">
                            {t(style.labelKey)}
                          </Badge>
                        </div>
                        {sp.status === "active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCancelId(sp.id)}
                            title={t("stopPayments.cancel")}
                          >
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                        {(sp.status === "active" || sp.status === "expired") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setRenewId(sp.id);
                              setRenewDuration("6months");
                            }}
                            title={t("stopPayments.renew")}
                          >
                            <RefreshCw className="w-4 h-4 text-primary" />
                          </Button>
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

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("stopPayments.cancelStopPayment")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("stopPayments.cancelStopPaymentDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("stopPayments.keep")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelId && handleCancel(cancelId)}>
              {t("stopPayments.releaseStopPayment")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Renew Dialog */}
      <Dialog open={!!renewId} onOpenChange={() => setRenewId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("stopPayments.renewStopPayment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t("stopPayments.newDuration")}</Label>
              <Select
                value={renewDuration}
                onValueChange={(v) => setRenewDuration(v as "6months" | "12months" | "permanent")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6months">{t("stopPayments.sixMonths")}</SelectItem>
                  <SelectItem value="12months">{t("stopPayments.twelveMonths")}</SelectItem>
                  <SelectItem value="permanent">{t("stopPayments.permanent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">{t("stopPayments.renewalFee")}</span>
              <span className="font-semibold">{formatCurrency(feeCents)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewId(null)}>
              {t("stopPayments.cancel")}
            </Button>
            <Button onClick={handleRenew} disabled={renewSP.isPending}>
              {renewSP.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("stopPayments.renew")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
