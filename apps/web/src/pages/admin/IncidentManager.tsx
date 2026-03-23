/**
 * Incident Manager — Story 1: Detect → Roll back → Notify stakeholders
 *
 * Three-panel layout showing active incidents, incident detail with live timeline,
 * and action panel for rollbacks and stakeholder notifications.
 */

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  Bell,
  CheckCircle2,
  Clock,
  Radio,
  RotateCcw,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useIncidents,
  useRollbacks,
  useInitiateRollback,
  useNotifyStakeholders,
} from "@/hooks/useIncidents";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentTimelineEntry,
} from "@/types/incident";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const severityConfig: Record<
  IncidentSeverity,
  { icon: typeof AlertTriangle; color: string; bg: string }
> = {
  critical: { icon: XCircle, color: "text-red-600", bg: "bg-red-100 text-red-800 border-red-200" },
  high: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-100 text-orange-800 border-orange-200",
  },
  medium: {
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  low: {
    icon: ArrowDownCircle,
    color: "text-blue-600",
    bg: "bg-blue-100 text-blue-800 border-blue-200",
  },
};

const statusConfig: Record<IncidentStatus, { label: string; color: string }> = {
  detected: { label: "Detected", color: "bg-red-100 text-red-800 border-red-200" },
  investigating: {
    label: "Investigating",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  mitigating: { label: "Mitigating", color: "bg-blue-100 text-blue-800 border-blue-200" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800 border-green-200" },
  postmortem: { label: "Postmortem", color: "bg-purple-100 text-purple-800 border-purple-200" },
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function timelineIcon(action: string) {
  switch (action) {
    case "detected":
      return <Radio className="h-4 w-4 text-red-500" />;
    case "investigating":
      return <Search className="h-4 w-4 text-yellow-500" />;
    case "root_cause":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case "rollback_initiated":
      return <RotateCcw className="h-4 w-4 text-blue-500" />;
    case "rollback_completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "stakeholders_notified":
      return <Bell className="h-4 w-4 text-purple-500" />;
    case "resolved":
      return <Shield className="h-4 w-4 text-green-600" />;
    default:
      return <Clock className="h-4 w-4 text-slate-400" />;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IncidentListItem({
  incident,
  isSelected,
  onClick,
}: {
  incident: Incident;
  isSelected: boolean;
  onClick: () => void;
}) {
  const sev = severityConfig[incident.severity];
  const SevIcon = sev.icon;
  const stat = statusConfig[incident.status];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start gap-2">
        <SevIcon className={`h-4 w-4 mt-0.5 ${sev.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{incident.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-xs ${sev.bg}`}>
              {incident.severity}
            </Badge>
            <Badge variant="outline" className={`text-xs ${stat.color}`}>
              {stat.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{formatTime(incident.detectedAt)}</p>
        </div>
      </div>
    </button>
  );
}

function TimelineView({ entries }: { entries: IncidentTimelineEntry[] }) {
  return (
    <div className="relative">
      <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />
      <div className="space-y-4">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-start gap-3 relative">
            <div className="z-10 flex items-center justify-center w-9 h-9 rounded-full bg-background border border-border shrink-0">
              {timelineIcon(entry.action)}
            </div>
            <div className="pt-1">
              <p className="text-sm font-medium">{entry.detail}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.actor} &middot; {formatTime(entry.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function IncidentManager() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useIncidents();
  const incidents = useMemo(() => data?.incidents ?? [], [data]);

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? incidents[0] ?? null,
    [incidents, selectedId],
  );

  const { data: rollbackData } = useRollbacks(selectedIncident?.id);
  const rollbacks = rollbackData?.rollbacks ?? [];

  const initiateRollback = useInitiateRollback();
  const notifyStakeholders = useNotifyStakeholders();

  const filtered = useMemo(() => {
    let list = incidents;
    if (severityFilter !== "all") list = list.filter((i) => i.severity === severityFilter);
    if (statusFilter !== "all") list = list.filter((i) => i.status === statusFilter);
    return list;
  }, [incidents, severityFilter, statusFilter]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Incident Manager</h1>
        <p className="text-muted-foreground">
          Detect, respond, and roll back — with full stakeholder notification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Incident List */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="detected">Detected</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="mitigating">Mitigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="postmortem">Postmortem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filtered.map((incident) => (
              <IncidentListItem
                key={incident.id}
                incident={incident}
                isSelected={selectedIncident?.id === incident.id}
                onClick={() => setSelectedId(incident.id)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No incidents match filters.
              </p>
            )}
          </div>
        </div>

        {/* Center: Incident Detail + Timeline */}
        <div className="lg:col-span-5">
          {selectedIncident ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedIncident.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedIncident.id} &middot; Detected{" "}
                      {formatTime(selectedIncident.detectedAt)}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusConfig[selectedIncident.status].color}>
                    {statusConfig[selectedIncident.status].label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedIncident.description && (
                  <p className="text-sm">{selectedIncident.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Severity:</span>{" "}
                    <Badge
                      variant="outline"
                      className={severityConfig[selectedIncident.severity].bg}
                    >
                      {selectedIncident.severity}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Detection:</span>{" "}
                    {selectedIncident.detectionSource ?? "N/A"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Affected:</span>{" "}
                    {selectedIncident.affectedServices.join(", ") || "N/A"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assigned:</span>{" "}
                    {selectedIncident.assignedTo ?? "Unassigned"}
                  </div>
                </div>

                {selectedIncident.resolutionSummary && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Resolution
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {selectedIncident.resolutionSummary}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-3">Timeline</h3>
                  <TimelineView entries={selectedIncident.timeline} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select an incident to view details.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Actions Panel */}
        <div className="lg:col-span-4 space-y-4">
          {/* Rollback Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Deployment Rollback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rollbacks.length > 0 ? (
                rollbacks.map((rb) => (
                  <div key={rb.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {rb.fromVersion} → {rb.toVersion}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          rb.status === "completed"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : rb.status === "failed"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : "bg-yellow-100 text-yellow-800 border-yellow-200"
                        }
                      >
                        {rb.status}
                      </Badge>
                    </div>
                    {rb.preRollbackSnapshot && rb.postRollbackSnapshot && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">Before</p>
                          {rb.preRollbackSnapshot.services.map((s) => (
                            <div key={s.name} className="flex items-center gap-1">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  s.status === "healthy"
                                    ? "bg-green-500"
                                    : s.status === "degraded"
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                              />
                              <span>
                                {s.name}: {s.latencyMs}ms
                              </span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">After</p>
                          {rb.postRollbackSnapshot.services.map((s) => (
                            <div key={s.name} className="flex items-center gap-1">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  s.status === "healthy"
                                    ? "bg-green-500"
                                    : s.status === "degraded"
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                              />
                              <span>
                                {s.name}: {s.latencyMs}ms
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : selectedIncident ? (
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() =>
                    initiateRollback.mutate({
                      incidentId: selectedIncident.id,
                      fromVersion: "v2.4.0",
                      toVersion: "v2.3.1",
                      rollbackType: "full",
                    })
                  }
                  disabled={initiateRollback.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Initiate Rollback
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Select an incident first.</p>
              )}
            </CardContent>
          </Card>

          {/* Notify Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Stakeholder Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedIncident?.stakeholdersNotified &&
              selectedIncident.stakeholdersNotified.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Notified at{" "}
                    {selectedIncident.notificationSentAt
                      ? formatTime(selectedIncident.notificationSentAt)
                      : "N/A"}
                  </div>
                  <div className="text-xs space-y-1">
                    {selectedIncident.stakeholdersNotified.map((s) => (
                      <div key={s} className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedIncident ? (
                <Button
                  className="w-full"
                  onClick={() =>
                    notifyStakeholders.mutate({
                      incidentId: selectedIncident.id,
                      channels: ["slack", "email"],
                      stakeholders: ["ops-team@fiducia.dev", "cto@fiducia.dev"],
                    })
                  }
                  disabled={notifyStakeholders.isPending}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notify Stakeholders
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Select an incident first.</p>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <p className="text-2xl font-bold text-red-600">
                    {
                      incidents.filter((i) => i.status !== "resolved" && i.status !== "postmortem")
                        .length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <p className="text-2xl font-bold text-green-600">
                    {
                      incidents.filter((i) => i.status === "resolved" || i.status === "postmortem")
                        .length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <p className="text-2xl font-bold text-orange-600">
                    {incidents.filter((i) => i.severity === "critical").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-2xl font-bold text-blue-600">{rollbacks.length}</p>
                  <p className="text-xs text-muted-foreground">Rollbacks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
