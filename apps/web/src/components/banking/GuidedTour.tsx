import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

interface GuidedTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onDismiss: () => void;
}

const STORAGE_KEY = "fiducia_tour_completed";

function getTooltipPosition(
  rect: DOMRect,
  position: TourStep["position"],
): { top: number; left: number } {
  const GAP = 12;
  switch (position) {
    case "top":
      return { top: rect.top - GAP, left: rect.left + rect.width / 2 };
    case "bottom":
      return { top: rect.bottom + GAP, left: rect.left + rect.width / 2 };
    case "left":
      return { top: rect.top + rect.height / 2, left: rect.left - GAP };
    case "right":
      return { top: rect.top + rect.height / 2, left: rect.right + GAP };
  }
}

function getTransformOrigin(position: TourStep["position"]): string {
  switch (position) {
    case "top":
      return "translateX(-50%) translateY(-100%)";
    case "bottom":
      return "translateX(-50%)";
    case "left":
      return "translateX(-100%) translateY(-50%)";
    case "right":
      return "translateY(-50%)";
  }
}

export function GuidedTour({ steps, onComplete, onDismiss }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);
    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [updateTargetRect]);

  function handleComplete() {
    localStorage.setItem(STORAGE_KEY, "true");
    onComplete();
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    onDismiss();
  }

  function handleNext() {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function handlePrev() {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  }

  if (!step) return null;

  const tooltipPos = targetRect
    ? getTooltipPosition(targetRect, step.position)
    : { top: window.innerHeight / 2, left: window.innerWidth / 2 };

  const transform = targetRect
    ? getTransformOrigin(step.position)
    : "translateX(-50%) translateY(-50%)";

  // Spotlight cutout dimensions
  const PADDING = 8;
  const spotlightBox = targetRect
    ? {
        top: targetRect.top - PADDING,
        left: targetRect.left - PADDING,
        width: targetRect.width + PADDING * 2,
        height: targetRect.height + PADDING * 2,
      }
    : null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Dimmed overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightBox && (
              <rect
                x={spotlightBox.left}
                y={spotlightBox.top}
                width={spotlightBox.width}
                height={spotlightBox.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tour-spotlight-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={handleDismiss}
        />
      </svg>

      {/* Tooltip */}
      <div
        className="absolute z-[51]"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          transform,
        }}
      >
        <Card className="w-72 shadow-xl border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {currentStep + 1} of {steps.length}
                </p>
                <h3 className="font-semibold text-sm">{step.title}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs">
                Skip
              </Button>
              <div className="flex items-center gap-1">
                {currentStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="sm" onClick={handleNext}>
                  {isLast ? "Done" : "Next"}
                  {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const DEFAULT_BANKING_TOUR_STEPS: TourStep[] = [
  {
    targetSelector: "[data-tour='dashboard-overview']",
    title: "Dashboard Overview",
    description:
      "Your dashboard shows account balances, recent transactions, and quick actions at a glance.",
    position: "bottom",
  },
  {
    targetSelector: "[data-tour='account-cards']",
    title: "Your Accounts",
    description:
      "View all your accounts with real-time balances. Click any account for full details and transaction history.",
    position: "bottom",
  },
  {
    targetSelector: "[data-tour='transfer-button']",
    title: "Transfer Money",
    description:
      "Move funds between your accounts or send money to others. Set up one-time or recurring transfers.",
    position: "left",
  },
  {
    targetSelector: "[data-tour='bill-pay']",
    title: "Bill Pay",
    description:
      "Pay bills online, manage payees, and schedule automatic payments. Your existing payees have been migrated.",
    position: "right",
  },
  {
    targetSelector: "[data-tour='mobile-deposit']",
    title: "Mobile Deposit",
    description:
      "Deposit checks by taking a photo with your device camera. Quick, secure, and available 24/7.",
    position: "right",
  },
  {
    targetSelector: "[data-tour='settings']",
    title: "Settings & Security",
    description:
      "Configure multi-factor authentication, manage alerts, and customize your notification preferences.",
    position: "left",
  },
];
