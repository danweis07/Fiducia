import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Send, CalendarClock, Pause, Play, X, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
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
import { formatCurrency, parseToCents } from "@/lib/common/currency";
import { downloadTransferReceipt } from "@/lib/common/receipt";
import { formatBankingDate } from "@/lib/common/date";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreateTransfer } from "@/hooks/useTransfer";
import { useBeneficiaries } from "@/hooks/useBeneficiaries";
import {
  useStandingInstructions,
  useUpdateStandingInstruction,
} from "@/hooks/useStandingInstructions";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { WizardFlow } from "@/components/common/WizardFlow";
import { AmountInput } from "@/components/common/AmountInput";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { SuccessAnimation } from "@/components/common/SuccessAnimation";
import { Spinner } from "@/components/common/Spinner";

type Step = 1 | 2 | 3 | 4 | 5;
type ViewMode = "transfer" | "scheduled";

const frequencyKeys: Record<string, string> = {
  weekly: "transfer.frequencyWeekly",
  biweekly: "transfer.frequencyBiweekly",
  monthly: "transfer.frequencyMonthly",
  quarterly: "transfer.frequencyQuarterly",
  annually: "transfer.frequencyAnnually",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Transfer() {
  const { t } = useTranslation("banking");
  const [viewMode, setViewMode] = useState<ViewMode>("transfer");
  const [step, setStep] = useState<Step>(1);
  const [fromAccountId, setFromAccountId] = useState("");
  const [transferTarget, setTransferTarget] = useState<"account" | "beneficiary">("account");
  const [toAccountId, setToAccountId] = useState("");
  const [toBeneficiaryId, setToBeneficiaryId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [memo, setMemo] = useState("");
  const [transferId, setTransferId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const accounts = accountsData?.accounts ?? [];

  const { data: beneficiariesData, isLoading: beneficiariesLoading } = useBeneficiaries();
  const beneficiaries = beneficiariesData?.beneficiaries ?? [];

  const { data: instructionsData, isLoading: instructionsLoading } = useStandingInstructions();
  const instructions = instructionsData?.instructions ?? [];
  const updateInstruction = useUpdateStandingInstruction();

  const createTransfer = useCreateTransfer();

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const toBeneficiary = beneficiaries.find((b) => b.id === toBeneficiaryId);
  const amountCents = parseToCents(amountInput);

  const canProceedStep1 = !!fromAccountId;
  const canProceedStep2 = transferTarget === "account" ? !!toAccountId : !!toBeneficiaryId;
  const canProceedStep3 =
    amountCents > 0 && amountCents <= (fromAccount?.availableBalanceCents ?? 0);

  const destinationLabel =
    transferTarget === "account"
      ? toAccount
        ? `${toAccount.nickname} (${toAccount.accountNumberMasked})`
        : ""
      : toBeneficiary
        ? `${toBeneficiary.name} - ${toBeneficiary.bankName} (${toBeneficiary.accountNumberMasked})`
        : "";

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      const result = await createTransfer.mutateAsync({
        fromAccountId,
        ...(transferTarget === "account" ? { toAccountId } : { toBeneficiaryId }),
        type: transferTarget === "account" ? "internal" : "external",
        amountCents,
        memo: memo || undefined,
      });
      setTransferId(result.transfer?.id ?? null);
      setStep(5);
    } catch (err) {
      const info = handleError(err, { fallbackTitle: "Transfer failed" });
      setSubmitError(info.message);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFromAccountId("");
    setToAccountId("");
    setToBeneficiaryId("");
    setAmountInput("");
    setMemo("");
    setTransferId(null);
    setSubmitError(null);
  };

  const handleToggleInstruction = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await updateInstruction.mutateAsync({ id, status: newStatus });
      toast({
        title:
          newStatus === "active"
            ? t("transfer.instructionResumed")
            : t("transfer.instructionPaused"),
      });
    } catch (err) {
      handleError(err, { fallbackTitle: "Update failed" });
    }
  };

  const handleCancelInstruction = async (id: string) => {
    try {
      await updateInstruction.mutateAsync({ id, status: "cancelled" });
      toast({ title: t("transfer.instructionCancelled") });
    } catch (err) {
      handleError(err, { fallbackTitle: "Cancel failed" });
    }
  };

  // Loading state for initial data
  if (accountsLoading || beneficiariesLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("transfer.pageTitle")}</h1>
          <p className="text-muted-foreground">{t("transfer.pageSubtitle")}</p>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "transfer" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("transfer")}
        >
          <Send className="h-4 w-4 mr-2" />
          {t("transfer.newTransfer")}
        </Button>
        <Button
          variant={viewMode === "scheduled" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("scheduled")}
        >
          <CalendarClock className="h-4 w-4 mr-2" />
          {t("transfer.scheduledAndRecurring")}
          {instructions.filter((i) => i.status === "active").length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {instructions.filter((i) => i.status === "active").length}
            </Badge>
          )}
        </Button>
      </div>

      {/* ================================================================== */}
      {/* Transfer Flow */}
      {/* ================================================================== */}
      {viewMode === "transfer" && (
        <WizardFlow
          steps={[
            t("transfer.from"),
            t("transfer.to"),
            t("transfer.amount"),
            t("transfer.review"),
            t("transfer.done"),
          ]}
          currentStep={step}
        >
          {/* Step 1: From account */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("transfer.fromAccount")}</CardTitle>
                <CardDescription>{t("transfer.sourceAccount")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="from-account">{t("transfer.sourceAccount")}</Label>
                  <Select value={fromAccountId} onValueChange={setFromAccountId}>
                    <SelectTrigger id="from-account">
                      <SelectValue placeholder={t("transfer.selectAnAccount")} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acct) => (
                        <SelectItem key={acct.id} value={acct.id}>
                          {acct.nickname} ({acct.accountNumberMasked}) -{" "}
                          {formatCurrency(acct.availableBalanceCents)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button disabled={!canProceedStep1} onClick={() => setStep(2)}>
                    {t("common.next", { ns: "common" })}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: To account or beneficiary */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("transfer.destination")}</CardTitle>
                <CardDescription>{t("transfer.chooseDestination")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("transfer.transferTo")}</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={transferTarget === "account" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransferTarget("account")}
                    >
                      {t("transfer.myAccount")}
                    </Button>
                    <Button
                      variant={transferTarget === "beneficiary" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransferTarget("beneficiary")}
                    >
                      {t("transfer.beneficiary")}
                    </Button>
                  </div>
                </div>

                {transferTarget === "account" ? (
                  <div className="space-y-2">
                    <Label htmlFor="to-account">{t("transfer.destinationAccount")}</Label>
                    <Select value={toAccountId} onValueChange={setToAccountId}>
                      <SelectTrigger id="to-account">
                        <SelectValue placeholder={t("transfer.selectAnAccount")} />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter((a) => a.id !== fromAccountId)
                          .map((acct) => (
                            <SelectItem key={acct.id} value={acct.id}>
                              {acct.nickname} ({acct.accountNumberMasked})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="to-beneficiary">{t("transfer.beneficiary")}</Label>
                    <Select value={toBeneficiaryId} onValueChange={setToBeneficiaryId}>
                      <SelectTrigger id="to-beneficiary">
                        <SelectValue placeholder={t("transfer.selectBeneficiary")} />
                      </SelectTrigger>
                      <SelectContent>
                        {beneficiaries.map((ben) => (
                          <SelectItem key={ben.id} value={ben.id}>
                            {ben.name} - {ben.bankName} ({ben.accountNumberMasked})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    {t("common.back", { ns: "common" })}
                  </Button>
                  <Button disabled={!canProceedStep2} onClick={() => setStep(3)}>
                    {t("common.next", { ns: "common" })}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Amount & memo */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("transfer.amount")}</CardTitle>
                <CardDescription>
                  {t("transfer.enterAmount")} {t("transfer.available")}:{" "}
                  {fromAccount
                    ? formatCurrency(fromAccount.availableBalanceCents)
                    : formatCurrency(0)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AmountInput
                  id="amount"
                  label={t("transfer.amount")}
                  value={amountInput}
                  onChange={setAmountInput}
                  maxCents={fromAccount?.availableBalanceCents}
                  hint={
                    fromAccount
                      ? `${t("transfer.available")}: ${formatCurrency(fromAccount.availableBalanceCents)}`
                      : undefined
                  }
                />
                <div className="space-y-2">
                  <Label htmlFor="memo">{t("transfer.memo")}</Label>
                  <Input
                    id="memo"
                    placeholder={t("transfer.memoPlaceholder")}
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    {t("common.back", { ns: "common" })}
                  </Button>
                  <Button disabled={!canProceedStep3} onClick={() => setStep(4)}>
                    {t("transfer.reviewTransfer")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review & confirm */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("transfer.reviewTransfer")}</CardTitle>
                <CardDescription>{t("transfer.reviewDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("transfer.from")}</span>
                    <span className="font-medium">
                      {fromAccount?.nickname} ({fromAccount?.accountNumberMasked})
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("transfer.to")}</span>
                    <span className="font-medium">{destinationLabel}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("transfer.amount")}</span>
                    <span className="font-bold text-xl">{formatCurrency(amountCents)}</span>
                  </div>
                  {memo && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("transfer.memo")}</span>
                        <span>{memo}</span>
                      </div>
                    </>
                  )}
                </div>

                {submitError && <p className="text-sm text-destructive">{submitError}</p>}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    {t("common.back", { ns: "common" })}
                  </Button>
                  <Button
                    disabled={!canProceedStep3 || createTransfer.isPending}
                    onClick={handleSubmit}
                  >
                    {createTransfer.isPending ? (
                      <Spinner size="sm" className="mr-2 text-primary-foreground" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {createTransfer.isPending
                      ? t("transfer.submitting")
                      : t("transfer.confirmTransfer")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <Card>
              <CardContent className="py-4">
                <SuccessAnimation
                  title={t("transfer.transferSubmitted")}
                  description={`${formatCurrency(amountCents)} has been sent from ${fromAccount?.nickname} to ${destinationLabel}.`}
                  details={
                    transferId
                      ? [{ label: t("transfer.transferId"), value: transferId }]
                      : undefined
                  }
                >
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button onClick={handleReset}>{t("transfer.makeAnother")}</Button>
                    <Button variant="outline" asChild>
                      <Link to={fromAccountId ? `/accounts/${fromAccountId}` : "/accounts"}>
                        {t("transfer.viewAccount")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        downloadTransferReceipt({
                          transferId: transferId ?? "",
                          fromAccount: fromAccount
                            ? `${fromAccount.nickname} (${fromAccount.accountNumberMasked})`
                            : "",
                          toAccount: destinationLabel,
                          amountFormatted: formatCurrency(amountCents),
                          memo: memo || undefined,
                          date: new Date().toLocaleString(),
                          status: "Submitted",
                        })
                      }
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t("transfer.downloadReceipt")}
                    </Button>
                  </div>
                </SuccessAnimation>
              </CardContent>
            </Card>
          )}
        </WizardFlow>
      )}

      {/* ================================================================== */}
      {/* Standing Instructions */}
      {/* ================================================================== */}
      {viewMode === "scheduled" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                {t("transfer.standingInstructions")}
              </CardTitle>
              <CardDescription>{t("transfer.recurringTransfers")}</CardDescription>
            </CardHeader>
            <CardContent>
              {instructionsLoading ? (
                <PageSkeleton />
              ) : instructions.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title={t("transfer.noStandingInstructions")}
                  description={t("transfer.noStandingInstructionsDesc")}
                />
              ) : (
                <div className="space-y-4">
                  {instructions.map((instruction) => {
                    const fromAcct = accounts.find((a) => a.id === instruction.fromAccountId);
                    const toAcct = instruction.toAccountId
                      ? accounts.find((a) => a.id === instruction.toAccountId)
                      : null;

                    return (
                      <div key={instruction.id} className="rounded-md border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{instruction.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {frequencyKeys[instruction.frequency]
                                ? t(frequencyKeys[instruction.frequency])
                                : instruction.frequency}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={instruction.status} />
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t("transfer.from")}</p>
                            <p className="font-medium">
                              {fromAcct?.nickname ?? "Account"} (
                              {fromAcct?.accountNumberMasked ?? "..."})
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("transfer.to")}</p>
                            <p className="font-medium">
                              {toAcct
                                ? `${toAcct.nickname ?? t("transfer.account")} (${toAcct.accountNumberMasked})`
                                : instruction.toLoanId
                                  ? t("transfer.loanPayment")
                                  : t("transfer.beneficiary")}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("transfer.amount")}</p>
                            <p className="font-semibold">
                              {formatCurrency(instruction.amountCents)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("transfer.nextExecution")}</p>
                            <p className="font-medium">
                              {instruction.nextExecutionDate
                                ? formatBankingDate(instruction.nextExecutionDate)
                                : "—"}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {t("transfer.started")} {formatBankingDate(instruction.startDate)}
                          {instruction.endDate &&
                            ` · ${t("transfer.ends")} ${formatBankingDate(instruction.endDate)}`}
                          {` · ${t("transfer.executions", { count: instruction.totalExecutions })}`}
                          {instruction.lastFailureReason && (
                            <span className="text-destructive ml-2">
                              {t("transfer.lastError")}: {instruction.lastFailureReason}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        {(instruction.status === "active" || instruction.status === "paused") && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleToggleInstruction(instruction.id, instruction.status)
                              }
                              disabled={updateInstruction.isPending}
                            >
                              {instruction.status === "active" ? (
                                <>
                                  <Pause className="h-3 w-3 mr-1" />
                                  {t("transfer.pause")}
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3 mr-1" />
                                  {t("transfer.resume")}
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setConfirmCancelId(instruction.id)}
                              disabled={updateInstruction.isPending}
                            >
                              <X className="h-3 w-3 mr-1" />
                              {t("transfer.cancelInstruction")}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog
        open={!!confirmCancelId}
        onOpenChange={(open) => {
          if (!open) setConfirmCancelId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transfer.cancelInstructionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("transfer.cancelInstructionDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("transfer.keepIt")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmCancelId) {
                  handleCancelInstruction(confirmCancelId);
                  setConfirmCancelId(null);
                }
              }}
            >
              {t("transfer.cancelInstruction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
