import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  KeyRound,
  Mail,
  Phone,
  User,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

const STEPS = [
  { id: "password", label: "Set Password", icon: KeyRound },
  { id: "verify", label: "Verify Contact Info", icon: User },
  { id: "terms", label: "Accept Terms", icon: ShieldCheck },
  { id: "complete", label: "Complete", icon: CheckCircle2 },
];

function getPasswordStrength(pw: string): { label: string; score: number; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", score: 20, color: "bg-red-500" };
  if (score === 2) return { label: "Fair", score: 40, color: "bg-orange-500" };
  if (score === 3) return { label: "Good", score: 60, color: "bg-yellow-500" };
  if (score === 4) return { label: "Strong", score: 80, color: "bg-green-500" };
  return { label: "Excellent", score: 100, color: "bg-green-600" };
}

export default function MigratedMemberActivation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token") ?? "";

  const [step, setStep] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const tokenQuery = useQuery({
    queryKey: ["migration-token", token],
    queryFn: () =>
      gateway.request<{
        valid: boolean;
        institutionName: string;
        memberName: string;
        email: string;
        phone: string;
      }>("migration.validateToken", { token }),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (tokenQuery.data) {
      setEmail(tokenQuery.data.email ?? "");
      setPhone(tokenQuery.data.phone ?? "");
    }
  }, [tokenQuery.data]);

  const activateMutation = useMutation({
    mutationFn: (params: { token: string; password: string; email: string; phone: string }) =>
      gateway.request("migration.activate", params),
    onSuccess: () => setStep(3),
    onError: () =>
      toast({
        title: "Activation failed",
        description: "Please try again.",
        variant: "destructive",
      }),
  });

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const progressPct = ((step + 1) / STEPS.length) * 100;
  const institutionName = tokenQuery.data?.institutionName ?? "your institution";

  // Token missing
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">
              This activation link is missing a token. Please use the link from your invitation
              email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading
  if (tokenQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Token invalid
  if (tokenQuery.isError || (tokenQuery.data && !tokenQuery.data.valid)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Link Expired or Invalid</h2>
            <p className="text-muted-foreground">
              This activation link is no longer valid. Please contact your institution for a new
              invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  function handleSetPassword() {
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setStep(1);
  }

  function handleVerify() {
    if (!email.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    setStep(2);
  }

  function handleAcceptTerms() {
    if (!termsAccepted) {
      toast({ title: "Please accept the terms to continue", variant: "destructive" });
      return;
    }
    activateMutation.mutate({ token, password, email, phone });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Welcome to {institutionName}</h1>
          <p className="text-muted-foreground">
            Your account has been migrated. Complete these steps to activate your access.
          </p>
        </div>

        <Progress value={progressPct} className="h-2" />

        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center gap-1">
                <div
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                        ? "bg-green-100 text-green-800"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 0: Set Password */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Set Your Password
              </CardTitle>
              <CardDescription>Choose a secure password for your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${strength.color}`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Strength: {strength.label}</p>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
              <Button className="w-full" onClick={handleSetPassword}>
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Verify Contact Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Verify Your Contact Information
              </CardTitle>
              <CardDescription>
                Confirm or update the contact details migrated from your previous account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone Number
                </Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                You can update these details later in your account settings.
              </p>
              <Button className="w-full" onClick={handleVerify}>
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Accept Terms */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>
                Review and accept the terms for your digital banking access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-40 overflow-y-auto border rounded-md p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-2">Digital Banking Agreement</p>
                <p className="mb-2">
                  By activating your account on this platform, you agree to the terms and conditions
                  governing the use of digital banking services provided by your financial
                  institution. These terms cover electronic fund transfers, bill payment services,
                  mobile deposit, and other digital banking features.
                </p>
                <p className="mb-2">
                  Your institution is responsible for the accuracy of your migrated account data.
                  Please review your account balances and recent transactions after activation.
                  Report any discrepancies within 60 days.
                </p>
                <p>
                  Privacy: Your personal information is protected in accordance with applicable
                  federal and state regulations. We employ industry-standard encryption and access
                  controls to safeguard your data.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <Label htmlFor="terms" className="text-sm">
                  I have read and accept the{" "}
                  <a
                    href="/terms"
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    terms and conditions
                  </a>
                </Label>
              </div>
              <Button
                className="w-full"
                onClick={handleAcceptTerms}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Activate Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Account Activated</h2>
              <p className="text-muted-foreground mb-2">
                Your account is ready. You can now access all your banking services.
              </p>
              <Badge variant="secondary" className="mb-6">
                {institutionName}
              </Badge>
              <div>
                <Button onClick={() => navigate("/dashboard")} className="w-full">
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
