import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  User,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useVerifyIdentity } from "@/hooks/useActivation";
import type {
  ActivationConfig,
  IdentityVerificationResult,
} from "@/types/activation";
import { IDENTITY_FIELD_LABELS } from "./constants";

export function StepIdentity({
  config,
  onComplete,
}: {
  config: ActivationConfig;
  onComplete: (token: string, memberInfo: IdentityVerificationResult["memberInfo"]) => void;
}) {
  const { t } = useTranslation();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [verifyResult, setVerifyResult] = useState<IdentityVerificationResult | null>(null);
  const verifyIdentity = useVerifyIdentity();

  const handleFieldChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    verifyIdentity.mutate(
      {
        accountNumber: formValues.accountNumber,
        ssn: formValues.ssn,
        dateOfBirth: formValues.dateOfBirth,
        lastName: formValues.lastName,
        email: formValues.email,
        phone: formValues.phone,
        zipCode: formValues.zipCode,
      },
      {
        onSuccess: (result) => {
          setVerifyResult(result);
          if (result.verified && result.memberInfo) {
            setShowConfirmation(true);
          }
        },
      }
    );
  };

  const handleConfirm = () => {
    if (verifyResult?.activationToken && verifyResult.memberInfo) {
      // Clear sensitive form values
      setFormValues({});
      onComplete(verifyResult.activationToken, verifyResult.memberInfo);
    }
  };

  // Lockout state
  if (verifyResult && verifyResult.lockedUntil) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
            Account Locked
          </CardTitle>
          <CardDescription>
            Too many failed verification attempts. Please try again after{" "}
            {new Date(verifyResult.lockedUntil).toLocaleString()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact your financial institution for
            assistance.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Confirmation screen
  if (showConfirmation && verifyResult?.memberInfo) {
    const { firstNameInitial, lastNameMasked, emailMasked, accountNumberMasked } =
      verifyResult.memberInfo;
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
            Identity Verified
          </CardTitle>
          <CardDescription>
            We found your account. Please confirm this is you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <p className="text-sm">
              <span className="font-medium">Name:</span> {firstNameInitial}. {lastNameMasked}
            </p>
            <p className="text-sm">
              <span className="font-medium">Email:</span> {emailMasked}
            </p>
            <p className="text-sm">
              <span className="font-medium">Account:</span> {accountNumberMasked}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            className="min-h-[44px]"
            onClick={() => {
              setShowConfirmation(false);
              setVerifyResult(null);
            }}
            aria-label="This is not me, try again"
          >
            That&apos;s Not Me
          </Button>
          <Button
            className="min-h-[44px] gap-2"
            onClick={handleConfirm}
            aria-label="Confirm identity and continue"
          >
            Yes, That&apos;s Me
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" aria-hidden="true" />
          {t("common.verify", "Verify Your Identity")}
        </CardTitle>
        <CardDescription>
          Enter the information below to verify your existing account with us.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.identity.requiredFields.map((field) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={`identity-${field}`}>{IDENTITY_FIELD_LABELS[field]}</Label>
            <Input
              id={`identity-${field}`}
              type={
                field === "ssn"
                  ? "password"
                  : field === "dateOfBirth"
                    ? "date"
                    : field === "email"
                      ? "email"
                      : field === "phone"
                        ? "tel"
                        : "text"
              }
              maxLength={field === "ssn" ? 4 : undefined}
              placeholder={
                field === "ssn"
                  ? "Last 4 digits"
                  : field === "zipCode"
                    ? "5-digit ZIP"
                    : undefined
              }
              value={formValues[field] || ""}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              className="min-h-[44px]"
              aria-label={IDENTITY_FIELD_LABELS[field]}
              aria-required="true"
            />
          </div>
        ))}

        {verifyResult && !verifyResult.verified && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium">Verification failed</p>
              <p>
                Please check your information and try again.{" "}
                {verifyResult.attemptsRemaining > 0 && (
                  <span>
                    {verifyResult.attemptsRemaining} attempt
                    {verifyResult.attemptsRemaining !== 1 ? "s" : ""} remaining.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          className="min-h-[44px] gap-2"
          onClick={handleSubmit}
          disabled={
            verifyIdentity.isPending ||
            config.identity.requiredFields.some((f) => !formValues[f]?.trim())
          }
          aria-label="Verify identity"
        >
          {verifyIdentity.isPending ? "Verifying..." : "Verify Identity"}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
