import { useParams } from "react-router-dom";
import { CheckCircle2, Clock, Loader2, XCircle, Building2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGoLiveWorkflow } from "@/hooks/useGoLive";
import type { GoLiveStep } from "@/types/golive";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; badge: string }> = {
  completed: {
    icon: CheckCircle2,
    color: "text-green-600",
    badge: "bg-green-100 text-green-800 border-green-200",
  },
  in_progress: {
    icon: Loader2,
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  failed: {
    icon: XCircle,
    color: "text-red-600",
    badge: "bg-red-100 text-red-800 border-red-200",
  },
  pending: {
    icon: Clock,
    color: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground border-muted",
  },
  skipped: {
    icon: Clock,
    color: "text-muted-foreground opacity-50",
    badge: "bg-muted text-muted-foreground border-muted",
  },
};

function getStepConfig(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
}

export default function GoLiveStatus() {
  const { id: _id } = useParams<{ id: string }>();
  const statusQuery = useGoLiveWorkflow();

  if (statusQuery.isLoading) return <PageSkeleton />;

  const workflow = statusQuery.data?.workflow;
  const status = workflow
    ? {
        totalSteps: workflow.steps.length,
        stepsCompleted: workflow.stepsCompleted.length,
        steps: workflow.steps,
        institutionName: workflow.metadata.institutionName,
        workflowStatus: workflow.status,
        currentStepLabel: workflow.steps.find((s) => s.id === workflow.currentStep)?.label ?? null,
        lastUpdatedAt: workflow.completedAt ?? workflow.startedAt ?? new Date().toISOString(),
      }
    : undefined;

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Workflow Not Found</h2>
            <p className="text-muted-foreground">
              This go-live status page is not available. The link may have expired or the workflow
              ID is incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPct = status.totalSteps > 0 ? (status.stepsCompleted / status.totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header with institution branding */}
        <div className="text-center">
          <Building2 className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold">{status.institutionName}</h1>
          <p className="text-muted-foreground">Go-Live Status</p>
          <Badge variant="outline" className="mt-2 capitalize">
            {status.workflowStatus.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* Progress card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {status.stepsCompleted} of {status.totalSteps} steps completed
              </span>
              <span className="text-sm font-medium">{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-3" />
            {status.currentStepLabel && (
              <p className="text-xs text-muted-foreground mt-2">
                Current step: <span className="font-medium">{status.currentStepLabel}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vertical step timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {status.steps.map((step: GoLiveStep, i: number) => {
                const config = getStepConfig(step.status);
                const Icon = config.icon;
                const isInProgress = step.status === "in_progress";
                const isLast = i === status.steps.length - 1;

                return (
                  <div key={i} className="flex gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`relative flex items-center justify-center rounded-full border-2 w-8 h-8 bg-background ${
                          isInProgress ? "border-blue-500" : "border-muted"
                        }`}
                      >
                        {isInProgress && (
                          <span className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-30" />
                        )}
                        <Icon
                          className={`h-4 w-4 ${config.color} ${isInProgress ? "animate-spin" : ""}`}
                        />
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 flex-1 min-h-[24px] ${
                            step.status === "completed" ? "bg-green-300" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${
                            step.status === "pending" ? "text-muted-foreground" : "font-medium"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${config.badge}`}
                        >
                          {step.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      {step.completedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Completed: {new Date(step.completedAt as string).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          <span>
            Last updated: {new Date(status.lastUpdatedAt).toLocaleString()} · Auto-refreshes every
            30 seconds
          </span>
        </div>
      </div>
    </div>
  );
}
