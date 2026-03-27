import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Shield,
  CreditCard,
  ArrowLeftRight,
  Receipt,
  Smartphone,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Your New Dashboard",
    description:
      "This is your central hub for managing accounts, transfers, payments, and more. Everything you need is accessible from the sidebar navigation.",
    icon: CheckCircle2,
  },
  {
    id: "accounts",
    title: "Your Accounts",
    description:
      "View all your accounts with real-time balances, recent transactions, and account details. All your account data has been securely migrated.",
    icon: CreditCard,
  },
  {
    id: "transfers",
    title: "Move Money",
    description:
      "Transfer funds between your accounts or send money to others. Set up recurring transfers and manage standing instructions.",
    icon: ArrowLeftRight,
  },
  {
    id: "billpay",
    title: "Bill Pay",
    description:
      "Pay bills online, set up automatic payments, and manage your payees. All your existing payees have been migrated.",
    icon: Receipt,
  },
  {
    id: "mobile",
    title: "Mobile Deposit",
    description:
      "Deposit checks from your phone by taking a photo. Quick, secure, and available 24/7.",
    icon: Smartphone,
  },
  {
    id: "security",
    title: "Security & Settings",
    description:
      "Set up multi-factor authentication, manage alerts, and configure your notification preferences for enhanced security.",
    icon: Shield,
  },
];

export default function MemberFirstLogin() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const progressPct = ((currentStep + 1) / TOUR_STEPS.length) * 100;
  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  function handleNext() {
    if (isLast) {
      navigate("/dashboard");
    } else {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleSkip() {
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg space-y-6">
        <Progress value={progressPct} className="h-1.5" />

        <Card>
          <CardHeader className="text-center">
            <step.icon className="h-12 w-12 text-primary mx-auto mb-3" />
            <CardTitle className="text-xl">{step.title}</CardTitle>
            <CardDescription className="text-base">{step.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip Tour
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {currentStep + 1} / {TOUR_STEPS.length}
                </span>
                <Button onClick={handleNext}>
                  {isLast ? "Go to Dashboard" : "Next"}
                  {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep
                  ? "w-6 bg-primary"
                  : i < currentStep
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
