import { useState, useEffect } from "react";
import {
  Rocket,
  Server,
  Plug,
  Database,
  FlaskConical,
  ShieldCheck,
  Globe,
  Activity,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

const STEPS = [
  { id: "provision", label: "Provision & Validate", icon: Server },
  { id: "adapters", label: "Configure Adapters", icon: Plug },
  { id: "import", label: "Import Data", icon: Database },
  { id: "smoke", label: "Smoke Tests", icon: FlaskConical },
  { id: "approval", label: "Approval Gate", icon: ShieldCheck },
  { id: "dns", label: "DNS Cutover", icon: Globe },
  { id: "monitor", label: "Post-Launch Monitor", icon: Activity },
] as const;

type StepStatus = "pending" | "in_progress" | "complete" | "failed";

interface GoLiveState {
  currentStep: number;
  steps: Record<string, { status: StepStatus; completedAt?: string }>;
  provisioningStatus?: string;
  adapters?: Array<{ name: string; health: string; enabled: boolean }>;
  migrationBatches?: Array<{ name: string; records: number; status: string }>;
  smokeResults?: Array<{
    name: string;
    status: "passed" | "failed" | "pending";
    duration?: string;
  }>;
  dnsVerified?: boolean;
  dnsPropagation?: string;
  metrics?: { errorRate: number; latencyP95: number; logins: number; transactions: number };
}

function statusIcon(status: StepStatus) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "in_progress":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function GoLiveWorkflow() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [approverName, setApproverName] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [domain, setDomain] = useState("");

  const statusQuery = useQuery({
    queryKey: ["golive-status"],
    queryFn: () => gateway.request<{ golive: GoLiveState }>("golive.status", {}),
    refetchInterval: activeStep === 6 ? 10000 : false,
  });

  const state = statusQuery.data?.golive;
  const completedCount = state
    ? Object.values(state.steps).filter((s) => s.status === "complete").length
    : 0;
  const progress = (completedCount / STEPS.length) * 100;

  useEffect(() => {
    if (state?.currentStep !== undefined) setActiveStep(state.currentStep);
  }, [state?.currentStep]);

  const startMutation = useMutation({
    mutationFn: () => gateway.request("golive.start", {}),
    onSuccess: () => {
      toast({ title: "Go-Live workflow started" });
      qc.invalidateQueries({ queryKey: ["golive-status"] });
    },
  });

  const executeStep = useMutation({
    mutationFn: (params: { stepId: string; data?: Record<string, unknown> }) =>
      gateway.request("golive.step.execute", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["golive-status"] }),
  });

  const approveStep = useMutation({
    mutationFn: (params: { stepId: string; approver: string; notes: string }) =>
      gateway.request("golive.step.approve", params),
    onSuccess: () => {
      toast({ title: "Step approved" });
      qc.invalidateQueries({ queryKey: ["golive-status"] });
    },
  });

  const runSmokeTests = useMutation({
    mutationFn: () => gateway.request("golive.smoketest.run", {}),
    onSuccess: () => {
      toast({ title: "Smoke tests completed" });
      qc.invalidateQueries({ queryKey: ["golive-status"] });
    },
  });

  const markComplete = useMutation({
    mutationFn: (stepId: string) =>
      gateway.request("golive.step.execute", { stepId, data: { markComplete: true } }),
    onSuccess: () => {
      toast({ title: "Step marked complete" });
      qc.invalidateQueries({ queryKey: ["golive-status"] });
    },
  });

  function canNavigateTo(idx: number): boolean {
    if (idx === 0) return true;
    const prevStep = STEPS[idx - 1];
    return state?.steps[prevStep.id]?.status === "complete";
  }

  const currentStepId = STEPS[activeStep].id;
  const currentStepStatus = state?.steps[currentStepId]?.status ?? "pending";

  const smokeTests = state?.smokeResults ?? [
    { name: "Auth Flow", status: "pending" as const },
    { name: "Accounts List", status: "pending" as const },
    { name: "Transfer", status: "pending" as const },
    { name: "Bill Pay", status: "pending" as const },
    { name: "Card Controls", status: "pending" as const },
    { name: "Adapter Health", status: "pending" as const },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Go-Live Workflow</h1>
          <p className="text-muted-foreground">7-step orchestration for production launch.</p>
        </div>
        {!state && (
          <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
            {startMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Rocket className="mr-2 h-4 w-4" /> Start Go-Live
          </Button>
        )}
      </div>

      <Progress value={progress} className="h-2" />

      {/* Step indicators */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const stepStatus = state?.steps[step.id]?.status ?? "pending";
          return (
            <button
              key={step.id}
              onClick={() => canNavigateTo(idx) && setActiveStep(idx)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                idx === activeStep
                  ? "bg-primary text-primary-foreground"
                  : stepStatus === "complete"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : stepStatus === "failed"
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{step.label}</span>
              {statusIcon(stepStatus)}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar — numbered step list */}
        <div className="space-y-1">
          {STEPS.map((step, idx) => {
            const stepStatus = state?.steps[step.id]?.status ?? "pending";
            return (
              <button
                key={step.id}
                onClick={() => canNavigateTo(idx) && setActiveStep(idx)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${
                  idx === activeStep ? "bg-primary/10 font-medium" : "hover:bg-muted"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium">
                  {idx + 1}
                </span>
                <span className="flex-1">{step.label}</span>
                {statusIcon(stepStatus)}
              </button>
            );
          })}
        </div>

        {/* Right content */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = STEPS[activeStep].icon;
                return <Icon className="h-5 w-5" />;
              })()}
              {STEPS[activeStep].label}
            </CardTitle>
            <CardDescription>
              Step {activeStep + 1} of {STEPS.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Provision & Validate */}
            {activeStep === 0 && (
              <>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-1">Provisioning Status</p>
                  <Badge variant={state?.provisioningStatus === "ready" ? "default" : "secondary"}>
                    {state?.provisioningStatus ?? "Not Started"}
                  </Badge>
                </div>
                <Button
                  onClick={() => executeStep.mutate({ stepId: "provision" })}
                  disabled={executeStep.isPending}
                >
                  {executeStep.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Server className="mr-2 h-4 w-4" /> Run Provisioning
                </Button>
              </>
            )}

            {/* Step 2: Configure Adapters */}
            {activeStep === 1 && (
              <>
                <div className="space-y-3">
                  {(
                    state?.adapters ?? [
                      { name: "Core Banking", health: "healthy", enabled: true },
                      { name: "Payments", health: "healthy", enabled: true },
                      { name: "KYC/AML", health: "degraded", enabled: true },
                      { name: "Cards", health: "pending", enabled: false },
                    ]
                  ).map((adapter) => (
                    <div
                      key={adapter.name}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Plug className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{adapter.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            adapter.health === "healthy"
                              ? "default"
                              : adapter.health === "degraded"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs capitalize"
                        >
                          {adapter.health}
                        </Badge>
                        <Badge
                          variant={adapter.enabled ? "default" : "outline"}
                          className="text-xs"
                        >
                          {adapter.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => executeStep.mutate({ stepId: "adapters" })}
                  disabled={executeStep.isPending}
                >
                  {executeStep.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <RefreshCw className="mr-2 h-4 w-4" /> Run Health Checks
                </Button>
              </>
            )}

            {/* Step 3: Import Data */}
            {activeStep === 2 && (
              <>
                <div className="space-y-3">
                  {(
                    state?.migrationBatches ?? [
                      { name: "Members", records: 12450, status: "complete" },
                      { name: "Accounts", records: 34200, status: "complete" },
                      { name: "Transactions", records: 892000, status: "in_progress" },
                      { name: "Loans", records: 5600, status: "pending" },
                    ]
                  ).map((batch) => (
                    <div
                      key={batch.name}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{batch.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {batch.records.toLocaleString()} records
                        </p>
                      </div>
                      <Badge
                        variant={
                          batch.status === "complete"
                            ? "default"
                            : batch.status === "in_progress"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs capitalize"
                      >
                        {batch.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" asChild>
                  <a href="/admin/data-migration">
                    <Database className="mr-2 h-4 w-4" /> Open Data Migration
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </>
            )}

            {/* Step 4: Smoke Tests */}
            {activeStep === 3 && (
              <>
                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium">Test</th>
                        <th className="px-4 py-2 text-left font-medium">Status</th>
                        <th className="px-4 py-2 text-left font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smokeTests.map((test) => (
                        <tr key={test.name} className="border-b last:border-0">
                          <td className="px-4 py-2">{test.name}</td>
                          <td className="px-4 py-2">
                            <Badge
                              variant={
                                test.status === "passed"
                                  ? "default"
                                  : test.status === "failed"
                                    ? "destructive"
                                    : "outline"
                              }
                              className="text-xs capitalize"
                            >
                              {test.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {test.duration ?? "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button onClick={() => runSmokeTests.mutate()} disabled={runSmokeTests.isPending}>
                  {runSmokeTests.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <FlaskConical className="mr-2 h-4 w-4" /> Run Tests
                </Button>
              </>
            )}

            {/* Step 5: Approval Gate */}
            {activeStep === 4 && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Stakeholder Name</Label>
                  <Input
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    placeholder="Jane Smith, VP of Technology"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Approval Notes</Label>
                  <Textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Any conditions or observations..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="approval-confirm"
                    checked={approvalConfirmed}
                    onCheckedChange={(v) => setApprovalConfirmed(v === true)}
                  />
                  <label htmlFor="approval-confirm" className="text-sm">
                    I confirm that all pre-launch checks have been reviewed and approved.
                  </label>
                </div>
                <Button
                  onClick={() =>
                    approveStep.mutate({
                      stepId: "approval",
                      approver: approverName,
                      notes: approvalNotes,
                    })
                  }
                  disabled={!approvalConfirmed || !approverName || approveStep.isPending}
                >
                  {approveStep.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ShieldCheck className="mr-2 h-4 w-4" /> Submit Approval
                </Button>
              </div>
            )}

            {/* Step 6: DNS Cutover */}
            {activeStep === 5 && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm">
                  <p className="font-medium mb-2">DNS Cutover Instructions</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Update your CNAME record to point to the Fiducia edge endpoint.</li>
                    <li>Set TTL to 300 seconds (5 minutes) for fast propagation.</li>
                    <li>Verify the domain below to confirm DNS resolution.</li>
                  </ol>
                </div>
                <div className="grid gap-2">
                  <Label>Custom Domain</Label>
                  <Input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="banking.yourcu.org"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => executeStep.mutate({ stepId: "dns", data: { domain } })}
                    disabled={!domain || executeStep.isPending}
                  >
                    {executeStep.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Globe className="mr-2 h-4 w-4" /> Verify DNS
                  </Button>
                  {state?.dnsVerified !== undefined && (
                    <Badge variant={state.dnsVerified ? "default" : "destructive"}>
                      {state.dnsVerified ? "Verified" : "Not Resolved"}
                    </Badge>
                  )}
                </div>
                {state?.dnsPropagation && (
                  <p className="text-sm text-muted-foreground">
                    Propagation: {state.dnsPropagation}
                  </p>
                )}
              </div>
            )}

            {/* Step 7: Post-Launch Monitor */}
            {activeStep === 6 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" /> Auto-refreshing every 10 seconds
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold">
                        {state?.metrics?.errorRate !== undefined
                          ? `${state.metrics.errorRate}%`
                          : "--"}
                      </p>
                      <p className="text-xs text-muted-foreground">Error Rate</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold">
                        {state?.metrics?.latencyP95 !== undefined
                          ? `${state.metrics.latencyP95}ms`
                          : "--"}
                      </p>
                      <p className="text-xs text-muted-foreground">P95 Latency</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold">
                        {state?.metrics?.logins?.toLocaleString() ?? "--"}
                      </p>
                      <p className="text-xs text-muted-foreground">Logins (24h)</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold">
                        {state?.metrics?.transactions?.toLocaleString() ?? "--"}
                      </p>
                      <p className="text-xs text-muted-foreground">Transactions (24h)</p>
                    </CardContent>
                  </Card>
                </div>
                {state?.metrics?.errorRate !== undefined && state.metrics.errorRate > 5 && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm dark:bg-red-950/20">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span>Error rate is elevated. Review logs before proceeding.</span>
                  </div>
                )}
              </div>
            )}

            {/* Mark Complete button */}
            {currentStepStatus !== "complete" && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => markComplete.mutate(currentStepId)}
                  disabled={markComplete.isPending}
                >
                  {markComplete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
