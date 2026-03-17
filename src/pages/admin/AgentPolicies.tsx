import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  Shield,
  Key,
  Activity,
  AlertTriangle,
  Plus,
  Trash2,
  Check,
  X,
  Play,
  Pause,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Inbox,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { gateway } from "@/lib/gateway";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

interface Stats {
  autonomousEnabled: boolean;
  pausedAt: string | null;
  last24h: { total: number; byStatus: Record<string, number> };
  last7dTotal: number;
  pendingEvents: number;
  pendingApprovals: number;
  activeRules: number;
  activeServiceAccounts: number;
}

interface ServiceAccount {
  id: string;
  name: string;
  description: string | null;
  api_key_suffix: string;
  status: string;
  allowed_actions: string[];
  rate_limit_per_hour: number;
  last_used_at: string | null;
  total_invocations: number;
  created_at: string;
}

interface ExecutionPolicy {
  id: string;
  action: string;
  approval: string;
  conditions: Record<string, unknown>;
  max_auto_per_hour: number;
  notify_on_auto: boolean;
  description: string | null;
  is_active: boolean;
}

interface Execution {
  id: string;
  action: string;
  action_params: Record<string, unknown>;
  status: string;
  policy_approval: string;
  result: Record<string, unknown> | null;
  error_message: string | null;
  target_user_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function approvalBadge(approval: string, t: (key: string) => string) {
  switch (approval) {
    case "auto_approve":
      return (
        <Badge className="bg-green-100 text-green-800">
          {t("agentPolicies.approval.autoApprove")}
        </Badge>
      );
    case "human_required":
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          {t("agentPolicies.approval.humanRequired")}
        </Badge>
      );
    case "disabled":
      return <Badge variant="destructive">{t("agentPolicies.approval.disabled")}</Badge>;
    default:
      return <Badge variant="secondary">{approval}</Badge>;
  }
}

