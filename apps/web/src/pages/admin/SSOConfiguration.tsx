import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Key, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";

interface SSOProviderConfig {
  id?: string;
  providerType: "saml" | "oidc";
  name: string;
  isEnabled: boolean;
  // SAML
  entityId: string;
  ssoUrl: string;
  sloUrl: string;
  certificate: string;
  // OIDC
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  // Shared
  emailDomainRestriction: string;
  autoProvisionUsers: boolean;
  defaultRole: string;
  forceSso: boolean;
}

const emptySaml: SSOProviderConfig = {
  providerType: "saml",
  name: "",
  isEnabled: false,
  entityId: "",
  ssoUrl: "",
  sloUrl: "",
  certificate: "",
  clientId: "",
  clientSecret: "",
  discoveryUrl: "",
  emailDomainRestriction: "",
  autoProvisionUsers: true,
  defaultRole: "member",
  forceSso: false,
};

const emptyOidc: SSOProviderConfig = {
  ...emptySaml,
  providerType: "oidc",
};

export default function SSOConfiguration() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [saml, setSaml] = useState<SSOProviderConfig>(emptySaml);
  const [oidc, setOidc] = useState<SSOProviderConfig>(emptyOidc);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["sso-providers"],
    queryFn: () => gateway.sso.list(),
    select: (data: { providers?: SSOProviderConfig[] }) => {
      const providers = data?.providers ?? [];
      const samlProvider = providers.find((p) => p.providerType === "saml");
      const oidcProvider = providers.find((p) => p.providerType === "oidc");
      if (samlProvider) setSaml({ ...emptySaml, ...samlProvider });
      if (oidcProvider) setOidc({ ...emptyOidc, ...oidcProvider });
      return providers;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (config: SSOProviderConfig) => {
      if (config.id) {
        return gateway.sso.update(config.id, config);
      }
      return gateway.sso.create(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso-providers"] });
    },
  });

  const handleSave = useCallback(
    async (config: SSOProviderConfig, type: string) => {
      setSaving(type);
      try {
        const result = await saveMutation.mutateAsync(config);
        if (type === "saml" && result)
          setSaml((prev) => ({
            ...prev,
            id: (result as { provider?: { id: string } })?.provider?.id,
          }));
        if (type === "oidc" && result)
          setOidc((prev) => ({
            ...prev,
            id: (result as { provider?: { id: string } })?.provider?.id,
          }));
        toast({
          title: t("sso.toasts.configSaved"),
          description: t("sso.toasts.configSavedDesc", { type: type.toUpperCase() }),
        });
      } catch {
        toast({
          title: t("sso.toasts.saveFailed"),
          description: t("sso.toasts.saveFailedDesc"),
          variant: "destructive",
        });
      } finally {
        setSaving(null);
      }
    },
    [saveMutation],
  );

  const handleTest = useCallback(async (config: SSOProviderConfig, type: string) => {
    setTesting(type);
    try {
      await gateway.sso.test(config.id ?? "", config.providerType);
      toast({
        title: t("sso.toasts.connectionSuccessful"),
        description: t("sso.toasts.connectionSuccessfulDesc", { type: type.toUpperCase() }),
      });
    } catch {
      toast({
        title: t("sso.toasts.connectionFailed"),
        description: t("sso.toasts.connectionFailedDesc", { type: type.toUpperCase() }),
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  }, []);

  if (isLoading) return <PageSkeleton />;

  const renderSharedSettings = (
    config: SSOProviderConfig,
    setConfig: React.Dispatch<React.SetStateAction<SSOProviderConfig>>,
  ) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("sso.commonSettings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("sso.emailDomainRestriction")}</Label>
            <Input
              placeholder="company.com"
              value={config.emailDomainRestriction}
              onChange={(e) => setConfig((p) => ({ ...p, emailDomainRestriction: e.target.value }))}
            />
            <p className="text-xs text-slate-500">{t("sso.emailDomainRestrictionDesc")}</p>
          </div>
          <div className="space-y-2">
            <Label>{t("sso.defaultRole")}</Label>
            <Select
              value={config.defaultRole}
              onValueChange={(v) => setConfig((p) => ({ ...p, defaultRole: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{t("sso.roles.member")}</SelectItem>
                <SelectItem value="viewer">{t("sso.roles.viewer")}</SelectItem>
                <SelectItem value="admin">{t("sso.roles.admin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("sso.autoProvisionUsers")}</p>
              <p className="text-xs text-slate-500">{t("sso.autoProvisionUsersDesc")}</p>
            </div>
            <Switch
              checked={config.autoProvisionUsers}
              onCheckedChange={(v) => setConfig((p) => ({ ...p, autoProvisionUsers: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("sso.forceSso")}</p>
              <p className="text-xs text-slate-500">{t("sso.forceSsoDesc")}</p>
            </div>
            <Switch
              checked={config.forceSso}
              onCheckedChange={(v) => setConfig((p) => ({ ...p, forceSso: v }))}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("sso.title")}</h1>
          <p className="text-sm text-slate-500">{t("sso.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {saml.isEnabled && (
            <Badge variant="default" className="gap-1">
              <Shield className="h-3 w-3" /> {t("sso.samlActive")}
            </Badge>
          )}
          {oidc.isEnabled && (
            <Badge variant="default" className="gap-1">
              <Key className="h-3 w-3" /> {t("sso.oidcActive")}
            </Badge>
          )}
          {!saml.isEnabled && !oidc.isEnabled && (
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {t("sso.noSsoConfigured")}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="saml">
        <TabsList>
          <TabsTrigger value="saml" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> {t("sso.tabs.saml")}
          </TabsTrigger>
          <TabsTrigger value="oidc" className="gap-1.5">
            <Key className="h-3.5 w-3.5" /> {t("sso.tabs.oidc")}
          </TabsTrigger>
        </TabsList>

        {/* SAML Tab */}
        <TabsContent value="saml" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t("sso.saml.title")}</CardTitle>
                  <CardDescription>{t("sso.saml.description")}</CardDescription>
                </div>
                <Switch
                  checked={saml.isEnabled}
                  onCheckedChange={(v) => setSaml((p) => ({ ...p, isEnabled: v }))}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("sso.providerName")}</Label>
                <Input
                  placeholder={t("sso.saml.providerPlaceholder")}
                  value={saml.name}
                  onChange={(e) => setSaml((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("sso.saml.entityId")}</Label>
                <Input
                  placeholder="https://idp.example.com/saml/metadata"
                  value={saml.entityId}
                  onChange={(e) => setSaml((p) => ({ ...p, entityId: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("sso.saml.ssoUrl")}</Label>
                <Input
                  placeholder="https://idp.example.com/saml/sso"
                  value={saml.ssoUrl}
                  onChange={(e) => setSaml((p) => ({ ...p, ssoUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t("sso.saml.sloUrl")}{" "}
                  <span className="text-xs text-slate-400">({t("sso.optional")})</span>
                </Label>
                <Input
                  placeholder="https://idp.example.com/saml/slo"
                  value={saml.sloUrl}
                  onChange={(e) => setSaml((p) => ({ ...p, sloUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("sso.saml.certificate")}</Label>
                <Textarea
                  placeholder="-----BEGIN CERTIFICATE-----&#10;MIICmzCCAY...&#10;-----END CERTIFICATE-----"
                  value={saml.certificate}
                  onChange={(e) => setSaml((p) => ({ ...p, certificate: e.target.value }))}
                  className="font-mono text-xs min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>

          {renderSharedSettings(saml, setSaml)}

          <div className="flex gap-3">
            <Button onClick={() => handleSave(saml, "saml")} disabled={saving === "saml"}>
              {saving === "saml" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("sso.saml.save")}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTest(saml, "saml")}
              disabled={testing === "saml" || !saml.ssoUrl}
              className="gap-1.5"
            >
              {testing === "saml" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {t("sso.testConnection")}
            </Button>
          </div>
        </TabsContent>

        {/* OIDC Tab */}
        <TabsContent value="oidc" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{t("sso.oidc.title")}</CardTitle>
                  <CardDescription>{t("sso.oidc.description")}</CardDescription>
                </div>
                <Switch
                  checked={oidc.isEnabled}
                  onCheckedChange={(v) => setOidc((p) => ({ ...p, isEnabled: v }))}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("sso.providerName")}</Label>
                <Input
                  placeholder={t("sso.oidc.providerPlaceholder")}
                  value={oidc.name}
                  onChange={(e) => setOidc((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("sso.oidc.discoveryUrl")}</Label>
                <Input
                  placeholder="https://accounts.google.com/.well-known/openid-configuration"
                  value={oidc.discoveryUrl}
                  onChange={(e) => setOidc((p) => ({ ...p, discoveryUrl: e.target.value }))}
                />
                <p className="text-xs text-slate-500">{t("sso.oidc.discoveryUrlDesc")}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("sso.oidc.clientId")}</Label>
                  <Input
                    placeholder="your-client-id"
                    value={oidc.clientId}
                    onChange={(e) => setOidc((p) => ({ ...p, clientId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("sso.oidc.clientSecret")}</Label>
                  <Input
                    type="password"
                    placeholder="your-client-secret"
                    value={oidc.clientSecret}
                    onChange={(e) => setOidc((p) => ({ ...p, clientSecret: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {renderSharedSettings(oidc, setOidc)}

          <div className="flex gap-3">
            <Button onClick={() => handleSave(oidc, "oidc")} disabled={saving === "oidc"}>
              {saving === "oidc" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("sso.oidc.save")}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTest(oidc, "oidc")}
              disabled={testing === "oidc" || !oidc.discoveryUrl}
              className="gap-1.5"
            >
              {testing === "oidc" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {t("sso.testConnection")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
