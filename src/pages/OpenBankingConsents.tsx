import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Shield,
  ShieldOff,
  ExternalLink,
  Clock,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  useOpenBankingConsents,
  useOpenBankingConsentSummary,
  useOpenBankingAccessLogs,
  useRevokeConsent,
} from "@/hooks/useOpenBanking";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { OpenBankingConsent, OpenBankingConsentStatus } from "@/types";

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const statusLabelKeys: Record<OpenBankingConsentStatus, string> = {
  active: "openBanking.status.active",
  revoked: "openBanking.status.revoked",
  expired: "openBanking.status.expired",
  suspended: "openBanking.status.suspended",
};

const scopeLabelKeys: Record<string, string> = {
  account_info: "openBanking.scope.accountInfo",
  balances: "openBanking.scope.balances",
  transactions: "openBanking.scope.transactions",
  transfer_initiate: "openBanking.scope.transfers",
  identity: "openBanking.scope.identity",
};

// ---------------------------------------------------------------------------
// Consent Card
// ---------------------------------------------------------------------------

function ConsentCard({
  consent,
  onRevoke,
}: {
  consent: OpenBankingConsent;
  onRevoke: (id: string) => void;
}) {
  const { t } = useTranslation("banking");
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="mb-3">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {consent.providerLogo ? (
              <img
                src={consent.providerLogo}
                alt={consent.providerName}
                className="h-10 w-10 rounded-lg object-contain border"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                {consent.providerName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{consent.providerName}</h3>
                <StatusBadge status={consent.status} label={t(statusLabelKeys[consent.status])} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("openBanking.connected", {
                  date: new Date(consent.consentGrantedAt).toLocaleDateString(),
                })}
                {consent.lastAccessedAt && (
                  <>
                    {" "}
                    &middot;{" "}
                    {t("openBanking.lastAccessed", {
                      date: new Date(consent.lastAccessedAt).toLocaleDateString(),
                    })}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {consent.status === "active" && (
              <Button variant="destructive" size="sm" onClick={() => onRevoke(consent.id)}>
                <ShieldOff className="h-4 w-4 mr-1" />
                {t("openBanking.revoke")}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-3 border-t space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">{t("openBanking.dataAccessScopes")}</p>
              <div className="flex flex-wrap gap-1.5">
                {consent.scopes.map((scope) => (
                  <Badge key={scope} variant="outline">
                    {t(scopeLabelKeys[scope]) ?? scope}
                  </Badge>
                ))}
              </div>
            </div>

            {consent.consentExpiresAt && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {t("openBanking.expires", {
                  date: new Date(consent.consentExpiresAt).toLocaleDateString(),
                })}
              </div>
            )}

            {consent.providerUrl && (
              <a
                href={consent.providerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("openBanking.visitProvider", { name: consent.providerName })}
              </a>
            )}

            {consent.consentRevokedAt && (
              <p className="text-sm text-muted-foreground">
                {t("openBanking.revokedOn", {
                  date: new Date(consent.consentRevokedAt).toLocaleDateString(),
                })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Access Log Section
// ---------------------------------------------------------------------------

function AccessLogSection() {
  const { t } = useTranslation("banking");
  const { data, isLoading } = useOpenBankingAccessLogs();

  if (isLoading)
    return (
      <div className="text-sm text-muted-foreground">{t("openBanking.loadingAccessLogs")}</div>
    );

  const logs = data?.accessLogs ?? [];
  if (logs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" />
          {t("openBanking.recentDataAccess")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.slice(0, 10).map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
            >
              <div>
                <span className="font-medium">{log.providerName}</span>
                <span className="text-muted-foreground ml-2">
                  {t("openBanking.accessed", { scope: t(scopeLabelKeys[log.scope]) ?? log.scope })}
                </span>
              </div>
              <span className="text-muted-foreground text-xs">
                {new Date(log.accessedAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function OpenBankingConsents() {
  const { t } = useTranslation("banking");
  const [statusFilter, setStatusFilter] = useState<OpenBankingConsentStatus | undefined>(undefined);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const { data, isLoading, error } = useOpenBankingConsents(statusFilter);
  const { data: summaryData } = useOpenBankingConsentSummary();
  const revokeMutation = useRevokeConsent();
  const { toast } = useToast();
  const handleError = useErrorHandler();

  if (isLoading) return <PageSkeleton />;
  if (error)
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t("openBanking.failedToLoad")}
        description={t("openBanking.tryAgainLater")}
      />
    );

  const consents = data?.consents ?? [];
  const summary = summaryData?.summary;

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeMutation.mutateAsync(revokeTarget);
      toast({
        title: t("openBanking.consentRevoked"),
        description: t("openBanking.consentRevokedDesc"),
      });
    } catch (err) {
      handleError(err);
    } finally {
      setRevokeTarget(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("openBanking.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("openBanking.subtitle")}</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.activeConsents}</div>
              <div className="text-xs text-muted-foreground">{t("openBanking.summaryActive")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{summary.totalConsents}</div>
              <div className="text-xs text-muted-foreground">{t("openBanking.summaryTotal")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.revokedConsents}</div>
              <div className="text-xs text-muted-foreground">{t("openBanking.summaryRevoked")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.recentAccessCount}</div>
              <div className="text-xs text-muted-foreground">
                {t("openBanking.summaryAccess30d")}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 1033 Notice */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">{t("openBanking.yourDataYourControl")}</p>
              <p className="text-blue-700 mt-0.5">{t("openBanking.section1033Notice")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2">
        {([undefined, "active", "revoked", "expired"] as const).map((s) => (
          <Button
            key={s ?? "all"}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s as OpenBankingConsentStatus | undefined)}
          >
            {s ? t(`openBanking.filter.${s}`) : t("openBanking.filter.all")}
          </Button>
        ))}
      </div>

      {/* Consent List */}
      {consents.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={t("openBanking.noConnectedServices")}
          description={t("openBanking.noConnectedServicesDesc")}
        />
      ) : (
        <div>
          {consents.map((consent) => (
            <ConsentCard key={consent.id} consent={consent} onRevoke={setRevokeTarget} />
          ))}
        </div>
      )}

      {/* Access Logs */}
      <AccessLogSection />

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("openBanking.revokeAccessTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("openBanking.revokeAccessDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("openBanking.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("openBanking.revokeAccess")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
