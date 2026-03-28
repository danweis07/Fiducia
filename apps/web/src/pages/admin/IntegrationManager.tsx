import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plug,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Copy,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAdminIntegrations } from "@/hooks/useAdminIntegrations";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { useToast } from "@/hooks/use-toast";
import { gateway } from "@/lib/gateway";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function healthIcon(health: string) {
  switch (health) {
    case "healthy":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "degraded":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "down":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return null;
  }
}

function healthBadge(health: string): "default" | "secondary" | "destructive" {
  switch (health) {
    case "healthy":
      return "default";
    case "degraded":
      return "secondary";
    case "down":
      return "destructive";
    default:
      return "secondary";
  }
}

function formatSyncTime(ts: string | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IntegrationManager() {
  const { t } = useTranslation("admin");
  const { data: integrationsData, isLoading } = useAdminIntegrations();
  const integrations = integrationsData?.integrations ?? [];
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [testing, setTesting] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t("integrationManager.title")}
        </h1>
        <p className="text-sm text-slate-500">{t("integrationManager.subtitle")}</p>
      </div>

      <div className="grid gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-100 p-2">
                    <Plug className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{integration.domainLabel}</CardTitle>
                    <p className="text-sm text-slate-500">{integration.provider}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {healthIcon(integration.health)}
                  <Badge variant={healthBadge(integration.health)} className="capitalize text-xs">
                    {integration.health}
                  </Badge>
                  <Badge
                    variant={integration.isConnected ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {integration.isConnected
                      ? t("integrationManager.connected")
                      : t("integrationManager.disconnected")}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">{t("integrationManager.lastSync")}:</span>{" "}
                  <span className="font-medium">{formatSyncTime(integration.lastSyncAt)}</span>
                </div>
                {integration.webhookUrl && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{t("integrationManager.webhook")}:</span>
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono truncate max-w-[200px]">
                      {integration.webhookUrl}
                    </code>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {integration.apiKeyMasked && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">{t("integrationManager.apiKey")}:</span>
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">
                    {revealedKeys.has(integration.id)
                      ? "sk_live_EXAMPLE_REPLACE_WITH_REAL_KEY"
                      : integration.apiKeyMasked}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleReveal(integration.id)}
                  >
                    {revealedKeys.has(integration.id) ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}

              <Separator />
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    toast({
                      title: t("integrationManager.configure"),
                      description: t("integrationManager.configureComingSoon"),
                    })
                  }
                >
                  <Settings className="h-3.5 w-3.5" /> {t("integrationManager.configure")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={testing === integration.id}
                  onClick={async () => {
                    setTesting(integration.id);
                    try {
                      const result = await gateway.request("integrations.health", {
                        providerId: integration.id,
                      });
                      toast({
                        title: t("integrationManager.connectionTest"),
                        description: `${integration.domainLabel}: ${(result as Record<string, unknown>)?.status ?? "healthy"}`,
                      });
                    } catch {
                      toast({
                        title: t("integrationManager.connectionFailed"),
                        description: t("integrationManager.couldNotReach", {
                          provider: integration.provider,
                        }),
                        variant: "destructive",
                      });
                    } finally {
                      setTesting(null);
                    }
                  }}
                >
                  {testing === integration.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}{" "}
                  {t("integrationManager.testConnection")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
