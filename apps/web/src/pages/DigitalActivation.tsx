import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useActivationConfig, useCompleteActivation } from "@/hooks/useActivation";
import type { ActivationStepId, IdentityVerificationResult } from "@/types/activation";
import {
  STEP_ORDER,
  ProgressStepper,
  StepIdentity,
  StepTerms,
  StepCredentials,
  StepMFA,
  StepDevice,
  StepComplete,
} from "./activation";

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function DigitalActivation() {
  const { t } = useTranslation();
  const { data: config, isLoading, isError } = useActivationConfig();
  const completeActivation = useCompleteActivation();

  const [currentStep, setCurrentStep] = useState<ActivationStepId>("identity");
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<ActivationStepId>>(new Set());
  const [memberInfo, setMemberInfo] = useState<IdentityVerificationResult["memberInfo"]>();

  const markComplete = useCallback((step: ActivationStepId) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const nextStep = useCallback(
    (fromStep: ActivationStepId) => {
      const idx = STEP_ORDER.indexOf(fromStep);
      if (idx < STEP_ORDER.length - 1) {
        const next = STEP_ORDER[idx + 1];
        // If we're moving to "complete", finalize
        if (next === "complete" && activationToken) {
          completeActivation.mutate(activationToken);
        }
        setCurrentStep(next);
      }
    },
    [activationToken, completeActivation],
  );

  const prevStep = useCallback((fromStep: ActivationStepId) => {
    const idx = STEP_ORDER.indexOf(fromStep);
    if (idx > 0) {
      setCurrentStep(STEP_ORDER[idx - 1]);
    }
  }, []);

  if (isLoading) {
    return (
      <AppShell>
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-4 md:p-8">
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Loading activation configuration...</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </AppShell>
    );
  }

  if (isError || !config) {
    return (
      <AppShell>
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-4 md:p-8">
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-destructive" aria-hidden="true" />
                <p className="text-destructive font-medium">
                  Unable to load activation configuration.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please try again later or contact your financial institution.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">
              {t("activation.title", "Activate Digital Banking")}
            </h1>
            <p className="text-muted-foreground">
              {t("activation.subtitle", "Set up your online banking access in a few simple steps.")}
            </p>
          </div>

          <ProgressStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            config={config}
          />

          {currentStep === "identity" && (
            <StepIdentity
              config={config}
              onComplete={(token, info) => {
                setActivationToken(token);
                setMemberInfo(info);
                markComplete("identity");
                nextStep("identity");
              }}
            />
          )}

          {currentStep === "terms" && activationToken && (
            <StepTerms
              config={config}
              activationToken={activationToken}
              onComplete={() => {
                markComplete("terms");
                nextStep("terms");
              }}
              onBack={() => prevStep("terms")}
            />
          )}

          {currentStep === "credentials" && activationToken && (
            <StepCredentials
              config={config}
              activationToken={activationToken}
              onComplete={() => {
                markComplete("credentials");
                nextStep("credentials");
              }}
              onBack={() => prevStep("credentials")}
            />
          )}

          {currentStep === "mfa" && activationToken && (
            <StepMFA
              config={config}
              activationToken={activationToken}
              onComplete={() => {
                markComplete("mfa");
                nextStep("mfa");
              }}
              onBack={() => prevStep("mfa")}
              onSkip={!config.mfa.required ? () => nextStep("mfa") : undefined}
            />
          )}

          {currentStep === "device" && activationToken && (
            <StepDevice
              config={config}
              activationToken={activationToken}
              onComplete={() => {
                markComplete("device");
                nextStep("device");
              }}
              onBack={() => prevStep("device")}
              onSkip={!config.device.required ? () => nextStep("device") : undefined}
            />
          )}

          {currentStep === "complete" && (
            <StepComplete memberInfo={memberInfo} completedSteps={completedSteps} />
          )}
        </div>
      </main>
    </AppShell>
  );
}
