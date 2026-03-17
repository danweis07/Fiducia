import { useState } from "react";
import {
  Shield,
  ShieldOff,
  Eye,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Globe,
  ExternalLink,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  useInternationalConsents,
  useInternationalConsentSummary,
  useInternationalConsentAccessLogs,
  useRevokeInternationalConsent,
  useRevokeInternationalConsentScope,
} from "@/hooks/useInternationalConsents";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type {
  InternationalConsent,
  InternationalConsentStatus,
  InternationalConsentScope,
} from "@/types";

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const statusConfig: Record<
  InternationalConsentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Active", variant: "default" },
  revoked: { label: "Revoked", variant: "destructive" },
  expired: { label: "Expired", variant: "secondary" },
  pending_reauth: { label: "Awaiting Reauth", variant: "outline" },
};

const scopeLabels: Record<string, string> = {
  account_info: "Account Information",
  balances: "Account Balances",
  transactions: "Transaction History",
  transfer_initiate: "Payment Initiation",
  identity: "Identity Data",
  standing_orders: "Standing Orders",
  direct_debits: "Direct Debits",
  beneficiaries: "Saved Payees",
};

const regulationLabels: Record<string, string> = {
  psd2: "PSD2",
  psd3: "PSD3",
  open_banking_uk: "UK Open Banking",
  open_finance_brazil: "Open Finance Brazil",
  cfpb_1033: "CFPB \u00A71033",
  cdp_australia: "CDR Australia",
};

type FilterTab = "all" | "active" | "revoked" | "expired" | "pending_reauth";

// ---------------------------------------------------------------------------
// Consent Card
// ---------------------------------------------------------------------------

