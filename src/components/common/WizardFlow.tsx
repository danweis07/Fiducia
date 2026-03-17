/**
 * WizardFlow — Shared multi-step wizard component
 *
 * Provides a consistent step indicator + navigation pattern for
 * Transfer, Deposit, and any future multi-step flows.
 *
 * Usage:
 *   <WizardFlow
 *     steps={["From Account", "Destination", "Amount", "Confirm"]}
 *     currentStep={step}
 *   >
 *     {step === 1 && <StepOne />}
 *     {step === 2 && <StepTwo />}
 *   </WizardFlow>
 */

import { CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardFlowProps {
  /** Step labels (e.g. ["From", "To", "Amount", "Done"]) */
  steps: string[];
  /** 1-indexed current step number */
  currentStep: number;
  /** The active step content */
  children: React.ReactNode;
  className?: string;
}

export function WizardFlow({ steps, currentStep, children, className }: WizardFlowProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Step indicator */}
      <nav aria-label="Progress" className="flex items-center gap-2 text-sm">
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const isComplete = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;

          return (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    isComplete || isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={cn(
                    "hidden sm:inline text-xs",
                    isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              {stepNum < steps.length && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </nav>

      {/* Step content */}
      {children}
    </div>
  );
}
