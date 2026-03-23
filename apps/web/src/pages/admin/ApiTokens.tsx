import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Key, Plus, Shield, Copy, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatBankingDate } from "@/lib/common/date";
import { gateway } from "@/lib/gateway";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type { CMSApiToken, CMSChannel } from "@/types/admin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ApiTokens() {
  const { t } = useTranslation("admin");
  const [tokens, setTokens] = useState<CMSApiToken[]>([]);
  const [channels, setChannels] = useState<CMSChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTokenResult, setNewTokenResult] = useState<CMSApiToken | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({
    name: "",
    scopes: ["read"] as string[],
    restrictChannels: false,
    allowedChannels: [] as string[],
    rateLimit: 1000,
    expiresInDays: "",
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tokenRes, channelRes] = await Promise.all([
        gateway.cmsTokens.list(),
        gateway.cms.listChannels(),
      ]);
      setTokens(tokenRes.tokens);
      setChannels(channelRes.channels);
    } catch {
      // silent
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    const expiresAt = form.expiresInDays
      ? new Date(Date.now() + Number(form.expiresInDays) * 86400000).toISOString()
      : null;

    const result = await gateway.cmsTokens.create({
      name: form.name,
      scopes: form.scopes,
      allowedChannels: form.restrictChannels ? form.allowedChannels : null,
      rateLimit: form.rateLimit,
      expiresAt,
    });

    setNewTokenResult(result.token);
    setCreateOpen(false);
    loadData();
  };

  const handleRevoke = async (id: string) => {
    await gateway.cmsTokens.revoke(id);
    loadData();
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleScope = (scope: string) => {
    setForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const toggleChannelRestriction = (slug: string) => {
    setForm((prev) => ({
      ...prev,
      allowedChannels: prev.allowedChannels.includes(slug)
        ? prev.allowedChannels.filter((c) => c !== slug)
        : [...prev.allowedChannels, slug],
    }));
  };

  // Split tokens
  const activeTokens = tokens.filter((t) => !t.isRevoked);
  const revokedTokens = tokens.filter((t) => t.isRevoked);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("apiTokens.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("apiTokens.description")}</p>
        </div>
        <Button
          onClick={() => {
            setForm({
              name: "",
              scopes: ["read"],
              restrictChannels: false,
              allowedChannels: [],
              rateLimit: 1000,
              expiresInDays: "",
            });
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("apiTokens.createToken")}
        </Button>
      </div>

      {/* Security notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>{t("apiTokens.securityNotice.title")}</AlertTitle>
        <AlertDescription>{t("apiTokens.securityNotice.description")}</AlertDescription>
      </Alert>

      {/* New token result banner */}
      {newTokenResult?.rawToken && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">{t("apiTokens.newTokenBanner.title")}</AlertTitle>
          <AlertDescription>
            <p className="text-sm text-green-700 mb-2">
              {t("apiTokens.newTokenBanner.storeSecurely")}
            </p>
            <div className="flex items-center gap-2 bg-white border border-green-200 rounded p-2">
              <code className="text-xs flex-1 break-all font-mono">{newTokenResult.rawToken}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => copyToClipboard(newTokenResult.rawToken!, "new")}
              >
                {copiedId === "new" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-green-600 mt-2">{t("apiTokens.newTokenBanner.usageHint")}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setNewTokenResult(null)}
            >
              {t("apiTokens.newTokenBanner.dismiss")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Active tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("apiTokens.activeTokens.title", { count: activeTokens.length })}
          </CardTitle>
          <CardDescription>{t("apiTokens.activeTokens.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {activeTokens.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("apiTokens.activeTokens.emptyMessage")}
            </p>
          ) : (
            <div className="space-y-3">
              {activeTokens.map((token) => {
                const expired = isExpired(token.expiresAt);
                return (
                  <div
                    key={token.id}
                    className="flex items-start justify-between gap-4 p-3 rounded-lg border"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{token.name}</span>
                        {expired && (
                          <Badge variant="destructive" className="text-xs">
                            {t("apiTokens.expired")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">
                          {token.tokenPrefix}...
                        </code>
                        <span className="text-xs text-muted-foreground">
                          &middot; {token.rateLimit} req/hr
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {token.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                        {token.allowedChannels ? (
                          token.allowedChannels.map((ch) => (
                            <Badge key={ch} variant="secondary" className="text-xs">
                              {ch}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {t("apiTokens.allChannels")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          {t("apiTokens.created", { date: formatBankingDate(token.createdAt) })}
                        </span>
                        <span>
                          {t("apiTokens.lastUsed", {
                            date: token.lastUsedAt ? formatBankingDate(token.lastUsedAt) : "Never",
                          })}
                        </span>
                        {token.expiresAt && (
                          <span className={expired ? "text-red-500" : ""}>
                            {expired ? t("apiTokens.expired") : t("apiTokens.expires")}{" "}
                            {formatBankingDate(token.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                      onClick={() => handleRevoke(token.id)}
                    >
                      {t("apiTokens.revoke")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoked tokens */}
      {revokedTokens.length > 0 && (
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-base">
              {t("apiTokens.revokedTokens.title", { count: revokedTokens.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {revokedTokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-2 rounded bg-slate-50 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="line-through">{token.name}</span>
                    <code className="text-xs text-muted-foreground">{token.tokenPrefix}...</code>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatBankingDate(token.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("apiTokens.integrationGuide.title")}</CardTitle>
          <CardDescription>{t("apiTokens.integrationGuide.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">{t("apiTokens.integrationGuide.endpoint")}</h4>
            <code className="text-xs bg-slate-100 px-3 py-1.5 rounded block font-mono">
              GET /functions/v1/content-api?channel=web_portal
            </code>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">
              {t("apiTokens.integrationGuide.authentication")}
            </h4>
            <code className="text-xs bg-slate-100 px-3 py-1.5 rounded block font-mono">
              Authorization: Bearer cms_xxxx_sk_live_...
            </code>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">
              {t("apiTokens.integrationGuide.queryParameters")}
            </h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>
                <code className="bg-slate-100 px-1 rounded">channel</code> —{" "}
                {t("apiTokens.integrationGuide.channelParam")}
              </p>
              <p>
                <code className="bg-slate-100 px-1 rounded">content_type</code> —{" "}
                {t("apiTokens.integrationGuide.contentTypeParam")}
              </p>
              <p>
                <code className="bg-slate-100 px-1 rounded">slug</code> —{" "}
                {t("apiTokens.integrationGuide.slugParam")}
              </p>
              <p>
                <code className="bg-slate-100 px-1 rounded">locale</code> —{" "}
                {t("apiTokens.integrationGuide.localeParam")}
              </p>
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-2">
              {t("apiTokens.integrationGuide.compatiblePlatforms")}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {[
                "WordPress",
                "Contentful",
                "Strapi",
                "Sanity",
                "Prismic",
                "Directus",
                "Ghost",
                "Custom",
              ].map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-1.5 p-2 rounded border bg-slate-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("apiTokens.createDialog.title")}</DialogTitle>
            <DialogDescription>{t("apiTokens.createDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("apiTokens.createDialog.tokenNameLabel")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("apiTokens.createDialog.tokenNamePlaceholder")}
              />
            </div>

            <div>
              <Label className="mb-2 block">
                {t("apiTokens.createDialog.permissionScopesLabel")}
              </Label>
              <div className="flex gap-2">
                {["read", "write", "publish", "admin"].map((scope) => (
                  <Button
                    key={scope}
                    variant={form.scopes.includes(scope) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleScope(scope)}
                  >
                    {scope}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("apiTokens.createDialog.scopesHint")}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t("apiTokens.createDialog.restrictChannelsLabel")}</Label>
                <Switch
                  checked={form.restrictChannels}
                  onCheckedChange={(v) => setForm({ ...form, restrictChannels: v })}
                />
              </div>
              {form.restrictChannels && (
                <div className="flex flex-wrap gap-2">
                  {channels
                    .filter((ch) => ch.isActive)
                    .map((ch) => (
                      <Button
                        key={ch.slug}
                        variant={form.allowedChannels.includes(ch.slug) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleChannelRestriction(ch.slug)}
                      >
                        {ch.label}
                      </Button>
                    ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("apiTokens.createDialog.rateLimitLabel")}</Label>
                <Select
                  value={String(form.rateLimit)}
                  onValueChange={(v) => setForm({ ...form, rateLimit: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1,000</SelectItem>
                    <SelectItem value="5000">5,000</SelectItem>
                    <SelectItem value="10000">10,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("apiTokens.createDialog.expiresInLabel")}</Label>
                <Select
                  value={form.expiresInDays}
                  onValueChange={(v) => setForm({ ...form, expiresInDays: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("apiTokens.createDialog.never")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("apiTokens.createDialog.never")}</SelectItem>
                    <SelectItem value="30">{t("apiTokens.createDialog.thirtyDays")}</SelectItem>
                    <SelectItem value="90">{t("apiTokens.createDialog.ninetyDays")}</SelectItem>
                    <SelectItem value="180">{t("apiTokens.createDialog.oneEightyDays")}</SelectItem>
                    <SelectItem value="365">{t("apiTokens.createDialog.oneYear")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("apiTokens.createDialog.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!form.name || form.scopes.length === 0}>
              {t("apiTokens.createDialog.createToken")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