function timeAgo(
  iso: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!iso) return t("agentPolicies.time.never");
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("agentPolicies.time.justNow");
  if (mins < 60) return t("agentPolicies.time.minutesAgo", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("agentPolicies.time.hoursAgo", { count: hrs });
  return t("agentPolicies.time.daysAgo", { count: Math.floor(hrs / 24) });
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function AgentPolicies() {
  const { t } = useTranslation("admin");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [policies, setPolicies] = useState<ExecutionPolicy[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);

  // Dialog states
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showCreatePolicy, setShowCreatePolicy] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: "",
    description: "",
    allowedActions: "cards.lock,cards.unlock",
    rateLimitPerHour: 100,
  });
  const [policyForm, setPolicyForm] = useState({
    action: "",
    approval: "human_required",
    maxAutoPerHour: 50,
    description: "",
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, accountsRes, policiesRes, execsRes] = await Promise.all([
        gateway.adminAutonomous.stats(),
        gateway.adminAutonomous.serviceAccounts.list(),
        gateway.adminAutonomous.policies.list(),
        gateway.adminAutonomous.executions.list({ limit: 20 }),
      ]);
      setStats(statsRes);
      setServiceAccounts(accountsRes.serviceAccounts as unknown as ServiceAccount[]);
      setPolicies(policiesRes.policies as unknown as ExecutionPolicy[]);
      setExecutions(execsRes.executions as unknown as Execution[]);
    } catch {
      // Set defaults for demo/mock
      setStats({
        autonomousEnabled: false,
        pausedAt: null,
        last24h: { total: 0, byStatus: {} },
        last7dTotal: 0,
        pendingEvents: 0,
        pendingApprovals: 0,
        activeRules: 0,
        activeServiceAccounts: 0,
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleAutonomous = async () => {
    if (!stats) return;
    try {
      const { autonomousEnabled } = await gateway.adminAutonomous.toggle(!stats.autonomousEnabled);
      setStats((prev) => (prev ? { ...prev, autonomousEnabled } : prev));
      toast({
        title: autonomousEnabled
          ? t("agentPolicies.toasts.autonomousEnabled")
          : t("agentPolicies.toasts.autonomousPaused"),
      });
    } catch {
      toast({ title: t("agentPolicies.toasts.toggleFailed"), variant: "destructive" });
    }
  };

  const handleCreateAccount = async () => {
    try {
      const actions = accountForm.allowedActions
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const result = await gateway.adminAutonomous.serviceAccounts.create({
        name: accountForm.name,
        description: accountForm.description || undefined,
        allowedActions: actions,
        rateLimitPerHour: accountForm.rateLimitPerHour,
      });
      setNewApiKey(result.serviceAccount.apiKey);
      setShowCreateAccount(false);
      loadData();
      toast({ title: t("agentPolicies.toasts.accountCreated") });
    } catch {
      toast({ title: t("agentPolicies.toasts.createAccountFailed"), variant: "destructive" });
    }
  };

  const handleRevokeAccount = async (id: string) => {
    try {
      await gateway.adminAutonomous.serviceAccounts.revoke(id);
      loadData();
      toast({ title: t("agentPolicies.toasts.accountRevoked") });
    } catch {
      toast({ title: t("agentPolicies.toasts.revokeFailed"), variant: "destructive" });
    }
  };

  const handleCreatePolicy = async () => {
    try {
      await gateway.adminAutonomous.policies.upsert({
        action: policyForm.action,
        approval: policyForm.approval,
        maxAutoPerHour: policyForm.maxAutoPerHour,
        description: policyForm.description || undefined,
      });
      setShowCreatePolicy(false);
      setPolicyForm({
        action: "",
        approval: "human_required",
        maxAutoPerHour: 50,
        description: "",
      });
      loadData();
      toast({ title: t("agentPolicies.toasts.policySaved") });
    } catch {
      toast({ title: t("agentPolicies.toasts.savePolicyFailed"), variant: "destructive" });
    }
  };

  const handleDeletePolicy = async (id: string) => {
    try {
      await gateway.adminAutonomous.policies.delete(id);
      loadData();
      toast({ title: t("agentPolicies.toasts.policyDeleted") });
    } catch {
      toast({ title: t("agentPolicies.toasts.deleteFailed"), variant: "destructive" });
    }
  };

  const handleApproveExecution = async (id: string) => {
    try {
      await gateway.adminAutonomous.executions.approve(id);
      loadData();
      toast({ title: t("agentPolicies.toasts.executionApproved") });
    } catch {
      toast({ title: t("agentPolicies.toasts.approveFailed"), variant: "destructive" });
    }
  };

  const handleRejectExecution = async (id: string) => {
    try {
      await gateway.adminAutonomous.executions.reject(id);
      loadData();
      toast({ title: t("agentPolicies.toasts.executionRejected") });
    } catch {
      toast({ title: t("agentPolicies.toasts.rejectFailed"), variant: "destructive" });
    }
  };

  const handleTriggerExecutor = async () => {
    try {
      const result = await gateway.adminAutonomous.trigger();
      loadData();
      toast({
        title: t("agentPolicies.toasts.executorTriggered", {
          events: result.totalEventsProcessed,
          actions: result.totalActionsExecuted,
        }),
      });
    } catch {
      toast({ title: t("agentPolicies.toasts.triggerFailed"), variant: "destructive" });
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("agentPolicies.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("agentPolicies.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerExecutor}
            title="Process pending events now"
          >
            <Zap className="h-4 w-4 mr-1" />
            {t("agentPolicies.runExecutor")}
          </Button>
          <Button
            variant={stats?.autonomousEnabled ? "destructive" : "default"}
            size="sm"
            onClick={handleToggleAutonomous}
          >
            {stats?.autonomousEnabled ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                {t("agentPolicies.pauseAll")}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                {t("agentPolicies.enable")}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KILL SWITCH WARNING */}
      {!stats?.autonomousEnabled && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("agentPolicies.disabledAlertTitle")}</AlertTitle>
          <AlertDescription>
            {t("agentPolicies.disabledAlertDescription")}
            {stats?.pausedAt &&
              ` ${t("agentPolicies.pausedAgo", { time: timeAgo(stats.pausedAt, t) })}`}
          </AlertDescription>
        </Alert>
      )}

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t("agentPolicies.stats.last24h")}
              </span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.last24h.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {t("agentPolicies.stats.last7d", { count: stats?.last7dTotal ?? 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t("agentPolicies.stats.pendingEvents")}
              </span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.pendingEvents ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {t("agentPolicies.stats.awaitingApproval", { count: stats?.pendingApprovals ?? 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t("agentPolicies.stats.activeRules")}
              </span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.activeRules ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t("agentPolicies.stats.serviceAccounts")}
              </span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.activeServiceAccounts ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* TABBED CONTENT */}
      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">
            <Shield className="h-4 w-4 mr-1" />
            {t("agentPolicies.tabs.executionPolicies")}
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <Key className="h-4 w-4 mr-1" />
            {t("agentPolicies.tabs.serviceAccounts")}
          </TabsTrigger>
          <TabsTrigger value="executions">
            <Activity className="h-4 w-4 mr-1" />
            {t("agentPolicies.tabs.executionLog")}
          </TabsTrigger>
        </TabsList>

        {/* EXECUTION POLICIES TAB */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("agentPolicies.policies.description")}
            </p>
            <Button size="sm" onClick={() => setShowCreatePolicy(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("agentPolicies.policies.addPolicy")}
            </Button>
          </div>

          {policies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("agentPolicies.policies.emptyMessage")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {policies.map((policy) => (
                <Card key={policy.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            {policy.action}
                          </code>
                          {approvalBadge(policy.approval, t)}
                        </div>
                        {policy.description && (
                          <p className="text-sm text-muted-foreground">{policy.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("agentPolicies.policies.maxAutoPerHour", {
                            count: policy.max_auto_per_hour,
                          })}
                          {policy.notify_on_auto &&
                            ` · ${t("agentPolicies.policies.notifyOnAuto")}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePolicy(policy.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SERVICE ACCOUNTS TAB */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("agentPolicies.accounts.description")}
            </p>
            <Button size="sm" onClick={() => setShowCreateAccount(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("agentPolicies.accounts.createAccount")}
            </Button>
          </div>

          {serviceAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("agentPolicies.accounts.emptyMessage")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {serviceAccounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{account.name}</span>
                          <Badge variant={account.status === "active" ? "default" : "destructive"}>
                            {account.status}
                          </Badge>
                          <code className="text-xs text-muted-foreground">
                            ****{account.api_key_suffix}
                          </code>
                        </div>
                        {account.description && (
                          <p className="text-sm text-muted-foreground">{account.description}</p>
                        )}
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>
                            {t("agentPolicies.accounts.actions")}:{" "}
                            {account.allowed_actions.join(", ")}
                          </span>
                          <span>
                            {t("agentPolicies.accounts.rate")}: {account.rate_limit_per_hour}/hr
                          </span>
                          <span>
                            {t("agentPolicies.accounts.used")}: {timeAgo(account.last_used_at, t)}
                          </span>
                          <span>
                            {t("agentPolicies.accounts.invocations")}: {account.total_invocations}
                          </span>
                        </div>
                      </div>
                      {account.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeAccount(account.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t("agentPolicies.accounts.revoke")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* EXECUTION LOG TAB */}
        <TabsContent value="executions" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("agentPolicies.executions.description")}
            </p>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {t("agentPolicies.executions.refresh")}
            </Button>
          </div>

          {executions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("agentPolicies.executions.emptyMessage")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {executions.map((exec) => (
                <Card key={exec.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            {exec.action}
                          </code>
                          <StatusBadge status={exec.status} />
                          {exec.policy_approval && approvalBadge(exec.policy_approval, t)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(exec.created_at, t)}
                          {exec.error_message &&
                            ` · ${t("agentPolicies.executions.error")}: ${exec.error_message}`}
                        </p>
                      </div>
                      {exec.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleApproveExecution(exec.id)}
                            title="Approve"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleRejectExecution(exec.id)}
                            title="Reject"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* NEW API KEY DISPLAY DIALOG */}
      {newApiKey && (
        <Dialog open={!!newApiKey} onOpenChange={() => setNewApiKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("agentPolicies.apiKeyDialog.title")}</DialogTitle>
              <DialogDescription>{t("agentPolicies.apiKeyDialog.description")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t("agentPolicies.apiKeyDialog.warning")}</AlertDescription>
              </Alert>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={showApiKey ? newApiKey : `${"•".repeat(32)}${newApiKey.slice(-4)}`}
                  className="font-mono text-sm"
                />
                <Button variant="ghost" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(newApiKey);
                    toast({ title: t("agentPolicies.toasts.copiedToClipboard") });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setNewApiKey(null)}>
                {t("agentPolicies.apiKeyDialog.done")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE SERVICE ACCOUNT DIALOG */}
      <Dialog open={showCreateAccount} onOpenChange={setShowCreateAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("agentPolicies.createAccountDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("agentPolicies.createAccountDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("agentPolicies.createAccountDialog.nameLabel")}</Label>
              <Input
                value={accountForm.name}
                onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("agentPolicies.createAccountDialog.namePlaceholder")}
              />
            </div>
            <div>
              <Label>{t("agentPolicies.createAccountDialog.descriptionLabel")}</Label>
              <Input
                value={accountForm.description}
                onChange={(e) => setAccountForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("agentPolicies.createAccountDialog.descriptionPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("agentPolicies.createAccountDialog.allowedActionsLabel")}</Label>
              <Input
                value={accountForm.allowedActions}
                onChange={(e) => setAccountForm((f) => ({ ...f, allowedActions: e.target.value }))}
                placeholder={t("agentPolicies.createAccountDialog.allowedActionsPlaceholder")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("agentPolicies.createAccountDialog.allowedActionsHint")}
              </p>
            </div>
            <div>
              <Label>{t("agentPolicies.createAccountDialog.rateLimitLabel")}</Label>
              <Input
                type="number"
                value={accountForm.rateLimitPerHour}
                onChange={(e) =>
                  setAccountForm((f) => ({
                    ...f,
                    rateLimitPerHour: parseInt(e.target.value) || 100,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAccount(false)}>
              {t("agentPolicies.createAccountDialog.cancel")}
            </Button>
            <Button
              onClick={handleCreateAccount}
              disabled={!accountForm.name || !accountForm.allowedActions}
            >
              {t("agentPolicies.createAccountDialog.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE POLICY DIALOG */}
      <Dialog open={showCreatePolicy} onOpenChange={setShowCreatePolicy}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("agentPolicies.createPolicyDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("agentPolicies.createPolicyDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("agentPolicies.createPolicyDialog.gatewayActionLabel")}</Label>
              <Input
                value={policyForm.action}
                onChange={(e) => setPolicyForm((f) => ({ ...f, action: e.target.value }))}
                placeholder={t("agentPolicies.createPolicyDialog.gatewayActionPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("agentPolicies.createPolicyDialog.approvalModeLabel")}</Label>
              <Select
                value={policyForm.approval}
                onValueChange={(v) => setPolicyForm((f) => ({ ...f, approval: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_approve">
                    {t("agentPolicies.createPolicyDialog.autoApproveOption")}
                  </SelectItem>
                  <SelectItem value="human_required">
                    {t("agentPolicies.createPolicyDialog.humanRequiredOption")}
                  </SelectItem>
                  <SelectItem value="disabled">
                    {t("agentPolicies.createPolicyDialog.disabledOption")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("agentPolicies.createPolicyDialog.maxAutoApprovalsLabel")}</Label>
              <Input
                type="number"
                value={policyForm.maxAutoPerHour}
                onChange={(e) =>
                  setPolicyForm((f) => ({ ...f, maxAutoPerHour: parseInt(e.target.value) || 50 }))
                }
              />
            </div>
            <div>
              <Label>{t("agentPolicies.createPolicyDialog.descriptionLabel")}</Label>
              <Input
                value={policyForm.description}
                onChange={(e) => setPolicyForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("agentPolicies.createPolicyDialog.descriptionPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePolicy(false)}>
              {t("agentPolicies.createPolicyDialog.cancel")}
            </Button>
            <Button onClick={handleCreatePolicy} disabled={!policyForm.action}>
              {t("agentPolicies.createPolicyDialog.savePolicy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
