/**
 * Control Tower — Story 2: Unified visibility into deployments, approvals, tests, health
 *
 * Four-quadrant dashboard providing real-time operational awareness.
 */

import { useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  GitBranch,
  Rocket,
  Shield,
  XCircle,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDeployments, useSystemHealth, useChangeRequests } from "@/hooks/useIncidents";
import { useApprovalRequests } from "@/hooks/useApprovals";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const deployStatusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  success: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  failed: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  rolled_back: { color: "bg-orange-100 text-orange-800 border-orange-200", icon: Zap },
  started: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
};

const healthStatusColor: Record<string, string> = {
  healthy: "bg-green-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ControlTower() {
  const { data: deployData, isLoading: deploysLoading } = useDeployments(10);
  const { data: healthData, isLoading: healthLoading } = useSystemHealth();
  const { data: approvalData, isLoading: approvalsLoading } = useApprovalRequests();
  const { data: crData, isLoading: crLoading } = useChangeRequests();

  const deployments = useMemo(() => deployData?.deployments ?? [], [deployData]);
  const health = healthData?.health ?? null;
  const approvals = useMemo(() => approvalData?.requests ?? [], [approvalData]);
  const changeRequests = useMemo(() => crData?.changeRequests ?? [], [crData]);

  const isLoading = deploysLoading || healthLoading || approvalsLoading || crLoading;
  if (isLoading) return <PageSkeleton />;

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const recentApprovals = approvals.filter((a) => a.status === "approved").slice(0, 5);

  const testableChanges = changeRequests.filter((cr) => cr.testResults);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Control Tower</h1>
        <p className="text-muted-foreground">
          Unified view of deployments, approvals, test results, and system health.
        </p>
      </div>

      {/* Overall Status Bar */}
      {health && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
            health.overallStatus === "healthy"
              ? "bg-green-50 dark:bg-green-950/20 border-green-200"
              : health.overallStatus === "degraded"
                ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200"
                : "bg-red-50 dark:bg-red-950/20 border-red-200"
          }`}
        >
          <Activity
            className={`h-5 w-5 ${
              health.overallStatus === "healthy"
                ? "text-green-600"
                : health.overallStatus === "degraded"
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}
          />
          <span className="text-sm font-medium">
            System: {health.overallStatus.charAt(0).toUpperCase() + health.overallStatus.slice(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            {health.uptimePct}% uptime &middot; Last checked {formatTime(health.timestamp)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quadrant 1: Deployments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Recent Deployments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deployments.map((dep) => {
                const cfg = deployStatusConfig[dep.status] ?? deployStatusConfig.started;
                const StatusIcon = cfg.icon;
                return (
                  <div key={dep.id} className="flex items-center gap-3 text-sm">
                    <StatusIcon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{dep.version}</span>
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          {dep.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {dep.deploymentType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(dep.createdAt)} &middot; {formatDuration(dep.durationMs)}{" "}
                        &middot; {dep.triggeredBy}
                        {dep.gitSha && (
                          <span className="ml-1 font-mono">{dep.gitSha.slice(0, 7)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              {deployments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No deployments found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quadrant 2: Approvals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Approvals
              {pendingApprovals.length > 0 && (
                <Badge variant="destructive" className="text-xs ml-auto">
                  {pendingApprovals.length} pending
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Pending</p>
                  {pendingApprovals.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm mb-2">
                      <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{a.actionDescription}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.requesterName} &middot; expires {formatTime(a.expiresAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {recentApprovals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Recently Approved
                  </p>
                  {recentApprovals.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{a.actionDescription}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.approverName ?? "System"} &middot;{" "}
                          {a.respondedAt ? formatTime(a.respondedAt) : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {approvals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No approval requests.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quadrant 3: Test Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testableChanges.map((cr) => (
                <div key={cr.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{cr.title}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        cr.testStatus === "passed"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : cr.testStatus === "failed"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-yellow-100 text-yellow-800 border-yellow-200"
                      }`}
                    >
                      {cr.testStatus}
                    </Badge>
                  </div>
                  {cr.testResults && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-muted/50 rounded p-2 text-center">
                        <p className="font-medium">
                          {cr.testResults.unit.passed}/{cr.testResults.unit.total}
                        </p>
                        <p className="text-muted-foreground">Unit</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2 text-center">
                        <p className="font-medium">
                          {cr.testResults.e2e.passed}/{cr.testResults.e2e.total}
                        </p>
                        <p className="text-muted-foreground">E2E</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2 text-center">
                        <p className="font-medium">{cr.testResults.coveragePct}%</p>
                        <p className="text-muted-foreground">Coverage</p>
                      </div>
                    </div>
                  )}
                  {cr.gitBranch && (
                    <p className="text-xs text-muted-foreground font-mono">{cr.gitBranch}</p>
                  )}
                </div>
              ))}
              {testableChanges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No test results available.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quadrant 4: System Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health ? (
              <div className="space-y-3">
                {health.services.map((svc) => (
                  <div key={svc.name} className="flex items-center gap-3">
                    <span
                      className={`h-3 w-3 rounded-full shrink-0 ${healthStatusColor[svc.status]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{svc.name}</span>
                        <span className="text-xs text-muted-foreground">{svc.latencyMs}ms</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        svc.status === "healthy"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : svc.status === "degraded"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                            : "bg-red-100 text-red-800 border-red-200"
                      }`}
                    >
                      {svc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Loading health data...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
