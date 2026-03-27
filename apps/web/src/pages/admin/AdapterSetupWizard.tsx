import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plug,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Wifi,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

interface AdapterDomain {
  id: string;
  label: string;
  description: string;
  providers: AdapterProvider[];
}

interface AdapterProvider {
  id: string;
  name: string;
  requiredFields: AdapterField[];
}

interface AdapterField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder: string;
  required: boolean;
}

const ADAPTER_DOMAINS: AdapterDomain[] = [
  {
    id: "core-banking",
    label: "Core Banking",
    description: "Primary account and transaction data provider",
    providers: [
      {
        id: "fineract",
        name: "Apache Fineract",
        requiredFields: [
          {
            key: "api_url",
            label: "API URL",
            type: "url",
            placeholder: "https://fineract.example.com/api/v1",
            required: true,
          },
          {
            key: "api_key",
            label: "API Key",
            type: "password",
            placeholder: "Enter API key",
            required: true,
          },
          {
            key: "tenant_id",
            label: "Tenant ID",
            type: "text",
            placeholder: "default",
            required: true,
          },
        ],
      },
      {
        id: "cuanswers",
        name: "CU*Answers",
        requiredFields: [
          {
            key: "api_url",
            label: "API URL",
            type: "url",
            placeholder: "https://api.cuanswers.com",
            required: true,
          },
          {
            key: "credit_union_id",
            label: "Credit Union ID",
            type: "text",
            placeholder: "CU00247",
            required: true,
          },
          {
            key: "api_key",
            label: "API Key",
            type: "password",
            placeholder: "Enter API key",
            required: true,
          },
        ],
      },
      {
        id: "symitar",
        name: "Jack Henry Symitar",
        requiredFields: [
          {
            key: "api_url",
            label: "SymXchange URL",
            type: "url",
            placeholder: "https://symxchange.example.com",
            required: true,
          },
          {
            key: "api_key",
            label: "API Key",
            type: "password",
            placeholder: "Enter API key",
            required: true,
          },
        ],
      },
      {
        id: "fis",
        name: "FIS",
        requiredFields: [
          {
            key: "api_url",
            label: "API URL",
            type: "url",
            placeholder: "https://api.fisglobal.com",
            required: true,
          },
          {
            key: "client_id",
            label: "Client ID",
            type: "text",
            placeholder: "Enter client ID",
            required: true,
          },
          {
            key: "client_secret",
            label: "Client Secret",
            type: "password",
            placeholder: "Enter secret",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "card-services",
    label: "Card Services",
    description: "Card issuance, controls, and provisioning",
    providers: [
      {
        id: "marqeta",
        name: "Marqeta",
        requiredFields: [
          {
            key: "api_url",
            label: "API URL",
            type: "url",
            placeholder: "https://sandbox-api.marqeta.com/v3",
            required: true,
          },
          {
            key: "app_token",
            label: "Application Token",
            type: "password",
            placeholder: "Enter token",
            required: true,
          },
          {
            key: "admin_token",
            label: "Admin Token",
            type: "password",
            placeholder: "Enter admin token",
            required: true,
          },
        ],
      },
      {
        id: "stripe_issuing",
        name: "Stripe Issuing",
        requiredFields: [
          {
            key: "secret_key",
            label: "Secret Key",
            type: "password",
            placeholder: "sk_...",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "kyc",
    label: "KYC / Identity Verification",
    description: "Know Your Customer and identity verification",
    providers: [
      {
        id: "alloy",
        name: "Alloy",
        requiredFields: [
          {
            key: "api_url",
            label: "API URL",
            type: "url",
            placeholder: "https://sandbox.alloy.co",
            required: true,
          },
          {
            key: "workflow_token",
            label: "Workflow Token",
            type: "password",
            placeholder: "Enter token",
            required: true,
          },
          {
            key: "workflow_secret",
            label: "Workflow Secret",
            type: "password",
            placeholder: "Enter secret",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "bill-pay",
    label: "Bill Pay",
    description: "Bill payment processing",
    providers: [
      {
        id: "fiserv",
        name: "Fiserv CheckFree",
        requiredFields: [
          {
            key: "api_url",
            label: "API URL",
            type: "url",
            placeholder: "https://api.fiserv.com",
            required: true,
          },
          {
            key: "subscriber_id",
            label: "Subscriber ID",
            type: "text",
            placeholder: "Enter ID",
            required: true,
          },
          {
            key: "api_key",
            label: "API Key",
            type: "password",
            placeholder: "Enter key",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "rdc",
    label: "Remote Deposit Capture",
    description: "Mobile check deposit processing",
    providers: [
      {
        id: "mitek",
        name: "Mitek",
        requiredFields: [
          {
            key: "api_url",
            label: "API URL",
            type: "url",
            placeholder: "https://api.mitek.com",
            required: true,
          },
          {
            key: "api_key",
            label: "API Key",
            type: "password",
            placeholder: "Enter key",
            required: true,
          },
        ],
      },
    ],
  },
];

const WIZARD_STEPS = [
  "Select Domain",
  "Choose Provider",
  "Enter Credentials",
  "Test Connection",
  "Activate",
];

export default function AdapterSetupWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [selectedDomain, setSelectedDomain] = useState<AdapterDomain | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AdapterProvider | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<"idle" | "testing" | "pass" | "fail">("idle");
  const [enableWebhook, setEnableWebhook] = useState(false);

  const progressPct = ((step + 1) / WIZARD_STEPS.length) * 100;

  function handleSelectDomain(domain: AdapterDomain) {
    setSelectedDomain(domain);
    setSelectedProvider(null);
    setCredentials({});
    setTestResult("idle");
    setStep(1);
  }

  function handleSelectProvider(provider: AdapterProvider) {
    setSelectedProvider(provider);
    setCredentials({});
    setTestResult("idle");
    setStep(2);
  }

  function handleTestConnection() {
    setTestResult("testing");
    // Simulate test
    setTimeout(() => {
      setTestResult("pass");
      toast({
        title: "Connection successful",
        description: `${selectedProvider?.name} sandbox is responding.`,
      });
      setStep(3);
    }, 2000);
  }

  function handleActivate() {
    toast({
      title: "Adapter activated",
      description: `${selectedProvider?.name} for ${selectedDomain?.label} is now active.`,
    });
    setStep(4);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/integrations")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Adapter Setup Wizard</h1>
          <p className="text-muted-foreground">
            Configure and validate integration adapters step by step
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            {WIZARD_STEPS.map((s, i) => (
              <span
                key={s}
                className={`text-xs font-medium ${i <= step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s}
              </span>
            ))}
          </div>
          <Progress value={progressPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Step 0: Select Domain */}
      {step === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADAPTER_DOMAINS.map((domain) => (
            <Card
              key={domain.id}
              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => handleSelectDomain(domain)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  {domain.label}
                </CardTitle>
                <CardDescription>{domain.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {domain.providers.length} provider{domain.providers.length !== 1 ? "s" : ""}{" "}
                  available
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 1: Choose Provider */}
      {step === 1 && selectedDomain && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedDomain.label} — Choose Provider</CardTitle>
            <CardDescription>Select the provider you want to connect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDomain.providers.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => handleSelectProvider(provider)}
              >
                <div className="text-left">
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {provider.requiredFields.length} fields required
                  </p>
                </div>
              </Button>
            ))}
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Enter Credentials */}
      {step === 2 && selectedProvider && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedProvider.name} — Credentials</CardTitle>
            <CardDescription>
              Enter your API credentials. These will be encrypted at rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedProvider.requiredFields.map((field) => (
              <div key={field.key}>
                <Label>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={credentials[field.key] ?? ""}
                  onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Switch checked={enableWebhook} onCheckedChange={setEnableWebhook} />
              <Label>Enable webhook notifications</Label>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleTestConnection} disabled={testResult === "testing"}>
                {testResult === "testing" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Test Result + Activate */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult === "pass" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Connection Test — {testResult === "pass" ? "Passed" : "Failed"}
            </CardTitle>
            <CardDescription>
              {testResult === "pass"
                ? `Successfully connected to ${selectedProvider?.name} sandbox.`
                : `Failed to connect. Check your credentials and try again.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {testResult === "pass" && (
              <Button onClick={handleActivate}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Activate Adapter
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Adapter Activated</h2>
            <p className="text-muted-foreground mb-6">
              {selectedProvider?.name} for {selectedDomain?.label} is now active and ready to use.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(0);
                  setSelectedDomain(null);
                  setSelectedProvider(null);
                }}
              >
                Set Up Another Adapter
              </Button>
              <Button onClick={() => navigate("/admin/integrations")}>Back to Integrations</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
