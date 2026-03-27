import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  Shield,
  CreditCard,
  ArrowLeftRight,
  Receipt,
  Smartphone,
  Settings,
  Fingerprint,
  Bell,
  Landmark,
  PiggyBank,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

interface MigratedAccount {
  id: string;
  type: string;
  nickname: string;
  accountNumberMasked: string;
  balanceCents: number;
}

const STEPS = [
  { id: "accounts", label: "Review Your Accounts", icon: CreditCard },
  { id: "security", label: "Security Setup", icon: Shield },
  { id: "getstarted", label: "Get Started", icon: Sparkles },
];

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  checking: Landmark,
  savings: PiggyBank,
  money_market: CreditCard,
};

const FEATURE_HIGHLIGHTS = [
  {
    icon: ArrowLeftRight,
    title: "Move Money",
    description: "Transfer funds between accounts instantly",
  },
  { icon: Receipt, title: "Bill Pay", description: "Schedule and manage bill payments online" },
  { icon: Smartphone, title: "Mobile Deposit", description: "Deposit checks by taking a photo" },
  {
    icon: Settings,
    title: "Account Settings",
    description: "Manage alerts, statements, and preferences",
  },
];

export default function MemberFirstLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [enableMfa, setEnableMfa] = useState(true);
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(true);

  const memberQuery = useQuery({
    queryKey: ["first-login-member"],
    queryFn: () =>
      gateway.request<{
        memberName: string;
        accounts: MigratedAccount[];
      }>("member.firstLoginData", {}),
  });

  const completeMutation = useMutation({
    mutationFn: (params: {
      enableMfa: boolean;
      enableBiometrics: boolean;
      enableNotifications: boolean;
    }) => gateway.request("member.completeFirstLogin", params),
    onSuccess: () => navigate("/dashboard"),
    onError: () =>
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      }),
  });

  const memberName = memberQuery.data?.memberName ?? "Member";
  const accounts = memberQuery.data?.accounts ?? [];
  const progressPct = ((currentStep + 1) / STEPS.length) * 100;
  const isLast = currentStep === STEPS.length - 1;

  function handleNext() {
    if (isLast) {
      completeMutation.mutate({ enableMfa, enableBiometrics, enableNotifications });
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  }

  function handleSkip() {
    completeMutation.mutate({
      enableMfa: false,
      enableBiometrics: false,
      enableNotifications: true,
    });
  }

  function formatCents(cents: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      cents / 100,
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome back, {memberName}</h1>
          <p className="text-muted-foreground">
            Let's get you set up on the new platform. This will only take a moment.
          </p>
        </div>

        <Progress value={progressPct} className="h-1.5" />

        {/* Step 0: Review Accounts */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Your Migrated Accounts
              </CardTitle>
              <CardDescription>
                All your accounts have been securely transferred. Please review the details below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {memberQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No accounts found. Please contact your institution.
                </p>
              ) : (
                accounts.map((acct) => {
                  const Icon = ACCOUNT_ICONS[acct.type] ?? Landmark;
                  return (
                    <div
                      key={acct.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted p-2">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{acct.nickname}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {acct.type} {acct.accountNumberMasked}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCents(acct.balanceCents)}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 1: Security Setup */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Security Setup
              </CardTitle>
              <CardDescription>
                Enhance your account security with these recommended settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Multi-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">
                      Add an extra layer of security to your sign-in
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Recommended
                  </Badge>
                  <Switch checked={enableMfa} onCheckedChange={setEnableMfa} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Biometric Login</p>
                    <p className="text-xs text-muted-foreground">
                      Use fingerprint or face recognition to sign in
                    </p>
                  </div>
                </div>
                <Switch checked={enableBiometrics} onCheckedChange={setEnableBiometrics} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Transaction Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Get alerts for account activity and transactions
                    </p>
                  </div>
                </div>
                <Switch checked={enableNotifications} onCheckedChange={setEnableNotifications} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Get Started */}
        {currentStep === 2 && (
          <Card>
            <CardHeader className="text-center">
              <Sparkles className="h-10 w-10 text-primary mx-auto mb-2" />
              <CardTitle>You're All Set</CardTitle>
              <CardDescription>
                Here's a quick overview of what you can do with your new banking platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {FEATURE_HIGHLIGHTS.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="rounded-full bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} of {STEPS.length}
            </span>
            <Button onClick={handleNext} disabled={completeMutation.isPending}>
              {completeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLast ? "Go to Dashboard" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
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
