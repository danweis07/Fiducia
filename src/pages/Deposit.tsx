import { useState, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Camera, Upload, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { formatCurrency, parseToCents } from "@/lib/common/currency";
import { Link } from "react-router-dom";
import { useAccounts } from "@/hooks/useAccounts";
import { useSubmitDeposit } from "@/hooks/useRDC";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { SuccessAnimation } from "@/components/common/SuccessAnimation";
import { Spinner } from "@/components/common/Spinner";
import { captureColors } from "@/lib/common/design-tokens";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:image/png;base64,")
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Deposit() {
  const { t } = useTranslation('banking');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [accountId, setAccountId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { toast } = useToast();
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const accounts = accountsData?.accounts ?? [];

  const submitDeposit = useSubmitDeposit();
  const { handleError } = useErrorHandler();

  const amountCents = parseToCents(amountInput);
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const canSubmit = !!frontImage && !!backImage && amountCents > 0 && !!accountId;

  const handleFrontCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setFrontImage(base64);
      } catch {
        toast({ title: t('deposit.captureError'), description: t('deposit.captureErrorDesc'), variant: "destructive" });
      }
    }
  };

  const handleBackCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setBackImage(base64);
      } catch {
        toast({ title: t('deposit.captureError'), description: t('deposit.captureErrorDesc'), variant: "destructive" });
      }
    }
  };

  const handleSubmit = async () => {
    if (!frontImage || !backImage) return;
    setSubmitError(null);
    try {
      const result = await submitDeposit.mutateAsync({
        accountId,
        amountCents,
        frontImageBase64: frontImage,
        backImageBase64: backImage,
      });
      setDepositId(result.deposit?.id ?? null);
      setDepositStatus(result.deposit?.status ?? "submitted");
      setSubmitted(true);
    } catch (err) {
      const info = handleError(err, { fallbackTitle: t('deposit.depositFailed') });
      setSubmitError(info.message);
    }
  };

  const handleReset = () => {
    setFrontImage(null);
    setBackImage(null);
    setAmountInput("");
    setAccountId("");
    setSubmitted(false);
    setDepositId(null);
    setDepositStatus(null);
    setSubmitError(null);
  };

  if (accountsLoading) {
    return <PageSkeleton />;
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="py-4">
            <SuccessAnimation
              title={t('deposit.depositSuccess')}
              description={t('deposit.depositSubmittedDesc', { amount: formatCurrency(amountCents), account: `${selectedAccount?.nickname} (${selectedAccount?.accountNumberMasked})` })}
              details={[
                ...(depositId ? [{ label: t('deposit.depositId'), value: depositId }] : []),
                ...(depositStatus ? [{ label: "Status", value: depositStatus }] : []),
                { label: t('deposit.availability'), value: t('deposit.availabilityDesc') },
              ]}
            >
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={handleReset}>{t('deposit.depositAnother')}</Button>
                <Button variant="outline" asChild>
                  <Link to={accountId ? `/accounts/${accountId}` : "/accounts"}>
                    {t('deposit.viewAccount')}
                  </Link>
                </Button>
              </div>
            </SuccessAnimation>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('deposit.title')}</h1>
        <p className="text-muted-foreground">
          {t('deposit.subtitle')}
        </p>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={frontInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFrontCapture}
      />
      <input
        ref={backInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleBackCapture}
      />

      {/* Check images */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Front of check */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('deposit.frontOfCheck')}</CardTitle>
            <CardDescription>
              {t('deposit.frontOfCheckDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-40 transition-colors ${
                frontImage
                  ? `${captureColors.captured.border} ${captureColors.captured.bg}`
                  : `${captureColors.empty.border} ${captureColors.empty.bg}`
              }`}
            >
              {frontImage ? (
                <div className="text-center space-y-1">
                  <CheckCircle2 className={`h-8 w-8 mx-auto ${captureColors.captured.icon}`} />
                  <p className={`text-sm ${captureColors.captured.text}`}>{t('deposit.frontCaptured')}</p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {t('deposit.tapToCapture')}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant={frontImage ? "outline" : "default"}
              className="w-full mt-3"
              onClick={() => frontInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {frontImage ? t('deposit.retakePhoto') : t('deposit.captureFront')}
            </Button>
          </CardContent>
        </Card>

        {/* Back of check */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('deposit.backOfCheck')}</CardTitle>
            <CardDescription>
              {t('deposit.backOfCheckDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-40 transition-colors ${
                backImage
                  ? `${captureColors.captured.border} ${captureColors.captured.bg}`
                  : `${captureColors.empty.border} ${captureColors.empty.bg}`
              }`}
            >
              {backImage ? (
                <div className="text-center space-y-1">
                  <CheckCircle2 className={`h-8 w-8 mx-auto ${captureColors.captured.icon}`} />
                  <p className={`text-sm ${captureColors.captured.text}`}>{t('deposit.backCaptured')}</p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {t('deposit.tapToCapture')}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant={backImage ? "outline" : "default"}
              className="w-full mt-3"
              onClick={() => backInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {backImage ? t('deposit.retakePhoto') : t('deposit.captureBack')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Amount & account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('deposit.depositDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deposit-amount">{t('deposit.checkAmount')}</Label>
            <Input
              id="deposit-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
            {amountCents > 0 && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(amountCents)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deposit-account">{t('deposit.depositTo')}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="deposit-account">
                <SelectValue placeholder={t('deposit.selectAnAccount')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acct) => (
                  <SelectItem key={acct.id} value={acct.id}>
                    {acct.nickname} ({acct.accountNumberMasked})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {submitError && (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm text-destructive">{submitError}</p>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <Button
        className="w-full"
        size="lg"
        disabled={!canSubmit || submitDeposit.isPending}
        onClick={handleSubmit}
      >
        {submitDeposit.isPending ? (
          <Spinner size="sm" className="mr-2 text-primary-foreground" />
        ) : (
          <Upload className="h-4 w-4 mr-2" />
        )}
        {submitDeposit.isPending ? t('deposit.submitting') : t('deposit.submitDeposit')}
      </Button>
    </div>
  );
}
