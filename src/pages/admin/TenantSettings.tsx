import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Save, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/TenantContext";
import { gateway } from "@/lib/gateway";
import type { FeatureToggle, MFAPolicy, PasswordPolicy, TenantFeatures } from "@/types";

// ---------------------------------------------------------------------------
// Feature toggle definitions — maps TenantFeatures keys to display info
// ---------------------------------------------------------------------------

const FEATURE_DEFINITIONS: { key: keyof TenantFeatures; label: string; description: string }[] = [
  {
    key: "rdc",
    label: "Remote Deposit Capture",
    description: "Allow customers to deposit checks via mobile camera",
  },
  {
    key: "billPay",
    label: "Bill Pay",
    description: "Online bill payment through third-party provider",
  },
  { key: "p2p", label: "P2P Transfers", description: "Person-to-person money transfers" },
  {
    key: "wires",
    label: "Wire Transfers",
    description: "Domestic and international wire transfers",
  },
  {
    key: "cardControls",
    label: "Card Controls",
    description: "Allow customers to lock/unlock and set limits on cards",
  },
  {
    key: "externalTransfers",
    label: "External Transfers",
    description: "ACH transfers to external bank accounts",
  },
  {
    key: "mobileDeposit",
    label: "Mobile Deposit",
    description: "Deposit checks via mobile app camera",
  },
  {
    key: "directDeposit",
    label: "Direct Deposit",
    description: "Set up and manage direct deposit instructions",
  },
  {
    key: "openBanking",
    label: "Open Banking",
    description: "Connect third-party apps via Open Banking APIs",
  },
  {
    key: "sca",
    label: "Strong Customer Authentication",
    description: "PSD2-compliant multi-factor authentication for payments",
  },
  {
    key: "confirmationOfPayee",
    label: "Confirmation of Payee",
    description: "Verify payee name before sending payments (UK)",
  },
  {
    key: "multiCurrency",
    label: "Multi-Currency Wallets",
    description: "Hold and manage balances in multiple currencies",
  },
  {
    key: "internationalPayments",
    label: "International Payments",
    description: "Cross-border payments and foreign exchange",
  },
  {
    key: "internationalBillPay",
    label: "International Bill Pay",
    description: "Pay bills to international billers",
  },
  {
    key: "openBankingAggregation",
    label: "Account Aggregation",
    description: "Aggregate accounts from other banks via Open Banking",
  },
  {
    key: "aliasPayments",
    label: "Pay by Alias",
    description: "Send payments using email, phone, or alias identifiers",
  },
  {
    key: "amlScreening",
    label: "AML Screening",
    description: "Anti-money laundering screening and monitoring",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TenantSettings() {
  const { t } = useTranslation("admin");
  const { toast } = useToast();
  const { tenant, refreshTenant } = useAuth();
  const [institutionName, setInstitutionName] = useState("Demo Credit Union");
  const [slug, setSlug] = useState("demo-cu");
  const [contactEmail, setContactEmail] = useState("admin@example-cu.org");
  const [contactPhone, setContactPhone] = useState("(555) 123-4567");

  // Build feature toggles from actual tenant features
  const tenantFeatures = tenant?.features;
  const [features, setFeatures] = useState<FeatureToggle[]>(() =>
    FEATURE_DEFINITIONS.map((def) => ({
      key: def.key,
      label: def.label,
      description: def.description,
      enabled: tenantFeatures?.[def.key] ?? false,
    })),
  );

  // Sync when tenant features change (e.g., after refreshTenant)
  useEffect(() => {
    if (!tenantFeatures) return;
    setFeatures((prev) =>
      prev.map((f) => ({
        ...f,
        enabled: tenantFeatures[f.key as keyof TenantFeatures] ?? f.enabled,
      })),
    );
  }, [tenantFeatures]);
  const [mfaPolicy, setMfaPolicy] = useState<MFAPolicy>("required_above_threshold");
  const [sessionTimeout, setSessionTimeout] = useState(() =>
    String(tenant?.sessionTimeoutMinutes ?? 15),
  );
  const [sessionGrace, setSessionGrace] = useState(() => String(tenant?.sessionGraceMinutes ?? 2));
  const [rateLimitRpm, setRateLimitRpm] = useState("1000");
  const [allowedDomains, setAllowedDomains] = useState("*.example-cu.org\n192.168.1.0/24");

  // Consent management state
  type ConsentProvider = "built-in" | "ketch" | "osano" | "onetrust";
  const [consentProvider, setConsentProvider] = useState<ConsentProvider>("built-in");
  const [ketchOrgCode, setKetchOrgCode] = useState("");
  const [ketchPropertyCode, setKetchPropertyCode] = useState("");
  const [osanoCustomerId, setOsanoCustomerId] = useState("");
  const [osanoConfigId, setOsanoConfigId] = useState("");
  const [oneTrustDomainScript, setOneTrustDomainScript] = useState("");
  const [oneTrustAutoBlock, setOneTrustAutoBlock] = useState(true);

  // Password policy state
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);

  // Password policy form fields
  const [pwMinLength, setPwMinLength] = useState("8");
  const [pwMaxLength, setPwMaxLength] = useState("128");
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [requireLowercase, setRequireLowercase] = useState(true);
  const [requireDigit, setRequireDigit] = useState(true);
  const [requireSpecialChar, setRequireSpecialChar] = useState(true);
  const [specialChars, setSpecialChars] = useState("!@#$%^&*()_+-=[]{}|;:,.<>?");
  const [disallowUsername, setDisallowUsername] = useState(true);
  const [pwExpiryDays, setPwExpiryDays] = useState("0");
  const [pwHistoryCount, setPwHistoryCount] = useState("0");
  const [unMinLength, setUnMinLength] = useState("6");
  const [unMaxLength, setUnMaxLength] = useState("32");
  const [unAllowEmail, setUnAllowEmail] = useState(false);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState("5");
  const [lockoutMinutes, setLockoutMinutes] = useState("30");

  // Load password policy
  const loadPolicy = useCallback(async () => {
    try {
      const { policy: p } = await gateway.passwordPolicy.get();
      setPolicy(p);
      setPwMinLength(String(p.password.minLength));
      setPwMaxLength(String(p.password.maxLength));
      setRequireUppercase(p.password.requireUppercase);
      setRequireLowercase(p.password.requireLowercase);
      setRequireDigit(p.password.requireDigit);
      setRequireSpecialChar(p.password.requireSpecialChar);
      setSpecialChars(p.password.specialChars);
      setDisallowUsername(p.password.disallowUsername);
      setPwExpiryDays(String(p.password.expiryDays));
      setPwHistoryCount(String(p.password.historyCount));
      setUnMinLength(String(p.username.minLength));
      setUnMaxLength(String(p.username.maxLength));
      setUnAllowEmail(p.username.allowEmail);
      setMaxFailedAttempts(String(p.lockout.maxFailedAttempts));
      setLockoutMinutes(String(p.lockout.lockoutDurationMinutes));
    } catch {
      // Use defaults if load fails
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const savePasswordPolicy = async () => {
    setPolicySaving(true);
    try {
      const { policy: updated } = await gateway.passwordPolicy.update({
        passwordMinLength: Number(pwMinLength),
        passwordMaxLength: Number(pwMaxLength),
        requireUppercase,
        requireLowercase,
        requireDigit,
        requireSpecialChar,
        specialChars,
        disallowUsername,
        passwordExpiryDays: Number(pwExpiryDays),
        passwordHistoryCount: Number(pwHistoryCount),
        usernameMinLength: Number(unMinLength),
        usernameMaxLength: Number(unMaxLength),
        usernameAllowEmail: unAllowEmail,
        maxFailedAttempts: Number(maxFailedAttempts),
        lockoutDurationMinutes: Number(lockoutMinutes),
      });
      setPolicy(updated);
      toast({ title: t("tenantSettings.toasts.passwordPolicySaved") });
    } catch {
      toast({ title: t("tenantSettings.toasts.passwordPolicyFailed"), variant: "destructive" });
    } finally {
      setPolicySaving(false);
    }
  };

  const toggleFeature = async (key: string) => {
    const updated = features.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f));
    setFeatures(updated);

    // Persist to backend and refresh tenant context
    try {
      const featureMap = Object.fromEntries(updated.map((f) => [f.key, f.enabled]));
      await gateway.tenants.updateFeatures(featureMap);
      await refreshTenant();
      toast({ title: t("tenantSettings.toasts.featureUpdated") });
    } catch {
      // Revert on failure
      setFeatures(features);
      toast({ title: t("tenantSettings.toasts.featureUpdateFailed"), variant: "destructive" });
    }
  };

  const tier = "professional";
  const usage = { users: 12847, maxUsers: 50000, storage: 42, maxStorage: 100 };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("tenantSettings.title")}
          </h1>
          <p className="text-sm text-slate-500">{t("tenantSettings.subtitle")}</p>
        </div>
        <Button className="gap-1.5">
          <Save className="h-4 w-4" /> {t("tenantSettings.saveChanges")}
        </Button>
      </div>

      {/* Institution Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("tenantSettings.profile.title")}</CardTitle>
          <CardDescription>{t("tenantSettings.profile.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inst-name">{t("tenantSettings.profile.institutionName")}</Label>
              <Input
                id="inst-name"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{t("tenantSettings.profile.urlSlug")}</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">{t("tenantSettings.profile.contactEmail")}</Label>
              <Input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">{t("tenantSettings.profile.contactPhone")}</Label>
              <Input
                id="contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("tenantSettings.subscription.title")}</CardTitle>
          <CardDescription>{t("tenantSettings.subscription.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="capitalize text-sm px-3 py-1">{tier}</Badge>
            <Button variant="outline" size="sm">
              {t("tenantSettings.subscription.upgradePlan")}
            </Button>
          </div>
          <Separator />
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">{t("tenantSettings.subscription.users")}</span>
                <span className="font-medium">
                  {usage.users.toLocaleString()} / {usage.maxUsers.toLocaleString()}
                </span>
              </div>
              <Progress value={(usage.users / usage.maxUsers) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">{t("tenantSettings.subscription.storage")}</span>
                <span className="font-medium">
                  {usage.storage} GB / {usage.maxStorage} GB
                </span>
              </div>
              <Progress value={(usage.storage / usage.maxStorage) * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("tenantSettings.features.title")}</CardTitle>
          <CardDescription>{t("tenantSettings.features.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {features.map((feature) => (
              <div key={feature.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{feature.label}</p>
                  <p className="text-xs text-slate-500">{feature.description}</p>
                </div>
                <Switch
                  checked={feature.enabled}
                  onCheckedChange={() => toggleFeature(feature.key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
            <div>
              <CardTitle className="text-base">{t("tenantSettings.consent.title")}</CardTitle>
              <CardDescription>{t("tenantSettings.consent.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("tenantSettings.consent.provider")}</Label>
            <Select
              value={consentProvider}
              onValueChange={(v) => setConsentProvider(v as ConsentProvider)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="built-in">{t("tenantSettings.consent.builtIn")}</SelectItem>
                <SelectItem value="ketch">{t("tenantSettings.consent.ketch")}</SelectItem>
                <SelectItem value="osano">{t("tenantSettings.consent.osano")}</SelectItem>
                <SelectItem value="onetrust">{t("tenantSettings.consent.oneTrust")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {consentProvider === "built-in" && t("tenantSettings.consent.builtInDesc")}
              {consentProvider === "ketch" && t("tenantSettings.consent.ketchDesc")}
              {consentProvider === "osano" && t("tenantSettings.consent.osanoDesc")}
              {consentProvider === "onetrust" && t("tenantSettings.consent.oneTrustDesc")}
            </p>
          </div>

          {consentProvider === "ketch" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="ketch-org">{t("tenantSettings.consent.organizationCode")}</Label>
                <Input
                  id="ketch-org"
                  placeholder="your_org"
                  value={ketchOrgCode}
                  onChange={(e) => setKetchOrgCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ketch-prop">{t("tenantSettings.consent.propertyCode")}</Label>
                <Input
                  id="ketch-prop"
                  placeholder="your_property"
                  value={ketchPropertyCode}
                  onChange={(e) => setKetchPropertyCode(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 sm:col-span-2">
                {t("tenantSettings.consent.ketchHelp")}
              </p>
            </div>
          )}

          {consentProvider === "osano" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="osano-customer">{t("tenantSettings.consent.customerId")}</Label>
                <Input
                  id="osano-customer"
                  placeholder="abc123"
                  value={osanoCustomerId}
                  onChange={(e) => setOsanoCustomerId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="osano-config">{t("tenantSettings.consent.configId")}</Label>
                <Input
                  id="osano-config"
                  placeholder="def456"
                  value={osanoConfigId}
                  onChange={(e) => setOsanoConfigId(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 sm:col-span-2">
                {t("tenantSettings.consent.osanoHelp")}
              </p>
            </div>
          )}

          {consentProvider === "onetrust" && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="ot-domain">{t("tenantSettings.consent.domainScriptId")}</Label>
                <Input
                  id="ot-domain"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={oneTrustDomainScript}
                  onChange={(e) => setOneTrustDomainScript(e.target.value)}
                />
                <p className="text-xs text-slate-500">{t("tenantSettings.consent.oneTrustHelp")}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {t("tenantSettings.consent.autoBlockScripts")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("tenantSettings.consent.autoBlockScriptsDesc")}
                  </p>
                </div>
                <Switch checked={oneTrustAutoBlock} onCheckedChange={setOneTrustAutoBlock} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-slate-600" />
            <div>
              <CardTitle className="text-base">
                {t("tenantSettings.passwordPolicy.title")}
              </CardTitle>
              <CardDescription>{t("tenantSettings.passwordPolicy.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {policyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              {/* Password Requirements */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  {t("tenantSettings.passwordPolicy.requirements")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="pw-min">{t("tenantSettings.passwordPolicy.minLength")}</Label>
                    <Input
                      id="pw-min"
                      type="number"
                      min={6}
                      max={128}
                      value={pwMinLength}
                      onChange={(e) => setPwMinLength(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw-max">{t("tenantSettings.passwordPolicy.maxLength")}</Label>
                    <Input
                      id="pw-max"
                      type="number"
                      min={8}
                      max={256}
                      value={pwMaxLength}
                      onChange={(e) => setPwMaxLength(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {t("tenantSettings.passwordPolicy.requireUppercase")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t("tenantSettings.passwordPolicy.requireUppercaseDesc")}
                      </p>
                    </div>
                    <Switch checked={requireUppercase} onCheckedChange={setRequireUppercase} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {t("tenantSettings.passwordPolicy.requireLowercase")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t("tenantSettings.passwordPolicy.requireLowercaseDesc")}
                      </p>
                    </div>
                    <Switch checked={requireLowercase} onCheckedChange={setRequireLowercase} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {t("tenantSettings.passwordPolicy.requireDigit")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t("tenantSettings.passwordPolicy.requireDigitDesc")}
                      </p>
                    </div>
                    <Switch checked={requireDigit} onCheckedChange={setRequireDigit} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {t("tenantSettings.passwordPolicy.requireSpecialChar")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t("tenantSettings.passwordPolicy.requireSpecialCharDesc")}
                      </p>
                    </div>
                    <Switch checked={requireSpecialChar} onCheckedChange={setRequireSpecialChar} />
                  </div>
                  {requireSpecialChar && (
                    <div className="space-y-2 pl-1">
                      <Label htmlFor="special-chars">
                        {t("tenantSettings.passwordPolicy.allowedSpecialChars")}
                      </Label>
                      <Input
                        id="special-chars"
                        className="font-mono text-sm"
                        value={specialChars}
                        onChange={(e) => setSpecialChars(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {t("tenantSettings.passwordPolicy.disallowUsername")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t("tenantSettings.passwordPolicy.disallowUsernameDesc")}
                      </p>
                    </div>
                    <Switch checked={disallowUsername} onCheckedChange={setDisallowUsername} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Password Expiration & History */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  {t("tenantSettings.passwordPolicy.expirationHistory")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pw-expiry">
                      {t("tenantSettings.passwordPolicy.expiryDays")}
                    </Label>
                    <Input
                      id="pw-expiry"
                      type="number"
                      min={0}
                      value={pwExpiryDays}
                      onChange={(e) => setPwExpiryDays(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      {t("tenantSettings.passwordPolicy.expiryDaysHelp")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw-history">
                      {t("tenantSettings.passwordPolicy.historyCount")}
                    </Label>
                    <Input
                      id="pw-history"
                      type="number"
                      min={0}
                      max={24}
                      value={pwHistoryCount}
                      onChange={(e) => setPwHistoryCount(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      {t("tenantSettings.passwordPolicy.historyCountHelp")}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Username Rules */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  {t("tenantSettings.passwordPolicy.usernameRules")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                  <div className="space-y-2">
                    <Label htmlFor="un-min">{t("tenantSettings.passwordPolicy.minLength")}</Label>
                    <Input
                      id="un-min"
                      type="number"
                      min={3}
                      max={64}
                      value={unMinLength}
                      onChange={(e) => setUnMinLength(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="un-max">{t("tenantSettings.passwordPolicy.maxLength")}</Label>
                    <Input
                      id="un-max"
                      type="number"
                      min={6}
                      max={128}
                      value={unMaxLength}
                      onChange={(e) => setUnMaxLength(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {t("tenantSettings.passwordPolicy.allowEmailUsername")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("tenantSettings.passwordPolicy.allowEmailUsernameDesc")}
                    </p>
                  </div>
                  <Switch checked={unAllowEmail} onCheckedChange={setUnAllowEmail} />
                </div>
              </div>

              <Separator />

              {/* Lockout */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  {t("tenantSettings.passwordPolicy.lockoutSettings")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-attempts">
                      {t("tenantSettings.passwordPolicy.maxFailedAttempts")}
                    </Label>
                    <Input
                      id="max-attempts"
                      type="number"
                      min={1}
                      max={20}
                      value={maxFailedAttempts}
                      onChange={(e) => setMaxFailedAttempts(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lockout-min">
                      {t("tenantSettings.passwordPolicy.lockoutDuration")}
                    </Label>
                    <Input
                      id="lockout-min"
                      type="number"
                      min={1}
                      max={1440}
                      value={lockoutMinutes}
                      onChange={(e) => setLockoutMinutes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <Button onClick={savePasswordPolicy} disabled={policySaving} className="gap-1.5">
                  {policySaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t("tenantSettings.passwordPolicy.saveButton")}
                </Button>
              </div>

              {policy?.updatedAt && (
                <p className="text-xs text-slate-400 text-right">
                  {t("tenantSettings.passwordPolicy.lastUpdated", {
                    date: new Date(policy.updatedAt).toLocaleDateString(),
                  })}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("tenantSettings.security.title")}</CardTitle>
          <CardDescription>{t("tenantSettings.security.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("tenantSettings.security.mfaPolicy")}</Label>
            <Select value={mfaPolicy} onValueChange={(v) => setMfaPolicy(v as MFAPolicy)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="required_all">
                  {t("tenantSettings.security.mfaRequiredAll")}
                </SelectItem>
                <SelectItem value="required_above_threshold">
                  {t("tenantSettings.security.mfaRequiredThreshold")}
                </SelectItem>
                <SelectItem value="optional">{t("tenantSettings.security.mfaOptional")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">{t("tenantSettings.security.sessionTimeout")}</Label>
              <Input
                id="session-timeout"
                type="number"
                min="1"
                max="120"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Minutes before idle warning</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-grace">Grace Period (min)</Label>
              <Input
                id="session-grace"
                type="number"
                min="1"
                max="10"
                value={sessionGrace}
                onChange={(e) => setSessionGrace(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Minutes before auto-logout</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-limit">{t("tenantSettings.security.rateLimit")}</Label>
              <Input
                id="rate-limit"
                type="number"
                value={rateLimitRpm}
                onChange={(e) => setRateLimitRpm(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Requests per minute</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allowed Domains / IP Whitelist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allowed Domains / IP Whitelist</CardTitle>
          <CardDescription>
            Restrict admin access to specific domains or IP ranges. One entry per line.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={allowedDomains}
            onChange={(e) => setAllowedDomains(e.target.value)}
            className="font-mono text-sm min-h-[100px]"
            placeholder="*.example.com&#10;10.0.0.0/8"
          />
        </CardContent>
      </Card>
    </div>
  );
}
