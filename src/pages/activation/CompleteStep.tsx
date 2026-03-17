import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import type { ActivationStepId, IdentityVerificationResult } from "@/types/activation";

export function StepComplete({
  memberInfo,
  completedSteps,
}: {
  memberInfo?: IdentityVerificationResult["memberInfo"];
  completedSteps: Set<ActivationStepId>;
}) {
  const navigate = useNavigate();

  const stepsToShow: { id: ActivationStepId; label: string }[] = [
    { id: "identity", label: "Identity Verified" },
    { id: "terms", label: "Terms Accepted" },
    { id: "credentials", label: "Credentials Created" },
    { id: "mfa", label: "Multi-Factor Authentication" },
    { id: "device", label: "Device Registered" },
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2
              className="w-10 h-10 text-green-600"
              aria-hidden="true"
            />
          </div>
        </div>
        <CardTitle className="text-2xl">You&apos;re All Set!</CardTitle>
        <CardDescription>
          {memberInfo ? (
            <>
              Welcome, {memberInfo.firstNameInitial}. {memberInfo.lastNameMasked}! Your
              digital banking access has been activated.
            </>
          ) : (
            "Your digital banking access has been activated successfully."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stepsToShow.map((step) => {
            const isComplete = completedSteps.has(step.id);
            return (
              <div
                key={step.id}
                className="flex items-center gap-3 p-2 rounded-lg"
              >
                {isComplete ? (
                  <CheckCircle2
                    className="w-5 h-5 text-green-600 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    isComplete ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                  {!isComplete && " (Skipped)"}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button
          size="lg"
          className="min-h-[44px] gap-2"
          onClick={() => navigate("/auth")}
          aria-label="Sign in to your account"
        >
          Sign In
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
