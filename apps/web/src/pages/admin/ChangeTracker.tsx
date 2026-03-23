/**
 * Change Tracker — Story 3: Clean audit narrative
 *
 * Timeline/stepper view for each change request showing the full lifecycle:
 * Requested → Approved → Tested → Deployed → Monitored
 */

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  GitBranch,
  ExternalLink,
  Rocket,
  Shield,
  Activity,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChangeRequests } from "@/hooks/useIncidents";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type { ChangeRequest, ChangeRequestStatus, ChangeType, TestResults } from "@/types/incident";

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

const changeTypeConfig: Record<ChangeType, { label: string; color: string }> = {
  feature: { label: "Feature", color: "bg-blue-100 text-blue-800 border-blue-200" },
  bugfix: { label: "Bug Fix", color: "bg-orange-100 text-orange-800 border-orange-200" },
  hotfix: { label: "Hotfix", color: "bg-red-100 text-red-800 border-red-200" },
  migration: { label: "Migration", color: "bg-purple-100 text-purple-800 border-purple-200" },
  config: { label: "Config", color: "bg-slate-100 text-slate-800 border-slate-200" },
};

// Steps in the lifecycle
const LIFECYCLE_STEPS = [
  { key: "requested", label: "Requested", icon: FileText },
  { key: "approved", label: "Approved", icon: Shield },
  { key: "tested", label: "Tested", icon: CheckCircle2 },
  { key: "deployed", label: "Deployed", icon: Rocket },
  { key: "monitored", label: "Monitored", icon: Activity },
] as const;

type StepKey = (typeof LIFECYCLE_STEPS)[number]["key"];

function getStepStatus(
  cr: ChangeRequest,
  step: StepKey,
): "completed" | "active" | "pending" | "failed" {
  switch (step) {
    case "requested":
      return "completed"; // Always completed if the CR exists
    case "approved":
      if (cr.approvedAt) return "completed";
      if (cr.status === "pending_approval") return "active";
      if (cr.status === "draft") return "pending";
      return cr.approvalId ? "completed" : "pending";
    case "tested":
      if (cr.testStatus === "passed") return "completed";
      if (cr.testStatus === "failed") return "failed";
      if (cr.status === "testing") return "active";
      return cr.testResults ? "completed" : "pending";
    case "deployed":
      if (cr.deployedAt) return "completed";
      if (cr.status === "deploying") return "active";
      return "pending";
    case "monitored":
      if (cr.status === "closed") return "completed";
      if (cr.status === "monitoring" || cr.status === "deployed") return "active";
      if (cr.monitoringStatus === "incident") return "failed";
      return "pending";
    default:
      return "pending";
  }
}

function StepIcon({ status }: { status: "completed" | "active" | "pending" | "failed" }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-6 w-6 text-green-600" />;
    case "active":
      return <Clock className="h-6 w-6 text-blue-600 animate-pulse" />;
    case "failed":
      return <XCircle className="h-6 w-6 text-red-600" />;
    default:
      return <Circle className="h-6 w-6 text-muted-foreground/40" />;
  }
}

// ---------------------------------------------------------------------------
// Step Detail Panels
// ---------------------------------------------------------------------------

