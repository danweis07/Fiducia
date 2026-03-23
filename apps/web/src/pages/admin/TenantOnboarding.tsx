import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Palette,
  Plug,
  ShieldCheck,
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

const STEPS = [
  { id: "institution_profile", label: "Institution Profile", icon: Building2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "compliance", label: "Compliance", icon: ShieldCheck },
  { id: "users", label: "Users", icon: Users },
  { id: "review", label: "Review & Launch", icon: CheckCircle2 },
];

export default function TenantOnboarding() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);

  // Form state for each step
  const [institutionName, setInstitutionName] = useState("");
  const [charterNumber, setCharterNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [primaryColor, setPrimaryColor] = useState("#1e40af");
  const [logoUrl, setLogoUrl] = useState("");
  const sanitizedLogoUrl = useMemo(() => {
    try {
      const parsed = new URL(logoUrl);
      return parsed.protocol === "https:" ? parsed.href : null;
    } catch {
      return null;
    }
  }, [logoUrl]);
  const [coreProvider, setCoreProvider] = useState("fineract");
  const [rdcProvider, setRdcProvider] = useState("mitek");
  const [billPayProvider, setBillPayProvider] = useState("fiserv");
  const [kycRequired, setKycRequired] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(true);
  const [dataRetention, setDataRetention] = useState("7");
  const [adminEmails, setAdminEmails] = useState("");

  const statusQuery = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () =>
      gateway.request<{
        onboarding: {
          currentStep: string;
          stepsCompleted: string[];
          stepData: Record<string, unknown>;
          isComplete: boolean;
        };
      }>("onboarding.status", {}),
  });

  const updateStep = useMutation({
    mutationFn: (params: { step: string; data: Record<string, unknown> }) =>
      gateway.request("onboarding.updateStep", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding-status"] }),
  });

  const complete = useMutation({
    mutationFn: () => gateway.request("onboarding.complete", {}),
    onSuccess: () => {
      toast({ title: "Onboarding complete!", description: "Your institution is ready to go." });
      qc.invalidateQueries({ queryKey: ["onboarding-status"] });
    },
  });

  // Restore state from server
  useEffect(() => {
    const data = statusQuery.data?.onboarding;
    if (!data) return;
    const idx = STEPS.findIndex((s) => s.id === data.currentStep);
    if (idx >= 0) setActiveStep(idx);
    const sd = data.stepData;
    if (sd.institution_profile) {
      const ip = sd.institution_profile as Record<string, string>;
      setInstitutionName(ip.name ?? "");
      setCharterNumber(ip.charterNumber ?? "");
      setRoutingNumber(ip.routingNumber ?? "");
      setTimezone(ip.timezone ?? "America/New_York");
    }
    if (sd.branding) {
      const b = sd.branding as Record<string, string>;
      setPrimaryColor(b.primaryColor ?? "#1e40af");
      setLogoUrl(b.logoUrl ?? "");
    }
    if (sd.integrations) {
      const i = sd.integrations as Record<string, string>;
      setCoreProvider(i.coreProvider ?? "fineract");
      setRdcProvider(i.rdcProvider ?? "mitek");
      setBillPayProvider(i.billPayProvider ?? "fiserv");
    }
  }, [statusQuery.data]);

  const progress =
    ((statusQuery.data?.onboarding?.stepsCompleted?.length ?? 0) / STEPS.length) * 100;

  function saveCurrentStep() {
    const step = STEPS[activeStep].id;
    let data: Record<string, unknown> = {};
    switch (step) {
      case "institution_profile":
        data = { name: institutionName, charterNumber, routingNumber, timezone };
        break;
      case "branding":
        data = { primaryColor, logoUrl };
        break;
      case "integrations":
        data = { coreProvider, rdcProvider, billPayProvider };
        break;
      case "compliance":
        data = { kycRequired, mfaRequired, dataRetentionYears: Number(dataRetention) };
        break;
      case "users":
        data = {
          adminEmails: adminEmails
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
        };
        break;
      case "review":
        break;
    }
    updateStep.mutate(
      { step, data },
      {
        onSuccess: () => {
          if (activeStep < STEPS.length - 1) {
            setActiveStep((prev) => prev + 1);
          }
        },
      },
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tenant Onboarding</h1>
        <p className="text-muted-foreground">Set up your institution in a few steps.</p>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Step indicators */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const completed = statusQuery.data?.onboarding?.stepsCompleted?.includes(step.id);
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                idx === activeStep
                  ? "bg-primary text-primary-foreground"
                  : completed
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {step.label}
              {completed && <CheckCircle2 className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[activeStep].label}</CardTitle>
          <CardDescription>
            {activeStep === 0 &&
              "Basic information about your credit union or financial institution."}
            {activeStep === 1 && "Customize the look and feel of your banking portal."}
            {activeStep === 2 && "Connect your core banking and service providers."}
            {activeStep === 3 && "Configure compliance and security requirements."}
            {activeStep === 4 && "Invite your initial admin team."}
            {activeStep === 5 && "Review your configuration and launch."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeStep === 0 && (
            <>
              <div className="grid gap-2">
                <Label>Institution Name</Label>
                <Input
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="Acme Federal Credit Union"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Charter Number</Label>
                  <Input
                    value={charterNumber}
                    onChange={(e) => setCharterNumber(e.target.value)}
                    placeholder="12345"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Routing Number</Label>
                  <Input
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    placeholder="021000021"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern</SelectItem>
                    <SelectItem value="America/Chicago">Central</SelectItem>
                    <SelectItem value="America/Denver">Mountain</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {activeStep === 1 && (
            <>
              <div className="grid gap-2">
                <Label>Primary Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-16 rounded border cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="rounded-lg border p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Preview</p>
                <div
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  {sanitizedLogoUrl ? (
                    <img src={sanitizedLogoUrl} alt="Logo" className="h-8" />
                  ) : (
                    <Building2 className="h-5 w-5 text-white" />
                  )}
                  <span className="font-semibold text-white">
                    {institutionName || "Your Institution"}
                  </span>
                </div>
              </div>
            </>
          )}

          {activeStep === 2 && (
            <>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Core Banking Provider</Label>
                  <Select value={coreProvider} onValueChange={setCoreProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fineract">Apache Fineract</SelectItem>
                      <SelectItem value="mock">Mock (Development)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Remote Deposit Capture</Label>
                  <Select value={rdcProvider} onValueChange={setRdcProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mitek">Mitek</SelectItem>
                      <SelectItem value="synctera">Synctera</SelectItem>
                      <SelectItem value="unit">Unit</SelectItem>
                      <SelectItem value="mock">Mock (Development)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Bill Pay Provider</Label>
                  <Select value={billPayProvider} onValueChange={setBillPayProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fiserv">Fiserv</SelectItem>
                      <SelectItem value="fis">FIS</SelectItem>
                      <SelectItem value="mock">Mock (Development)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {activeStep === 3 && (
            <>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">KYC Verification Required</p>
                  <p className="text-sm text-muted-foreground">
                    Require identity verification for new accounts
                  </p>
                </div>
                <Switch checked={kycRequired} onCheckedChange={setKycRequired} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">MFA Required</p>
                  <p className="text-sm text-muted-foreground">
                    Require multi-factor authentication for all users
                  </p>
                </div>
                <Switch checked={mfaRequired} onCheckedChange={setMfaRequired} />
              </div>
              <div className="grid gap-2">
                <Label>Data Retention (years)</Label>
                <Select value={dataRetention} onValueChange={setDataRetention}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 years</SelectItem>
                    <SelectItem value="7">7 years (recommended)</SelectItem>
                    <SelectItem value="10">10 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {activeStep === 4 && (
            <>
              <div className="grid gap-2">
                <Label>Admin Email Addresses</Label>
                <Input
                  value={adminEmails}
                  onChange={(e) => setAdminEmails(e.target.value)}
                  placeholder="admin@example.com, cto@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of email addresses to invite as admins.
                </p>
              </div>
              {adminEmails && (
                <div className="flex flex-wrap gap-2">
                  {adminEmails
                    .split(",")
                    .map((e) => e.trim())
                    .filter(Boolean)
                    .map((email, i) => (
                      <Badge key={i} variant="secondary">
                        {email}
                      </Badge>
                    ))}
                </div>
              )}
            </>
          )}

          {activeStep === 5 && (
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Institution</span>
                  <span className="font-medium">{institutionName || "\u2014"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Charter #</span>
                  <span className="font-medium">{charterNumber || "\u2014"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Core Banking</span>
                  <span className="font-medium capitalize">{coreProvider}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">RDC Provider</span>
                  <span className="font-medium capitalize">{rdcProvider}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Bill Pay</span>
                  <span className="font-medium capitalize">{billPayProvider}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">KYC Required</span>
                  <Badge variant={kycRequired ? "default" : "outline"}>
                    {kycRequired ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">MFA Required</span>
                  <Badge variant={mfaRequired ? "default" : "outline"}>
                    {mfaRequired ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
          disabled={activeStep === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {activeStep < STEPS.length - 1 ? (
          <Button onClick={saveCurrentStep} disabled={updateStep.isPending}>
            {updateStep.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Continue <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => complete.mutate()} disabled={complete.isPending}>
            {complete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Launch Institution
          </Button>
        )}
      </div>
    </div>
  );
}
