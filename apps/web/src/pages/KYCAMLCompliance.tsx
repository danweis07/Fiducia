import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  Globe,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/AppShell";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useAMLScreen,
  useAMLMonitoring,
  useAMLAlerts,
  useReviewAMLAlert,
  useUpdateAMLMonitoring,
} from "@/hooks/useAMLScreening";
import type {
  ScreeningRiskLevel,
  MonitoringSubscription,
  MonitoringAlert,
  WatchlistSource,
} from "@/types";

// ---------------------------------------------------------------------------
// Risk level badge config
// ---------------------------------------------------------------------------

const riskLabelKeys: Record<ScreeningRiskLevel, string> = {
  no_match: "kycAml.riskLevel.clear",
  low: "kycAml.riskLevel.low",
  medium: "kycAml.riskLevel.medium",
  high: "kycAml.riskLevel.high",
  confirmed: "kycAml.riskLevel.confirmed",
};

const riskConfig: Record<ScreeningRiskLevel, { className: string; icon: React.ElementType }> = {
  no_match: { className: "bg-green-100 text-green-800", icon: CheckCircle },
  low: { className: "bg-blue-100 text-blue-700", icon: Eye },
  medium: { className: "bg-yellow-100 text-yellow-800", icon: Clock },
  high: { className: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  confirmed: { className: "bg-red-100 text-red-800", icon: XCircle },
};

const watchlistLabelKeys: Record<WatchlistSource, string> = {
  ofac_sdn: "kycAml.watchlist.ofacSdn",
  ofac_non_sdn: "kycAml.watchlist.ofacNonSdn",
  un_sanctions: "kycAml.watchlist.unSanctions",
  eu_sanctions: "kycAml.watchlist.euSanctions",
  uk_hmt: "kycAml.watchlist.ukHmt",
  pep: "kycAml.watchlist.pep",
  adverse_media: "kycAml.watchlist.adverseMedia",
  law_enforcement: "kycAml.watchlist.lawEnforcement",
  custom: "kycAml.watchlist.custom",
};

// ---------------------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------------------

export default function KYCAMLCompliance() {
  const { t } = useTranslation("banking");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("screening");

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              {t("kycAml.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("kycAml.subtitle")}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="screening">{t("kycAml.tabs.screening")}</TabsTrigger>
            <TabsTrigger value="monitoring">{t("kycAml.tabs.monitoring")}</TabsTrigger>
            <TabsTrigger value="alerts">{t("kycAml.tabs.alerts")}</TabsTrigger>
          </TabsList>

          <TabsContent value="screening" className="space-y-4">
            <ScreeningTab toast={toast} />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <MonitoringTab toast={toast} />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <AlertsTab toast={toast} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// SCREENING TAB
// ---------------------------------------------------------------------------

function ScreeningTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { t } = useTranslation("banking");
  const screenMutation = useAMLScreen();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    nationality: "",
    entityType: "individual" as "individual" | "organization",
    enableMonitoring: false,
  });

  const handleScreen = async () => {
    if (!form.customerId || !form.firstName || !form.lastName) {
      toast({ title: t("kycAml.screening.missingFields"), variant: "destructive" });
      return;
    }

    try {
      await screenMutation.mutateAsync({
        subject: {
          customerId: form.customerId,
          firstName: form.firstName,
          lastName: form.lastName,
          dateOfBirth: form.dateOfBirth || undefined,
          nationality: form.nationality || undefined,
          entityType: form.entityType,
        },
        enableMonitoring: form.enableMonitoring,
      });
      toast({ title: t("kycAml.screening.complete") });
      setShowDialog(false);
    } catch {
      toast({ title: t("kycAml.screening.failed"), variant: "destructive" });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t("kycAml.screening.watchlistScreening")}
        </h2>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Search className="h-4 w-4 mr-2" />
              {t("kycAml.screening.newScreening")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("kycAml.screening.dialogTitle")}</DialogTitle>
              <DialogDescription>{t("kycAml.screening.dialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("kycAml.screening.customerId")}</Label>
                <Input
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("kycAml.screening.firstName")}</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("kycAml.screening.lastName")}</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("kycAml.screening.dateOfBirth")}</Label>
                  <Input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("kycAml.screening.nationality")}</Label>
                  <Input
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                    placeholder="US"
                  />
                </div>
              </div>
              <div>
                <Label>{t("kycAml.screening.entityType")}</Label>
                <Select
                  value={form.entityType}
                  onValueChange={(v) =>
                    setForm({ ...form, entityType: v as "individual" | "organization" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{t("kycAml.screening.individual")}</SelectItem>
                    <SelectItem value="organization">
                      {t("kycAml.screening.organization")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableMonitoring"
                  checked={form.enableMonitoring}
                  onChange={(e) => setForm({ ...form, enableMonitoring: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="enableMonitoring">{t("kycAml.screening.enableMonitoring")}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {t("kycAml.screening.cancel")}
              </Button>
              <Button onClick={handleScreen} disabled={screenMutation.isPending}>
                {screenMutation.isPending
                  ? t("kycAml.screening.screening")
                  : t("kycAml.screening.runScreening")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {screenMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("kycAml.screening.latestResult")}</span>
              <RiskBadge level={screenMutation.data.screening.riskLevel} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t("kycAml.screening.screeningId")}</span>
                <p className="font-mono text-xs">{screenMutation.data.screening.screeningId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("kycAml.screening.totalMatches")}</span>
                <p className="font-semibold">{screenMutation.data.screening.totalMatches}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("kycAml.screening.provider")}</span>
                <p>{screenMutation.data.screening.provider}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("kycAml.screening.screenedAt")}</span>
                <p>{new Date(screenMutation.data.screening.screenedAt).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                {t("kycAml.screening.watchlistsChecked")}
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {screenMutation.data.screening.watchlistsChecked.map((wl) => (
                  <Badge key={wl} variant="outline" className="text-xs">
                    {t(watchlistLabelKeys[wl]) ?? wl}
                  </Badge>
                ))}
              </div>
            </div>
            {screenMutation.data.screening.matches.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">{t("kycAml.screening.matches")}</span>
                {screenMutation.data.screening.matches.map((match) => (
                  <div key={match.matchId} className="border rounded p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{match.matchedName}</span>
                      <RiskBadge level={match.riskLevel} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("kycAml.screening.source")}:{" "}
                      {t(watchlistLabelKeys[match.source]) ?? match.source} |{" "}
                      {t("kycAml.screening.score")}: {(match.score * 100).toFixed(0)}%
                    </div>
                    {match.details.listingReason && (
                      <p className="text-xs">{match.details.listingReason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!screenMutation.data && !screenMutation.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">{t("kycAml.screening.noRecentScreenings")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("kycAml.screening.noRecentScreeningsDesc")}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// MONITORING TAB
// ---------------------------------------------------------------------------

function MonitoringTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { t } = useTranslation("banking");
  const { data, isLoading } = useAMLMonitoring();
  const updateMutation = useUpdateAMLMonitoring();

  if (isLoading) return <PageSkeleton />;

  const subscriptions = data?.subscriptions ?? [];

  const handleToggle = async (sub: MonitoringSubscription) => {
    const newStatus = sub.status === "active" ? "paused" : "active";
    try {
      await updateMutation.mutateAsync({
        subscriptionId: sub.subscriptionId,
        status: newStatus,
      });
      toast({ title: t("kycAml.monitoring.monitoringStatus", { status: newStatus }) });
    } catch {
      toast({ title: t("kycAml.monitoring.updateFailed"), variant: "destructive" });
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <RefreshCw className="h-5 w-5" />
        {t("kycAml.monitoring.title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("kycAml.monitoring.description")}</p>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">{t("kycAml.monitoring.noActive")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("kycAml.monitoring.noActiveDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <Card key={sub.subscriptionId}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{sub.customerId}</span>
                    <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                      {sub.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("kycAml.monitoring.refreshSchedule", {
                      hours: sub.refreshIntervalHours,
                      last: new Date(sub.lastScreenedAt).toLocaleDateString(),
                      next: new Date(sub.nextScreeningAt).toLocaleDateString(),
                    })}
                  </div>
                  <div className="flex gap-1">
                    {sub.watchlists.map((wl) => (
                      <Badge key={wl} variant="outline" className="text-xs">
                        {t(watchlistLabelKeys[wl]) ?? wl}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(sub)}
                  disabled={updateMutation.isPending}
                >
                  {sub.status === "active"
                    ? t("kycAml.monitoring.pause")
                    : t("kycAml.monitoring.resume")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// ALERTS TAB
// ---------------------------------------------------------------------------

function AlertsTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { t } = useTranslation("banking");
  const { data, isLoading } = useAMLAlerts({ unreviewedOnly: false });
  const reviewMutation = useReviewAMLAlert();
  const [reviewDialog, setReviewDialog] = useState<MonitoringAlert | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [confirmedMatch, setConfirmedMatch] = useState(false);

  if (isLoading) return <PageSkeleton />;

  const alerts = data?.alerts ?? [];

  const handleReview = async () => {
    if (!reviewDialog) return;
    try {
      await reviewMutation.mutateAsync({
        alertId: reviewDialog.alertId,
        confirmedMatch,
        notes: reviewNotes,
      });
      toast({ title: t("kycAml.alerts.alertReviewed") });
      setReviewDialog(null);
      setReviewNotes("");
    } catch {
      toast({ title: t("kycAml.alerts.reviewFailed"), variant: "destructive" });
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        {t("kycAml.alerts.title")}
      </h2>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="font-semibold">{t("kycAml.alerts.noAlerts")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t("kycAml.alerts.noAlertsDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.alertId}>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{alert.customerId}</span>
                    <Badge variant={alert.reviewed ? "secondary" : "destructive"}>
                      {alert.reviewed
                        ? t("kycAml.alerts.reviewed")
                        : t("kycAml.alerts.pendingReview")}
                    </Badge>
                    <Badge variant="outline">{alert.changeType.replace("_", " ")}</Badge>
                  </div>
                  {!alert.reviewed && (
                    <Button variant="outline" size="sm" onClick={() => setReviewDialog(alert)}>
                      {t("kycAml.alerts.review")}
                    </Button>
                  )}
                </div>
                <div className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{alert.match.matchedName}</span>
                    <RiskBadge level={alert.match.riskLevel} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("kycAml.screening.source")}:{" "}
                    {t(watchlistLabelKeys[alert.match.source]) ?? alert.match.source} |{" "}
                    {t("kycAml.screening.score")}: {(alert.match.score * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("kycAml.alerts.alerted")}: {new Date(alert.alertedAt).toLocaleString()}
                  {alert.reviewedAt &&
                    ` | ${t("kycAml.alerts.reviewed")}: ${new Date(alert.reviewedAt).toLocaleString()}`}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!reviewDialog}
        onOpenChange={(open) => {
          if (!open) setReviewDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("kycAml.alerts.reviewAlertTitle")}</DialogTitle>
            <DialogDescription>{t("kycAml.alerts.reviewAlertDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("kycAml.alerts.decision")}</Label>
              <Select
                value={confirmedMatch ? "true" : "false"}
                onValueChange={(v) => setConfirmedMatch(v === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t("kycAml.alerts.truePositive")}</SelectItem>
                  <SelectItem value="false">{t("kycAml.alerts.falsePositive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("kycAml.alerts.notes")}</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={t("kycAml.alerts.notesPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>
              {t("kycAml.alerts.cancel")}
            </Button>
            <Button onClick={handleReview} disabled={reviewMutation.isPending || !reviewNotes}>
              {reviewMutation.isPending
                ? t("kycAml.alerts.submitting")
                : t("kycAml.alerts.submitReview")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// SHARED COMPONENTS
// ---------------------------------------------------------------------------

function RiskBadge({ level }: { level: ScreeningRiskLevel }) {
  const { t } = useTranslation("banking");
  const config = riskConfig[level];
  const Icon = config.icon;
  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {t(riskLabelKeys[level])}
    </Badge>
  );
}