function RequestedDetail({ cr }: { cr: ChangeRequest }) {
  return (
    <div className="text-sm space-y-1">
      <p>
        <span className="text-muted-foreground">By:</span> {cr.requestedBy}
      </p>
      <p>
        <span className="text-muted-foreground">When:</span> {formatTime(cr.requestedAt)}
      </p>
      {cr.gitBranch && (
        <p className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          <span className="font-mono text-xs">{cr.gitBranch}</span>
        </p>
      )}
      {cr.prUrl && (
        <a
          href={cr.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> View PR
        </a>
      )}
    </div>
  );
}

function ApprovedDetail({ cr }: { cr: ChangeRequest }) {
  if (!cr.approvedBy) {
    return <p className="text-sm text-muted-foreground">Awaiting approval...</p>;
  }
  return (
    <div className="text-sm space-y-1">
      <p>
        <span className="text-muted-foreground">By:</span> {cr.approvedBy}
      </p>
      {cr.approvedAt && (
        <p>
          <span className="text-muted-foreground">When:</span> {formatTime(cr.approvedAt)}
        </p>
      )}
      {cr.approvalId && (
        <p>
          <span className="text-muted-foreground">Approval:</span>{" "}
          <span className="font-mono text-xs">{cr.approvalId}</span>
        </p>
      )}
    </div>
  );
}

function TestedDetail({ cr }: { cr: ChangeRequest }) {
  const results: TestResults | null = cr.testResults;
  if (!results) {
    return <p className="text-sm text-muted-foreground">Tests not yet run.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-muted/50 rounded p-2 text-center">
          <p className="font-medium">
            {results.unit.passed}/{results.unit.total}
          </p>
          <p className="text-muted-foreground">Unit Tests</p>
        </div>
        <div className="bg-muted/50 rounded p-2 text-center">
          <p className="font-medium">
            {results.e2e.passed}/{results.e2e.total}
          </p>
          <p className="text-muted-foreground">E2E Tests</p>
        </div>
        <div className="bg-muted/50 rounded p-2 text-center">
          <p className="font-medium">{results.coveragePct}%</p>
          <p className="text-muted-foreground">Coverage</p>
        </div>
      </div>
      {results.unit.failed > 0 || results.e2e.failed > 0 ? (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />
          {results.unit.failed + results.e2e.failed} failing test(s)
        </div>
      ) : null}
    </div>
  );
}

function DeployedDetail({ cr }: { cr: ChangeRequest }) {
  if (!cr.deployedAt) {
    return <p className="text-sm text-muted-foreground">Not yet deployed.</p>;
  }
  return (
    <div className="text-sm space-y-1">
      <p>
        <span className="text-muted-foreground">Version:</span> {cr.deploymentVersion}
      </p>
      <p>
        <span className="text-muted-foreground">When:</span> {formatTime(cr.deployedAt)}
      </p>
      {cr.gitSha && (
        <p>
          <span className="text-muted-foreground">SHA:</span>{" "}
          <span className="font-mono text-xs">{cr.gitSha}</span>
        </p>
      )}
    </div>
  );
}

function MonitoredDetail({ cr }: { cr: ChangeRequest }) {
  return (
    <div className="text-sm space-y-1">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            cr.monitoringStatus === "healthy"
              ? "bg-green-500"
              : cr.monitoringStatus === "degraded"
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
        />
        <span className="capitalize">{cr.monitoringStatus}</span>
      </div>
      {cr.incidentId && <p className="text-xs text-red-600">Linked incident: {cr.incidentId}</p>}
      {cr.status === "closed" && (
        <p className="text-xs text-green-600">Change lifecycle complete.</p>
      )}
    </div>
  );
}

const stepDetailRenderers: Record<StepKey, (props: { cr: ChangeRequest }) => JSX.Element> = {
  requested: RequestedDetail,
  approved: ApprovedDetail,
  tested: TestedDetail,
  deployed: DeployedDetail,
  monitored: MonitoredDetail,
};

// ---------------------------------------------------------------------------
// Change Request Card
// ---------------------------------------------------------------------------

function ChangeRequestCard({
  cr,
  isExpanded,
  onToggle,
}: {
  cr: ChangeRequest;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const typeCfg = changeTypeConfig[cr.changeType];

  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="w-full text-left">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{cr.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {cr.id} &middot; {formatTime(cr.requestedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${typeCfg.color}`}>
                {typeCfg.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {cr.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          {/* Stepper Bar (always visible) */}
          <div className="flex items-center gap-1 mt-4">
            {LIFECYCLE_STEPS.map((step, i) => {
              const status = getStepStatus(cr, step.key);
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <StepIcon status={status} />
                    <span className="text-[10px] text-muted-foreground mt-1">{step.label}</span>
                  </div>
                  {i < LIFECYCLE_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 ${
                        status === "completed" ? "bg-green-400" : "bg-muted-foreground/20"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardHeader>
      </button>

      {isExpanded && (
        <CardContent className="pt-0">
          {cr.description && <p className="text-sm text-muted-foreground mb-4">{cr.description}</p>}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {LIFECYCLE_STEPS.map((step) => {
              const status = getStepStatus(cr, step.key);
              const DetailRenderer = stepDetailRenderers[step.key];
              return (
                <div
                  key={step.key}
                  className={`rounded-lg border p-3 ${
                    status === "active"
                      ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20"
                      : status === "failed"
                        ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                        : status === "completed"
                          ? "border-green-200 bg-green-50/30 dark:bg-green-950/10"
                          : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <step.icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{step.label}</span>
                  </div>
                  <DetailRenderer cr={cr} />
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ChangeTracker() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading } = useChangeRequests();
  const changeRequests = useMemo(() => data?.changeRequests ?? [], [data]);

  const filtered = useMemo(() => {
    let list = changeRequests;
    if (statusFilter !== "all") list = list.filter((cr) => cr.status === statusFilter);
    if (typeFilter !== "all") list = list.filter((cr) => cr.changeType === typeFilter);
    return list;
  }, [changeRequests, statusFilter, typeFilter]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Change Tracker</h1>
        <p className="text-muted-foreground">
          End-to-end audit trail: every change from request through monitoring.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Changes", value: changeRequests.length, color: "text-foreground" },
          {
            label: "Awaiting Approval",
            value: changeRequests.filter((cr) => cr.status === "pending_approval").length,
            color: "text-yellow-600",
          },
          {
            label: "In Testing",
            value: changeRequests.filter((cr) => cr.status === "testing").length,
            color: "text-blue-600",
          },
          {
            label: "Deployed",
            value: changeRequests.filter((cr) =>
              ["deployed", "monitoring", "closed"].includes(cr.status),
            ).length,
            color: "text-green-600",
          },
          {
            label: "With Incidents",
            value: changeRequests.filter((cr) => cr.incidentId).length,
            color: "text-red-600",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="testing">Testing</SelectItem>
            <SelectItem value="deploying">Deploying</SelectItem>
            <SelectItem value="deployed">Deployed</SelectItem>
            <SelectItem value="monitoring">Monitoring</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
            <SelectItem value="bugfix">Bug Fix</SelectItem>
            <SelectItem value="hotfix">Hotfix</SelectItem>
            <SelectItem value="migration">Migration</SelectItem>
            <SelectItem value="config">Config</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Change Request List */}
      <div className="space-y-4">
        {filtered.map((cr) => (
          <ChangeRequestCard
            key={cr.id}
            cr={cr}
            isExpanded={expandedId === cr.id}
            onToggle={() => setExpandedId(expandedId === cr.id ? null : cr.id)}
          />
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No change requests match the current filters.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
