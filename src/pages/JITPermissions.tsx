import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Shield, CheckCircle2, XCircle, Clock, Bell, Plus, AlertTriangle, UserCheck, Settings2 } from "lucide-react";
import { useApprovalRequests, useApproveRequest, useDenyRequest, useApprovalPolicies, useCreateApprovalPolicy, useUpdateApprovalPolicy, useDeleteApprovalPolicy, useApprovalSummary } from "@/hooks/useApprovals";
import { useToast } from "@/hooks/use-toast";
import type { ApprovalRequest, ApprovalStatus, ApprovalActionType, ApprovalPolicy } from "@/types";

const STATUS_CONFIG: Record<ApprovalStatus, { icon: typeof Clock; color: string; labelKey: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { icon: Clock, color: "text-yellow-500", labelKey: "jitPermissions.statusPending", variant: "secondary" },
  approved: { icon: CheckCircle2, color: "text-green-500", labelKey: "jitPermissions.statusApproved", variant: "default" },
  denied: { icon: XCircle, color: "text-red-500", labelKey: "jitPermissions.statusDenied", variant: "destructive" },
  expired: { icon: AlertTriangle, color: "text-gray-400", labelKey: "jitPermissions.statusExpired", variant: "outline" },
  cancelled: { icon: XCircle, color: "text-gray-400", labelKey: "jitPermissions.statusCancelled", variant: "outline" },
};

