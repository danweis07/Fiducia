import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle2,
  Key,
  Fingerprint,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  Copy,
  Check,
} from "lucide-react";
import { useEnrollMFA, useVerifyMFA } from "@/hooks/useActivation";
import type { ActivationConfig, MFAMethod, MFAEnrollResult } from "@/types/activation";
import { MFA_METHOD_META } from "./constants";

export function StepMFA({
  config,
  activationToken,
  onComplete,
  onBack,
  onSkip,
}: {
  config: ActivationConfig;
  activationToken: string;
  onComplete: () => void;
  onBack: () => void;
  onSkip?: () => void;
}) {
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod | null>(null);
  const [destination, setDestination] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [enrollResult, setEnrollResult] = useState<MFAEnrollResult | null>(null);
  const [verified, setVerified] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const enrollMFA = useEnrollMFA();
  const verifyMFA = useVerifyMFA();

  const handleSelectMethod = (method: MFAMethod) => {
    setSelectedMethod(method);
    setEnrollResult(null);
    setVerified(false);
    setVerificationCode("");
    setDestination("");
  };

  const handleEnroll = () => {
    if (!selectedMethod) return;
    enrollMFA.mutate(
      {
        activationToken,
        method: selectedMethod,
        destination: selectedMethod === "sms" || selectedMethod === "email" ? destination : undefined,
      },
      {
        onSuccess: (result) => {
          setEnrollResult(result);
          if (result.backupCodes?.length) {
            setBackupCodes(result.backupCodes);
          }
          // Passkey and biometric are "enrolled" directly
          if (selectedMethod === "passkey" || selectedMethod === "biometric") {
            setVerified(true);
          }
        },
      }
    );
  };

  const handleVerify = () => {
    if (!enrollResult) return;
    verifyMFA.mutate(
      {
        activationToken,
        enrollmentId: enrollResult.enrollmentId,
        code: verificationCode,
      },
      {
        onSuccess: (result) => {
          if (result.verified) {
            setVerified(true);
          }
        },
      }
    );
  };

  const handleDownloadCodes = () => {
    if (!backupCodes) return;
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCodes = async () => {
    if (!backupCodes) return;
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  // After verification with backup codes shown
  if (verified && backupCodes && backupCodes.length > 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" aria-hidden="true" />
            Save Your Backup Codes
          </CardTitle>
          <CardDescription>
            These codes can be used to access your account if you lose access to your MFA
            device. Save them somewhere safe — they will only be shown once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-4 rounded-lg border bg-muted/50 font-mono text-sm">
            {backupCodes.map((code, i) => (
              <div key={i} className="p-1">
                {code}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="min-h-[44px] gap-2"
              onClick={handleDownloadCodes}
              aria-label="Download backup codes"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Download
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] gap-2"
              onClick={handleCopyCodes}
              aria-label="Copy backup codes to clipboard"
            >
              {copiedCodes ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
              {copiedCodes ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            className="min-h-[44px] gap-2"
            onClick={() => {
              setBackupCodes(null);
              onComplete();
            }}
            aria-label="Continue to next step"
          >
            Continue
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // After verified (no backup codes or already saved)
  if (verified) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
            MFA Enrolled Successfully
          </CardTitle>
          <CardDescription>
            Your {selectedMethod && MFA_METHOD_META[selectedMethod]?.label} has been set up.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            className="min-h-[44px] gap-2"
            onClick={onBack}
            aria-label="Go back to previous step"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </Button>
          <Button
            className="min-h-[44px] gap-2"
            onClick={onComplete}
            aria-label="Continue to next step"
          >
            Continue
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Verification code entry (SMS, email, TOTP)
  if (enrollResult && (selectedMethod === "sms" || selectedMethod === "email" || selectedMethod === "totp")) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" aria-hidden="true" />
            Enter Verification Code
          </CardTitle>
          <CardDescription>
            {selectedMethod === "totp" ? (
              "Enter the code from your authenticator app."
            ) : (
              <>A code has been sent to {enrollResult.destinationMasked}.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedMethod === "totp" && enrollResult.totpSecret && (
            <div className="space-y-3">
              <div className="flex items-center justify-center p-6 rounded-lg border bg-muted/30">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Scan the QR code with your authenticator app, or enter the secret manually:
                  </p>
                  <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded select-all">
                    {enrollResult.totpSecret}
                  </code>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Verification Code</Label>
            <Input
              id="mfa-code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="min-h-[44px] text-center tracking-widest text-lg"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Enter verification code"
            />
          </div>
          {verifyMFA.isError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              Verification failed. Please try again.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            className="min-h-[44px] gap-2"
            onClick={() => {
              setEnrollResult(null);
              setSelectedMethod(null);
            }}
            aria-label="Choose a different method"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </Button>
          <Button
            className="min-h-[44px] gap-2"
            onClick={handleVerify}
            disabled={verificationCode.length < 6 || verifyMFA.isPending}
            aria-label="Verify code"
          >
            {verifyMFA.isPending ? "Verifying..." : "Verify"}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Method selection / destination input
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" aria-hidden="true" />
          Set Up Multi-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account.
          {!config.mfa.required && " This step is optional but recommended."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedMethod ? (
          <div className="grid gap-3">
            {config.mfa.allowedMethods.map((method) => {
              const meta = MFA_METHOD_META[method];
              const Icon = meta.icon;
              return (
                <button
                  key={method}
                  onClick={() => handleSelectMethod(method)}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors text-left min-h-[44px]"
                  aria-label={`Select ${meta.label} as MFA method`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">
                {MFA_METHOD_META[selectedMethod].label}
              </Badge>
            </div>

            {(selectedMethod === "sms" || selectedMethod === "email") && (
              <div className="space-y-2">
                <Label htmlFor="mfa-destination">
                  {selectedMethod === "sms" ? "Phone Number" : "Email Address"}
                </Label>
                <Input
                  id="mfa-destination"
                  type={selectedMethod === "sms" ? "tel" : "email"}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={
                    selectedMethod === "sms" ? "(555) 123-4567" : "your@email.com"
                  }
                  className="min-h-[44px]"
                  aria-label={
                    selectedMethod === "sms"
                      ? "Enter phone number for SMS verification"
                      : "Enter email for verification"
                  }
                />
              </div>
            )}

            {selectedMethod === "passkey" && (
              <div className="text-center py-4 space-y-3">
                <Key className="w-12 h-12 mx-auto text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Register a passkey using your device&apos;s built-in authenticator or a
                  security key.
                </p>
              </div>
            )}

            {selectedMethod === "biometric" && (
              <div className="text-center py-4 space-y-3">
                <Fingerprint className="w-12 h-12 mx-auto text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Enable biometric sign-in using your device&apos;s fingerprint or face
                  recognition.
                </p>
              </div>
            )}

            {selectedMethod === "totp" && (
              <p className="text-sm text-muted-foreground">
                You&apos;ll be shown a QR code to scan with your authenticator app (e.g.
                Google Authenticator, Authy).
              </p>
            )}
          </div>
        )}

        {enrollMFA.isError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            Failed to set up MFA. Please try again.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          className="min-h-[44px] gap-2"
          onClick={selectedMethod ? () => setSelectedMethod(null) : onBack}
          aria-label={selectedMethod ? "Choose a different method" : "Go back to previous step"}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </Button>
        <div className="flex gap-2">
          {!config.mfa.required && onSkip && (
            <Button
              variant="ghost"
              className="min-h-[44px]"
              onClick={onSkip}
              aria-label="Skip MFA enrollment"
            >
              Skip
            </Button>
          )}
          {selectedMethod && (
            <Button
              className="min-h-[44px] gap-2"
              onClick={handleEnroll}
              disabled={
                enrollMFA.isPending ||
                ((selectedMethod === "sms" || selectedMethod === "email") && !destination.trim())
              }
              aria-label={
                selectedMethod === "passkey"
                  ? "Register passkey"
                  : selectedMethod === "biometric"
                    ? "Enable biometric sign-in"
                    : "Send verification code"
              }
            >
              {enrollMFA.isPending
                ? "Setting up..."
                : selectedMethod === "passkey"
                  ? "Register Passkey"
                  : selectedMethod === "biometric"
                    ? "Enable Biometric Sign-in"
                    : "Send Code"}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
