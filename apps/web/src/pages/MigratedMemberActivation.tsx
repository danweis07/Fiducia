import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, CheckCircle2, KeyRound, Mail, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "password", label: "Set Password" },
  { id: "verify", label: "Verify Info" },
  { id: "terms", label: "Accept Terms" },
  { id: "complete", label: "Complete" },
];

export default function MigratedMemberActivation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("alice.johnson@example.com");
  const [phone, setPhone] = useState("(555) 010-1234");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const progressPct = ((step + 1) / STEPS.length) * 100;

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
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setStep(2);
  }

  function handleVerify() {
    setStep(3);
  }

  function handleAcceptTerms() {
    if (!termsAccepted) {
      toast({ title: "Please accept the terms", variant: "destructive" });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(4);
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Activate Your Account</h1>
          <p className="text-muted-foreground">
            Your account has been migrated to our new platform. Complete these steps to get started.
          </p>
        </div>

        <Progress value={progressPct} className="h-2" />

        {/* Step 0: Welcome */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Your New Banking Experience</CardTitle>
              <CardDescription>
                Your institution has upgraded to a modern digital banking platform. Your account
                information has been securely migrated. Let's set up your new credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setStep(1)}>
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Set Password */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Set Your Password
              </CardTitle>
              <CardDescription>Choose a secure password for your new account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
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

        {/* Step 2: Verify Info */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Verify Your Information
              </CardTitle>
              <CardDescription>Confirm your contact details are correct.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleVerify}>
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Accept Terms */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>
                Review and accept the updated terms for your new platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-40 overflow-y-auto border rounded-md p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-2">Digital Banking Agreement</p>
                <p className="mb-2">
                  By activating your account on this platform, you agree to the terms and conditions
                  governing the use of digital banking services provided by your financial
                  institution. These terms cover electronic fund transfers, bill payment services,
                  mobile deposit, and other digital banking features available through this
                  platform.
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
                  I have read and accept the terms and conditions
                </Label>
              </div>
              <Button className="w-full" onClick={handleAcceptTerms} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Activate Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Account Activated</h2>
              <p className="text-muted-foreground mb-6">
                Your account is ready. Sign in to explore your new digital banking experience.
              </p>
              <Button onClick={() => navigate("/auth")}>Sign In</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
