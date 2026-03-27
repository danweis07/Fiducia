import { useState } from "react";
import {
  Rocket,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Globe,
  Activity,
  Plug,
  Database,
  FlaskConical,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useGoLiveWorkflow,
  useStartGoLive,
  useExecuteGoLiveStep,
  useApproveGoLiveStep,
  useRollbackGoLive,
  useRunSmokeTests,
  usePostLaunchMetrics,
  useGoLiveEvents,
} from "@/hooks/useGoLive";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type { GoLiveStepId, GoLiveStep as GoLiveStepType } from "@/types/golive";

const STEP_ICONS: Record<GoLiveStepId, React.ElementType> = {
  provision: Rocket,
  adapters: Plug,
  data_import: Database,
  smoke_tests: FlaskConical,
  approval: ShieldCheck,
  dns_cutover: Globe,
  post_launch_monitor: Activity,
};

const STEP_STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  in_progress: <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />,
  failed: <XCircle className="h-5 w-5 text-red-600" />,
  pending: <Clock className="h-5 w-5 text-muted-foreground" />,
  skipped: <Clock className="h-5 w-5 text-muted-foreground opacity-50" />,
};

export default function GoLiveWorkflow() {
  const { toast } = useToast();
  const [showApproval, setShowApproval] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");

  const workflowQuery = useGoLiveWorkflow();
  const eventsQuery = useGoLiveEvents(workflowQuery.data?.workflow?.id ?? "");
  const metricsQuery = usePostLaunchMetrics();
  const startMutation = useStartGoLive();
  const executeMutation = useExecuteGoLiveStep();
  const approveMutation = useApproveGoLiveStep();
  const rollbackMutation = useRollbackGoLive();
  const smokeTestMutation = useRunSmokeTests();

  if (workflowQuery.isLoading) return <PageSkeleton />;

  const workflow = workflowQuery.data?.workflow;
  const events = eventsQuery.data?.events ?? [];
  const metrics = metricsQuery.data?.metrics;

  const completedCount = workflow?.stepsCompleted.length ?? 0;
  const totalSteps = workflow?.steps.length ?? 7;
  const progressPct = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  function handleStart() {
    startMutation.mutate(undefined, {
      onSuccess: () => toast({ title: "Go-live workflow started" }),
    });
  }

  function handleExecuteStep(stepId: GoLiveStepId) {
    if (stepId === "approval") {
      setShowApproval(true);
      return;
    }
    executeMutation.mutate(stepId, {
      onSuccess: () => toast({ title: `Step completed: ${stepId}` }),
    });
  }

  function handleApprove() {
    approveMutation.mutate(
      { comment: approvalComment },
      {
        onSuccess: () => {
          toast({ title: "Approval recorded" });
          setShowApproval(false);
          setApprovalComment("");
        },
      },
    );
  }

  function handleRollback() {
    rollbackMutation.mutate(undefined, {
      onSuccess: () => toast({ title: "Workflow rolled back", variant: "destructive" }),
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Go-Live Orchestration</h1>
          <p className="text-muted-foreground">
            Step-by-step workflow to deploy your institution to production
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!workflow || workflow.status === "not_started" ? (
            <Button onClick={handleStart} disabled={startMutation.isPending}>
              {startMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Rocket className="h-4 w-4 mr-2" />
              Start Go-Live
            </Button>
          ) : (
            <>
              <Badge
                variant={
                  workflow.status === "completed"
                    ? "default"
                    : workflow.status === "rolled_back"
                      ? "destructive"
                      : "secondary"
                }
              >
                {workflow.status.replace("_", " ")}
              </Badge>
              {workflow.status === "in_progress" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRollback}
                  disabled={rollbackMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Rollback
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {workflow && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedCount} / {totalSteps} steps
              </span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {(workflow?.steps ?? []).map((step) => {
          const Icon = STEP_ICONS[step.id];
          const isActive = step.status === "in_progress";
          const canExecute =
            step.status === "in_progress" ||
            (step.status === "pending" && workflow?.currentStep === step.id);

          return (
            <Card key={step.id} className={isActive ? "ring-2 ring-blue-500" : ""}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">{STEP_STATUS_ICON[step.status]}</div>
                  <div className="flex-shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{step.label}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {canExecute && (
                    <Button
                      size="sm"
                      onClick={() => handleExecuteStep(step.id)}
                      disabled={executeMutation.isPending}
                    >
                      {executeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      {step.id === "approval" ? "Sign Off" : "Execute"}
                    </Button>
                  )}
                  {step.completedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(step.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Smoke test results */}
      {smokeTestMutation.data?.suite && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Smoke Test Results
              <Badge
                variant={
                  smokeTestMutation.data.suite.overallStatus === "pass" ? "default" : "destructive"
                }
                className="ml-2"
              >
                {smokeTestMutation.data.suite.overallStatus.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {smokeTestMutation.data.suite.tests.map((test) => (
                  <TableRow key={test.name}>
                    <TableCell className="font-medium">{test.name}</TableCell>
                    <TableCell className="text-muted-foreground">{test.description}</TableCell>
                    <TableCell className="text-right">{test.durationMs}ms</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          test.status === "pass"
                            ? "default"
                            : test.status === "fail"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {test.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Post-launch metrics */}
      {metrics && workflow?.stepsCompleted.includes("dns_cutover") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Post-Launch Monitoring (First 24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <p className="text-xl font-bold">{(metrics.errorRate * 100).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">P95 Latency</p>
                <p className="text-xl font-bold">{metrics.p95LatencyMs}ms</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Logins</p>
                <p className="text-xl font-bold">{metrics.totalLogins.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-xl font-bold">{metrics.uptimePercent}%</p>
              </div>
            </div>
            {metrics.alerts.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {metrics.alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center gap-2 text-sm">
                    <AlertTriangle
                      className={`h-4 w-4 ${alert.severity === "critical" ? "text-red-600" : "text-amber-500"}`}
                    />
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event log */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Event Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.map((evt) => (
                <div key={evt.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-muted-foreground w-36 flex-shrink-0">
                    {new Date(evt.createdAt).toLocaleString()}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {evt.step}
                  </Badge>
                  <span>{evt.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval dialog */}
      <Dialog open={showApproval} onOpenChange={setShowApproval}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stakeholder Approval</DialogTitle>
            <DialogDescription>
              Sign off on the go-live cutover. This confirms all prerequisites have been verified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add a comment (optional)"
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproval(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <ShieldCheck className="h-4 w-4 mr-2" />
              Approve Go-Live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
