import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Plus, Trash2, Edit2, History, TrendingUp } from "lucide-react";
import {
  useSpendingAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useAlertHistory,
  useAlertSummary,
} from "@/hooks/useSpendingAlerts";
import { useAccounts } from "@/hooks/useAccounts";
import { useToast } from "@/hooks/use-toast";
import type { SpendingAlertType, SpendingAlertRule } from "@/types";

const ALERT_TYPES: { value: SpendingAlertType; label: string }[] = [
  { value: "balance_below", label: "Balance Falls Below" },
  { value: "balance_above", label: "Balance Rises Above" },
  { value: "transaction_above", label: "Transaction Above Amount" },
  { value: "daily_spending_above", label: "Daily Spending Exceeds" },
  { value: "category_spending", label: "Category Spending" },
  { value: "large_withdrawal", label: "Large Withdrawal" },
  { value: "international_transaction", label: "International Transaction" },
];

const CHANNELS = ["push", "email", "sms"] as const;

export default function SpendingAlertsPage() {
  const { t } = useTranslation("banking");
  const { toast } = useToast();
  const { data: alertsData, isLoading } = useSpendingAlerts();
  const alerts = alertsData?.alerts ?? [];
  const { data: historyData } = useAlertHistory();
  const historyEvents = historyData?.events ?? [];
  const { data: summaryData } = useAlertSummary();
  const summary = summaryData?.summary;
  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.accounts ?? [];

  const createAlert = useCreateAlert();
  const updateAlert = useUpdateAlert();
  const deleteAlert = useDeleteAlert();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<SpendingAlertRule | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<SpendingAlertType>("balance_below");
  const [formThreshold, setFormThreshold] = useState("");
  const [formAccountId, setFormAccountId] = useState("");
  const [formChannels, setFormChannels] = useState<Set<string>>(new Set(["push"]));

  const resetForm = () => {
    setFormName("");
    setFormType("balance_below");
    setFormThreshold("");
    setFormAccountId("");
    setFormChannels(new Set(["push"]));
    setEditingAlert(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (alert: SpendingAlertRule) => {
    setEditingAlert(alert);
    setFormName(alert.name);
    setFormType(alert.alertType);
    setFormThreshold(alert.thresholdCents ? (alert.thresholdCents / 100).toString() : "");
    setFormAccountId(alert.accountId ?? "");
    setFormChannels(new Set(alert.channels));
    setDialogOpen(true);
  };

  const handleSave = () => {
    const channels = Array.from(formChannels) as ("push" | "email" | "sms")[];
    if (!formName) {
      toast({ title: t("spendingAlerts.nameRequired"), variant: "destructive" });
      return;
    }

    if (editingAlert) {
      updateAlert.mutate(
        {
          alertId: editingAlert.id,
          name: formName,
          alertType: formType,
          thresholdCents: formThreshold ? Math.round(parseFloat(formThreshold) * 100) : undefined,
          accountId: formAccountId || undefined,
          channels,
        },
        {
          onSuccess: () => {
            toast({ title: t("spendingAlerts.alertUpdated") });
            setDialogOpen(false);
            resetForm();
          },
          onError: () =>
            toast({ title: t("spendingAlerts.failedToUpdateAlert"), variant: "destructive" }),
        },
      );
    } else {
      createAlert.mutate(
        {
          name: formName,
          alertType: formType,
          thresholdCents: formThreshold ? Math.round(parseFloat(formThreshold) * 100) : undefined,
          accountId: formAccountId || undefined,
          channels,
        },
        {
          onSuccess: () => {
            toast({ title: t("spendingAlerts.alertCreated") });
            setDialogOpen(false);
            resetForm();
          },
          onError: () =>
            toast({ title: t("spendingAlerts.failedToCreateAlert"), variant: "destructive" }),
        },
      );
    }
  };

  const handleToggle = (alert: SpendingAlertRule, enabled: boolean) => {
    updateAlert.mutate({ alertId: alert.id, isEnabled: enabled });
  };

  const handleDelete = (alertId: string) => {
    deleteAlert.mutate(alertId, {
      onSuccess: () => toast({ title: t("spendingAlerts.alertDeleted") }),
    });
  };

  const toggleChannel = (channel: string) => {
    setFormChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });
  };

  const formatCents = (cents: number | null) =>
    cents != null ? `$${(cents / 100).toFixed(2)}` : "-";
  const needsThreshold = (alertType: SpendingAlertType) =>
    alertType !== "international_transaction";

  return (
    <AppShell>
      <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              {t("spendingAlerts.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("spendingAlerts.subtitle")}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                {t("spendingAlerts.newAlert")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAlert ? t("spendingAlerts.editAlert") : t("spendingAlerts.createAlert")}
                </DialogTitle>
                <DialogDescription>{t("spendingAlerts.configureNotification")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t("spendingAlerts.alertName")}</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t("spendingAlerts.alertNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("spendingAlerts.alertType")}</Label>
                  <Select
                    value={formType}
                    onValueChange={(v) => setFormType(v as SpendingAlertType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_TYPES.map((at) => (
                        <SelectItem key={at.value} value={at.value}>
                          {at.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {needsThreshold(formType) && (
                  <div className="space-y-2">
                    <Label>{t("spendingAlerts.threshold")}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formThreshold}
                      onChange={(e) => setFormThreshold(e.target.value)}
                      placeholder="100.00"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t("spendingAlerts.accountOptional")}</Label>
                  <Select value={formAccountId} onValueChange={setFormAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("spendingAlerts.allAccounts")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("spendingAlerts.allAccounts")}</SelectItem>
                      {accounts
                        .filter((a) => a.status === "active")
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nickname || a.type} - {a.accountNumberMasked}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("spendingAlerts.notificationChannels")}</Label>
                  <div className="flex gap-4">
                    {CHANNELS.map((ch) => (
                      <div key={ch} className="flex items-center gap-2">
                        <Checkbox
                          id={`ch-${ch}`}
                          checked={formChannels.has(ch)}
                          onCheckedChange={() => toggleChannel(ch)}
                        />
                        <Label htmlFor={`ch-${ch}`} className="capitalize">
                          {ch}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("spendingAlerts.cancel")}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createAlert.isPending || updateAlert.isPending}
                >
                  {editingAlert ? t("spendingAlerts.update") : t("spendingAlerts.create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Bell className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{summary.activeRules}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("spendingAlerts.activeRules")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{summary.triggeredThisWeek}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("spendingAlerts.triggeredThisWeek")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <History className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{summary.triggeredThisMonth}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("spendingAlerts.triggeredThisMonth")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">{t("spendingAlerts.alertRules")}</TabsTrigger>
            <TabsTrigger value="history">{t("spendingAlerts.triggeredAlerts")}</TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t("spendingAlerts.loading")}
                </CardContent>
              </Card>
            ) : alerts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t("spendingAlerts.noAlertRules")}</p>
                  <Button className="mt-4" onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("spendingAlerts.createFirstAlert")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("spendingAlerts.name")}</TableHead>
                      <TableHead>{t("spendingAlerts.type")}</TableHead>
                      <TableHead>{t("spendingAlerts.thresholdLabel")}</TableHead>
                      <TableHead>{t("spendingAlerts.channels")}</TableHead>
                      <TableHead>{t("spendingAlerts.enabled")}</TableHead>
                      <TableHead className="w-24">{t("spendingAlerts.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert: SpendingAlertRule) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ALERT_TYPES.find((at) => at.value === alert.alertType)?.label ??
                              alert.alertType}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCents(alert.thresholdCents)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {alert.channels.map((ch) => (
                              <Badge key={ch} variant="secondary" className="text-xs capitalize">
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={alert.isEnabled}
                            onCheckedChange={(v) => handleToggle(alert, v)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(alert)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(alert.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("spendingAlerts.triggeredAlerts")}</CardTitle>
                <CardDescription>{t("spendingAlerts.recentNotifications")}</CardDescription>
              </CardHeader>
              <CardContent>
                {historyEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{t("spendingAlerts.noTriggeredAlerts")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("spendingAlerts.date")}</TableHead>
                        <TableHead>{t("spendingAlerts.alert")}</TableHead>
                        <TableHead>{t("spendingAlerts.type")}</TableHead>
                        <TableHead>{t("spendingAlerts.message")}</TableHead>
                        <TableHead>{t("spendingAlerts.amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyEvents.map(
                        (event: {
                          id: string;
                          triggeredAt: string;
                          ruleName: string;
                          alertType: string;
                          message: string;
                          amountCents: number | null;
                        }) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              {new Date(event.triggeredAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">{event.ruleName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{event.alertType.replace(/_/g, " ")}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{event.message}</TableCell>
                            <TableCell>{formatCents(event.amountCents)}</TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </AppShell>
  );
}
