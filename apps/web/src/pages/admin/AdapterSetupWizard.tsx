import { useState } from "react";
import {
  Plug,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Server,
  CreditCard,
  ShieldCheck,
  Banknote,
  Camera,
  Receipt,
  Wallet,
  Bot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

interface Provider {
  id: string;
  name: string;
  fields: Array<{ key: string; label: string; type: "text" | "password" | "url" }>;
}

interface AdapterDomain {
  id: string;
  label: string;
  icon: React.ElementType;
  providers: Provider[];
  health?: "healthy" | "degraded" | "down" | "unconfigured";
}

const ADAPTER_DOMAINS: AdapterDomain[] = [
  {
    id: "core_banking",
    label: "Core Banking",
    icon: Server,
    providers: [
      {
        id: "fineract",
        name: "Apache Fineract",
        fields: [
          { key: "apiUrl", label: "API URL", type: "url" },
          { key: "apiKey", label: "API Key", type: "password" },
        ],
      },
      {
        id: "temenos",
        name: "Temenos T24",
        fields: [
          { key: "apiUrl", label: "API URL", type: "url" },
          { key: "clientId", label: "Client ID", type: "text" },
          { key: "clientSecret", label: "Client Secret", type: "password" },
        ],
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: Banknote,
    providers: [
      {
        id: "stripe",
        name: "Stripe",
        fields: [{ key: "apiKey", label: "API Key", type: "password" }],
      },
      {
        id: "plaid",
        name: "Plaid",
        fields: [
          { key: "clientId", label: "Client ID", type: "text" },
          { key: "secret", label: "Secret", type: "password" },
        ],
      },
    ],
  },
  {
    id: "kyc",
    label: "KYC/AML",
    icon: ShieldCheck,
    providers: [
      {
        id: "alloy",
        name: "Alloy",
        fields: [
          { key: "apiUrl", label: "API URL", type: "url" },
          { key: "apiKey", label: "API Key", type: "password" },
          { key: "secret", label: "Secret", type: "password" },
        ],
      },
      {
        id: "jumio",
        name: "Jumio",
        fields: [
          { key: "apiToken", label: "API Token", type: "password" },
          { key: "apiSecret", label: "API Secret", type: "password" },
        ],
      },
    ],
  },
  {
    id: "cards",
    label: "Cards",
    icon: CreditCard,
    providers: [
      {
        id: "marqeta",
        name: "Marqeta",
        fields: [
          { key: "apiUrl", label: "API URL", type: "url" },
          { key: "appToken", label: "Application Token", type: "password" },
        ],
      },
      {
        id: "galileo",
        name: "Galileo",
        fields: [
          { key: "apiUrl", label: "API URL", type: "url" },
          { key: "providerId", label: "Provider ID", type: "text" },
          { key: "apiKey", label: "API Key", type: "password" },
        ],
      },
    ],
  },
  {
    id: "rdc",
    label: "Remote Deposit",
    icon: Camera,
    providers: [
      {
        id: "mitek",
        name: "Mitek",
        fields: [
          { key: "apiUrl", label: "API URL", type: "url" },
          { key: "clientId", label: "Client ID", type: "text" },
          { key: "clientSecret", label: "Client Secret", type: "password" },
        ],
      },
    ],
  },
  {
    id: "billpay",
    label: "Bill Pay",
    icon: Receipt,
    providers: [
      {
        id: "fiserv",
        name: "Fiserv",
        fields: [
          { key: "apiUrl", label: "API URL", type: "url" },
          { key: "apiKey", label: "API Key", type: "password" },
        ],
      },
      {
        id: "fis",
        name: "FIS",
        fields: [
          { key: "apiUrl", label: "API URL", type: "url" },
          { key: "clientId", label: "Client ID", type: "text" },
          { key: "clientSecret", label: "Client Secret", type: "password" },
        ],
      },
    ],
  },
  {
    id: "lending",
    label: "Lending",
    icon: Wallet,
    providers: [
      {
        id: "meridianlink",
        name: "MeridianLink",
        fields: [
          { key: "apiUrl", label: "API URL", type: "url" },
          { key: "apiKey", label: "API Key", type: "password" },
        ],
      },
    ],
  },
  {
    id: "ai",
    label: "AI / ML",
    icon: Bot,
    providers: [
      {
        id: "openai",
        name: "OpenAI",
        fields: [{ key: "apiKey", label: "API Key", type: "password" }],
      },
      {
        id: "anthropic",
        name: "Anthropic",
        fields: [{ key: "apiKey", label: "API Key", type: "password" }],
      },
    ],
  },
];

type WizardStep = "domains" | "providers" | "credentials";

function healthBadge(health?: string) {
  switch (health) {
    case "healthy":
      return (
        <Badge variant="default" className="text-xs">
          Healthy
        </Badge>
      );
    case "degraded":
      return (
        <Badge variant="secondary" className="text-xs">
          Degraded
        </Badge>
      );
    case "down":
      return (
        <Badge variant="destructive" className="text-xs">
          Down
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          Unconfigured
        </Badge>
      );
  }
}

export default function AdapterSetupWizard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<WizardStep>("domains");
  const [selectedDomain, setSelectedDomain] = useState<AdapterDomain | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const healthQuery = useQuery({
    queryKey: ["adapter-health"],
    queryFn: () => gateway.request<{ adapters: Record<string, string> }>("integrations.health", {}),
  });

  const testConnection = useMutation({
    mutationFn: (params: {
      domain: string;
      provider: string;
      credentials: Record<string, string>;
    }) => gateway.request<{ success: boolean; message: string }>("adapters.setup.test", params),
    onSuccess: (data) => {
      setTestResult(data ?? { success: true, message: "Connection successful" });
    },
    onError: () => {
      setTestResult({ success: false, message: "Connection failed. Check your credentials." });
    },
  });

  const saveAdapter = useMutation({
    mutationFn: (params: {
      domain: string;
      provider: string;
      credentials: Record<string, string>;
    }) => gateway.request("adapters.setup.save", params),
    onSuccess: () => {
      toast({ title: "Adapter saved", description: "Credentials stored and adapter activated." });
      qc.invalidateQueries({ queryKey: ["adapter-health"] });
      resetWizard();
    },
  });

  function resetWizard() {
    setStep("domains");
    setSelectedDomain(null);
    setSelectedProvider(null);
    setCredentials({});
    setTestResult(null);
  }

  function selectDomain(domain: AdapterDomain) {
    setSelectedDomain(domain);
    setSelectedProvider(null);
    setCredentials({});
    setTestResult(null);
    setStep("providers");
  }

  function selectProvider(provider: Provider) {
    setSelectedProvider(provider);
    const initial: Record<string, string> = {};
    provider.fields.forEach((f) => (initial[f.key] = ""));
    setCredentials(initial);
    setTestResult(null);
    setStep("credentials");
  }

  const adapterHealth = healthQuery.data?.adapters ?? {};

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adapter Setup Wizard</h1>
          <p className="text-muted-foreground">Connect and configure integration adapters.</p>
        </div>
        {step !== "domains" && (
          <Button variant="ghost" onClick={resetWizard}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Domains
          </Button>
        )}
      </div>

      {/* Step 1: Domain grid */}
      {step === "domains" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ADAPTER_DOMAINS.map((domain) => {
            const Icon = domain.icon;
            const health = adapterHealth[domain.id];
            return (
              <Card
                key={domain.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() =>
                  selectDomain({ ...domain, health: health as AdapterDomain["health"] })
                }
              >
                <CardContent className="pt-6 text-center space-y-3">
                  <div className="mx-auto rounded-lg bg-muted p-3 w-fit">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium">{domain.label}</p>
                  <div>{healthBadge(health)}</div>
                  <p className="text-xs text-muted-foreground">
                    {domain.providers.length} provider{domain.providers.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Step 2: Provider selection */}
      {step === "providers" && selectedDomain && (
        <Card>
          <CardHeader>
            <CardTitle>Select Provider for {selectedDomain.label}</CardTitle>
            <CardDescription>Choose the provider you want to configure.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedDomain.providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => selectProvider(provider)}
                  className="flex items-center justify-between rounded-lg border p-4 text-left hover:border-primary/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{provider.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {provider.fields.length} credential field
                      {provider.fields.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Credentials form */}
      {step === "credentials" && selectedDomain && selectedProvider && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedProvider.name} — {selectedDomain.label}
            </CardTitle>
            <CardDescription>Enter your credentials to connect this adapter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedProvider.fields.map((field) => (
              <div key={field.key} className="grid gap-2">
                <Label>{field.label}</Label>
                <Input
                  type={field.type === "password" ? "password" : "text"}
                  value={credentials[field.key] ?? ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.type === "url" ? "https://..." : ""}
                />
              </div>
            ))}

            {testResult && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                  testResult.success
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                    : "bg-red-50 border-red-200 dark:bg-red-950/20"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  testConnection.mutate({
                    domain: selectedDomain.id,
                    provider: selectedProvider.id,
                    credentials,
                  })
                }
                disabled={testConnection.isPending}
              >
                {testConnection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plug className="mr-2 h-4 w-4" /> Test Connection
              </Button>
              <Button
                onClick={() =>
                  saveAdapter.mutate({
                    domain: selectedDomain.id,
                    provider: selectedProvider.id,
                    credentials,
                  })
                }
                disabled={saveAdapter.isPending}
              >
                {saveAdapter.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" /> Save &amp; Activate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
