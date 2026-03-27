import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface TourStep {
  title: string;
  description: string;
  targetSelector?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Dashboard Overview",
    description:
      "Your dashboard shows account balances, recent transactions, and quick actions at a glance.",
  },
  {
    title: "Account Details",
    description:
      "Click any account to see full transaction history, statements, and account settings.",
  },
  {
    title: "Transfer Money",
    description:
      "Use the Move Money option to transfer funds between your accounts or to external accounts.",
  },
  {
    title: "Bill Pay",
    description:
      "Manage your payees and schedule bill payments. Your existing payees have been migrated.",
  },
  {
    title: "Security Settings",
    description: "Set up multi-factor authentication and customize your notification preferences.",
  },
];

const STORAGE_KEY = "fiducia_tour_completed";

export function GuidedTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }

  function next() {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80">
      <Card className="shadow-lg border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Step {step + 1} of {TOUR_STEPS.length}
              </p>
              <h3 className="font-semibold text-sm">{current.title}</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={dismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{current.description}</p>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-xs">
              Skip
            </Button>
            <div className="flex items-center gap-1">
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={prev}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="sm" onClick={next}>
                {isLast ? "Done" : "Next"}
                {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