const ACTION_LABEL_KEYS: Record<ApprovalActionType, string> = {
  transfer: "jitPermissions.actionTransfer",
  card_limit_increase: "jitPermissions.actionCardLimitIncrease",
  wire: "jitPermissions.actionWireTransfer",
  ach: "jitPermissions.actionAchPayment",
  payment: "jitPermissions.actionPayment",
  account_access: "jitPermissions.actionAccountAccess",
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function JITPermissionsPage() {
  const { t } = useTranslation('banking');
  const { toast } = useToast();
  const { data: requestsData, isLoading } = useApprovalRequests();
  const requests = requestsData?.requests ?? [];
  const { data: summaryData } = useApprovalSummary();
  const summary = summaryData?.summary;
  const { data: policiesData } = useApprovalPolicies();
  const policies = policiesData?.policies ?? [];

  const approveRequest = useApproveRequest();
  const denyRequest = useDenyRequest();
  const createPolicy = useCreateApprovalPolicy();
  const updatePolicy = useUpdateApprovalPolicy();
  const deletePolicy = useDeleteApprovalPolicy();

  const [denyDialogReq, setDenyDialogReq] = useState<ApprovalRequest | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [formPolicyName, setFormPolicyName] = useState("");
  const [formActionType, setFormActionType] = useState<string>("transfer");
  const [formThreshold, setFormThreshold] = useState("");
  const [formExpireMinutes, setFormExpireMinutes] = useState("60");

  const pendingRequests = requests.filter(r => r.status === "pending");
  const resolvedRequests = requests.filter(r => r.status !== "pending");

  const handleApprove = (req: ApprovalRequest) => {
    approveRequest.mutate(
      { requestId: req.id },
      {
        onSuccess: () => {
          toast({
            title: t('jitPermissions.toastApproved'),
            description: t('jitPermissions.toastApprovedDesc', { name: req.requesterName, action: t(ACTION_LABEL_KEYS[req.actionType]) ?? req.actionType }),
          });
        },
      }
    );
  };

  const handleDeny = () => {
    if (!denyDialogReq) return;
    denyRequest.mutate(
      { requestId: denyDialogReq.id, reason: denyReason || undefined },
      {
        onSuccess: () => {
          toast({ title: t('jitPermissions.toastDenied'), description: t('jitPermissions.toastDeniedDesc', { name: denyDialogReq.requesterName }) });
          setDenyDialogReq(null);
          setDenyReason("");
        },
      }
    );
  };

  const handleCreatePolicy = () => {
    if (!formPolicyName || !formThreshold) {
      toast({ title: t('jitPermissions.allFieldsRequired'), variant: "destructive" });
      return;
    }
    createPolicy.mutate(
      {
        name: formPolicyName,
        actionType: formActionType,
        thresholdCents: Math.round(parseFloat(formThreshold) * 100),
        approverRoles: ["owner", "admin"],
        autoExpireMinutes: parseInt(formExpireMinutes),
        notifyChannels: ["push", "email"],
      },
      {
        onSuccess: () => {
          toast({ title: t('jitPermissions.policyCreated') });
          setPolicyDialogOpen(false);
          setFormPolicyName("");
          setFormThreshold("");
        },
      }
    );
  };

  return (
    <AppShell>
      <div className="container mx-auto max-w-6xl py-6 px-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            {t('jitPermissions.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('jitPermissions.subtitle')}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={pendingRequests.length > 0 ? "border-yellow-300 bg-yellow-50/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('jitPermissions.statusPending')}</p>
                  <p className="text-2xl font-bold">{summary?.pendingCount ?? pendingRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('jitPermissions.approvedToday')}</p>
                  <p className="text-2xl font-bold">{summary?.approvedToday ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('jitPermissions.deniedToday')}</p>
                  <p className="text-2xl font-bold">{summary?.deniedToday ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('jitPermissions.avgResponse')}</p>
                  <p className="text-2xl font-bold">{summary?.avgResponseMinutes ?? 0}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approval Cards (Slack-style) */}
        {pendingRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-500" />
              {t('jitPermissions.needsYourApproval', { count: pendingRequests.length })}
            </h2>
            {pendingRequests.map((req) => (
              <Card key={req.id} className="border-yellow-200 bg-gradient-to-r from-yellow-50/50 to-transparent">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        <span className="font-bold">{req.requesterName}</span>
                        {" " + t('jitPermissions.isTryingTo') + " "}
                        <span className="font-semibold text-primary">
                          {req.actionDescription || t('jitPermissions.makeA', { action: t(ACTION_LABEL_KEYS[req.actionType]) ?? req.actionType })}
                        </span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {req.amountCents !== null && (
                          <span className="font-semibold text-foreground">{formatCurrency(req.amountCents)}</span>
                        )}
                        {req.currentLimitCents !== null && req.requestedLimitCents !== null && (
                          <span>
                            {t('jitPermissions.limit')}: {formatCurrency(req.currentLimitCents)} → {formatCurrency(req.requestedLimitCents)}
                          </span>
                        )}
                        <span>{timeAgo(req.createdAt)}</span>
                        <Badge variant="outline">{t(ACTION_LABEL_KEYS[req.actionType]) ?? req.actionType}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(req)}
                        disabled={approveRequest.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {t('jitPermissions.approve')}{req.amountCents !== null ? ` ${formatCurrency(req.amountCents)}` : ""}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setDenyDialogReq(req); setDenyReason(""); }}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> {t('jitPermissions.deny')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs: History & Policies */}
        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">{t('jitPermissions.requestHistory')}</TabsTrigger>
            <TabsTrigger value="policies">
              <Settings2 className="w-4 h-4 mr-1" /> {t('jitPermissions.approvalPolicies')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>{t('jitPermissions.allRequests')}</CardTitle>
                <CardDescription>{t('jitPermissions.allRequestsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">{t('jitPermissions.loading')}</div>
                ) : resolvedRequests.length === 0 && pendingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                    <h3 className="text-lg font-semibold">{t('jitPermissions.noRequestsYet')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('jitPermissions.noRequestsYetDesc')}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('jitPermissions.requester')}</TableHead>
                        <TableHead>{t('jitPermissions.action')}</TableHead>
                        <TableHead>{t('jitPermissions.amount')}</TableHead>
                        <TableHead>{t('jitPermissions.status')}</TableHead>
                        <TableHead>{t('jitPermissions.responded')}</TableHead>
                        <TableHead>{t('jitPermissions.time')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...pendingRequests, ...resolvedRequests].map((req) => {
                        const config = STATUS_CONFIG[req.status];
                        const StatusIcon = config.icon;
                        return (
                          <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.requesterName}</TableCell>
                            <TableCell>{t(ACTION_LABEL_KEYS[req.actionType]) ?? req.actionType}</TableCell>
                            <TableCell>{req.amountCents !== null ? formatCurrency(req.amountCents) : "--"}</TableCell>
                            <TableCell>
                              <Badge variant={config.variant} className="gap-1">
                                <StatusIcon className={`w-3 h-3 ${config.color}`} />
                                {t(config.labelKey)}
                              </Badge>
                            </TableCell>
                            <TableCell>{req.approverName ?? "--"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{timeAgo(req.createdAt)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('jitPermissions.approvalPolicies')}</CardTitle>
                  <CardDescription>{t('jitPermissions.approvalPoliciesDesc')}</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setFormPolicyName(""); setFormThreshold(""); setPolicyDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> {t('jitPermissions.addPolicy')}
                </Button>
              </CardHeader>
              <CardContent>
                {policies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">{t('jitPermissions.noPolicies')}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('jitPermissions.policy')}</TableHead>
                        <TableHead>{t('jitPermissions.actionType')}</TableHead>
                        <TableHead>{t('jitPermissions.threshold')}</TableHead>
                        <TableHead>{t('jitPermissions.autoExpire')}</TableHead>
                        <TableHead>{t('jitPermissions.notifyVia')}</TableHead>
                        <TableHead>{t('jitPermissions.enabled')}</TableHead>
                        <TableHead className="text-right">{t('jitPermissions.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map((policy: ApprovalPolicy) => (
                        <TableRow key={policy.id}>
                          <TableCell className="font-medium">{policy.name}</TableCell>
                          <TableCell>{t(ACTION_LABEL_KEYS[policy.actionType]) ?? policy.actionType}</TableCell>
                          <TableCell>{formatCurrency(policy.thresholdCents)}</TableCell>
                          <TableCell>{policy.autoExpireMinutes}m</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {policy.notifyChannels.map(ch => (
                                <Badge key={ch} variant="outline" className="text-xs">{ch}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={policy.isEnabled}
                              onCheckedChange={(checked) =>
                                updatePolicy.mutate({ policyId: policy.id, isEnabled: checked })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deletePolicy.mutate(policy.id, {
                                onSuccess: () => toast({ title: t('jitPermissions.policyDeleted') }),
                              })}
                            >
                              {t('jitPermissions.delete')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Deny Dialog */}
        <Dialog open={!!denyDialogReq} onOpenChange={(open) => { if (!open) setDenyDialogReq(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('jitPermissions.denyRequest')}</DialogTitle>
              <DialogDescription>
                {t('jitPermissions.denyRequestDesc', { name: denyDialogReq?.requesterName, action: denyDialogReq ? (t(ACTION_LABEL_KEYS[denyDialogReq.actionType]) ?? denyDialogReq.actionType) : "" })}
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label>{t('jitPermissions.reasonOptional')}</Label>
              <Textarea placeholder={t('jitPermissions.denyReasonPlaceholder')} value={denyReason} onChange={(e) => setDenyReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDenyDialogReq(null)}>{t('jitPermissions.cancel')}</Button>
              <Button variant="destructive" onClick={handleDeny} disabled={denyRequest.isPending}>
                {denyRequest.isPending ? t('jitPermissions.denying') : t('jitPermissions.denyRequest')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Policy Dialog */}
        <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('jitPermissions.createApprovalPolicy')}</DialogTitle>
              <DialogDescription>
                {t('jitPermissions.createApprovalPolicyDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('jitPermissions.policyName')}</Label>
                <Input placeholder={t('jitPermissions.policyNamePlaceholder')} value={formPolicyName} onChange={(e) => setFormPolicyName(e.target.value)} />
              </div>
              <div>
                <Label>{t('jitPermissions.actionType')}</Label>
                <Select value={formActionType} onValueChange={setFormActionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">{t('jitPermissions.actionTransfer')}</SelectItem>
                    <SelectItem value="card_limit_increase">{t('jitPermissions.actionCardLimitIncrease')}</SelectItem>
                    <SelectItem value="wire">{t('jitPermissions.actionWireTransfer')}</SelectItem>
                    <SelectItem value="ach">{t('jitPermissions.actionAchPayment')}</SelectItem>
                    <SelectItem value="payment">{t('jitPermissions.actionPayment')}</SelectItem>
                    <SelectItem value="account_access">{t('jitPermissions.actionAccountAccess')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('jitPermissions.thresholdDollar')}</Label>
                  <Input type="number" placeholder="500" value={formThreshold} onChange={(e) => setFormThreshold(e.target.value)} />
                </div>
                <div>
                  <Label>{t('jitPermissions.autoExpireMinutes')}</Label>
                  <Input type="number" value={formExpireMinutes} onChange={(e) => setFormExpireMinutes(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPolicyDialogOpen(false)}>{t('jitPermissions.cancel')}</Button>
              <Button onClick={handleCreatePolicy} disabled={createPolicy.isPending}>
                {createPolicy.isPending ? t('jitPermissions.creating') : t('jitPermissions.createPolicy')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