function ConsentCard({
  consent,
  onRevoke,
  onRevokeScope,
}: {
  consent: InternationalConsent;
  onRevoke: (id: string) => void;
  onRevokeScope: (consentId: string, scope: InternationalConsentScope) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { label, variant } = statusConfig[consent.status];

  const isNearingReauth =
    consent.reauthorizationDeadline &&
    new Date(consent.reauthorizationDeadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

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
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium truncate">{consent.providerName}</h3>
                <Badge variant={variant}>{label}</Badge>
                {consent.regulation && (
                  <Badge variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {regulationLabels[consent.regulation] ?? consent.regulation}
                  </Badge>
                )}
              </div>
              {consent.purpose && (
                <p className="text-sm text-muted-foreground mt-0.5">{consent.purpose}</p>
              )}
              <p className="text-sm text-muted-foreground mt-0.5">
                Connected {new Date(consent.consentGrantedAt).toLocaleDateString()}
                {consent.lastAccessedAt && (
                  <> &middot; Last accessed {new Date(consent.lastAccessedAt).toLocaleDateString()}</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {consent.status === "active" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRevoke(consent.id)}
              >
                <ShieldOff className="h-4 w-4 mr-1" />
                Revoke All
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-3 border-t space-y-3">
            {/* Reauthorization deadline warning */}
            {consent.reauthorizationDeadline && (
              <div
                className={`flex items-center gap-1.5 text-sm ${
                  isNearingReauth ? "text-orange-600 font-medium" : "text-muted-foreground"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Reauthorization deadline: {new Date(consent.reauthorizationDeadline).toLocaleDateString()}
                {isNearingReauth && " — action required soon"}
              </div>
            )}

            {/* Scopes with individual revoke */}
            <div>
              <p className="text-sm font-medium mb-1">Data Access Scopes</p>
              <div className="space-y-1.5">
                {consent.scopes.map((scope) => (
                  <div key={scope} className="flex items-center justify-between">
                    <Badge variant="outline">
                      <Lock className="h-3 w-3 mr-1" />
                      {scopeLabels[scope] ?? scope}
                    </Badge>
                    {consent.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7 text-xs"
                        onClick={() => onRevokeScope(consent.id, scope as InternationalConsentScope)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {consent.consentExpiresAt && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Expires {new Date(consent.consentExpiresAt).toLocaleDateString()}
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
                Visit {consent.providerName}
              </a>
            )}

            {consent.consentRevokedAt && (
              <p className="text-sm text-muted-foreground">
                Revoked on {new Date(consent.consentRevokedAt).toLocaleDateString()}
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
  const { data, isLoading } = useInternationalConsentAccessLogs();

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading access logs...</div>;

  const logs = data?.accessLogs ?? [];
  if (logs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Recent Data Access
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.slice(0, 10).map((log) => (
            <div key={log.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
              <div>
                <span className="font-medium">{log.providerName}</span>
                <span className="text-muted-foreground ml-2">accessed {scopeLabels[log.scope] ?? log.scope}</span>
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

export default function ConsentDashboard() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revokeScopeTarget, setRevokeScopeTarget] = useState<{
    consentId: string;
    scope: InternationalConsentScope;
  } | null>(null);

  const statusFilter: InternationalConsentStatus | undefined =
    activeTab === "all" ? undefined : (activeTab as InternationalConsentStatus);

  const { data, isLoading, error } = useInternationalConsents(statusFilter);
  const { data: summaryData } = useInternationalConsentSummary();
  const revokeMutation = useRevokeInternationalConsent();
  const revokeScopeMutation = useRevokeInternationalConsentScope();
  const { toast } = useToast();
  const handleError = useErrorHandler();

  if (isLoading) return <PageSkeleton />;
  if (error) return <EmptyState icon={AlertTriangle} title="Failed to load consents" description="Please try again later." />;

  const consents = data?.consents ?? [];
  const summary = summaryData?.summary;

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeMutation.mutateAsync(revokeTarget);
      toast({ title: "Consent revoked", description: "All third-party access has been removed." });
    } catch (err) {
      handleError(err);
    } finally {
      setRevokeTarget(null);
    }
  };

  const handleRevokeScope = async () => {
    if (!revokeScopeTarget) return;
    try {
      await revokeScopeMutation.mutateAsync(revokeScopeTarget);
      toast({
        title: "Scope revoked",
        description: `Access to ${scopeLabels[revokeScopeTarget.scope] ?? revokeScopeTarget.scope} has been removed.`,
      });
    } catch (err) {
      handleError(err);
    } finally {
      setRevokeScopeTarget(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Consent Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage third-party access to your financial data. PSD3 and Open Finance compliant consent management.
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.activeConsents}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{summary.totalConsents}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.revokedConsents}</div>
              <div className="text-xs text-muted-foreground">Revoked</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{summary.expiredConsents}</div>
              <div className="text-xs text-muted-foreground">Expired</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{summary.pendingReauthConsents}</div>
              <div className="text-xs text-muted-foreground">Pending Reauth</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Regulatory Notice */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Your Data, Your Control</p>
              <p className="text-blue-700 mt-0.5">
                Under PSD3 and Open Finance regulations, you have full control over which third parties
                can access your financial data. You can revoke any connection — or individual data scopes — at
                any time with one click. Consent must be reauthorized periodically to ensure ongoing agreement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="revoked">Revoked</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="pending_reauth">Awaiting Reauth</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {consents.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No connected services"
              description="When you connect a third-party app to your account, it will appear here."
            />
          ) : (
            <div>
              {consents.map((consent) => (
                <ConsentCard
                  key={consent.id}
                  consent={consent}
                  onRevoke={setRevokeTarget}
                  onRevokeScope={(consentId, scope) =>
                    setRevokeScopeTarget({ consentId, scope })
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Access Logs */}
      <AccessLogSection />

      {/* Revoke All Confirmation Dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke All Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately disconnect the third-party service from your account.
              They will no longer be able to access any of your financial data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Scope Confirmation Dialog */}
      <AlertDialog open={!!revokeScopeTarget} onOpenChange={() => setRevokeScopeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Scope Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access to{" "}
              <strong>
                {revokeScopeTarget
                  ? scopeLabels[revokeScopeTarget.scope] ?? revokeScopeTarget.scope
                  : ""}
              </strong>{" "}
              for this provider. Other data access permissions will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeScope} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Scope
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
