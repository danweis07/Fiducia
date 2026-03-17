import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ActivationStepId, ActivationConfig } from "@/types/activation";
import { STEP_ORDER, STEP_META } from "./constants";

export function ProgressStepper({
  currentStep,
  completedSteps,
  config,
}: {
  currentStep: ActivationStepId;
  completedSteps: Set<ActivationStepId>;
  config?: ActivationConfig;
}) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const progressPercent = (currentIndex / (STEP_ORDER.length - 1)) * 100;

  const isStepRequired = (step: ActivationStepId) => {
    if (step === "identity" || step === "terms" || step === "credentials" || step === "complete")
      return true;
    if (step === "mfa") return config?.mfa.required !== false;
    if (step === "device") return config?.device.required !== false;
    return true;
  };

  return (
    <div className="w-full space-y-4" role="navigation" aria-label="Activation progress">
      <Progress value={progressPercent} className="h-2" aria-label="Activation progress" />
      <div className="flex justify-between">
        {STEP_ORDER.map((step) => {
          const meta = STEP_META[step];
          const Icon = meta.icon;
          const index = STEP_ORDER.indexOf(step);
          const isCompleted = completedSteps.has(step);
          const isCurrent = step === currentStep;
          const required = isStepRequired(step);

          return (
            <div
              key={step}
              className={`flex flex-col items-center gap-1 text-center ${
                index <= currentIndex ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary text-primary"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Icon className="w-4 h-4" aria-hidden="true" />
                )}
              </div>
              <span className="text-xs hidden md:block max-w-[80px] leading-tight">
                {meta.label}
              </span>
              {!required && (
                <span className="text-[10px] text-muted-foreground hidden md:block">
                  Optional
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
