import { useParams } from "react-router-dom";
import { CheckCircle2, Clock, Loader2, XCircle, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGoLivePublicStatus } from "@/hooks/useGoLive";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  in_progress: <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />,
  failed: <XCircle className="h-5 w-5 text-red-600" />,
  pending: <Clock className="h-5 w-5 text-muted-foreground" />,
  skipped: <Clock className="h-5 w-5 text-muted-foreground opacity-50" />,
};

export default function GoLiveStatus() {
  const { id } = useParams<{ id: string }>();
  const statusQuery = useGoLivePublicStatus(id ?? "");

  if (statusQuery.isLoading) return <PageSkeleton />;

  const status = statusQuery.data?.status;

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Workflow not found or access denied.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPct = status.totalSteps > 0 ? (status.stepsCompleted / status.totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <Building2 className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold">{status.institutionName}</h1>
          <p className="text-muted-foreground">Go-Live Status</p>
          <Badge variant="outline" className="mt-2">
            {status.workflowStatus.replace("_", " ")}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {status.stepsCompleted} of {status.totalSteps} steps completed
              </span>
              <span className="text-sm font-medium">{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {status.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {STATUS_ICON[step.status]}
                <span
                  className={`text-sm ${step.status === "pending" ? "text-muted-foreground" : "font-medium"}`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Last updated: {new Date(status.lastUpdatedAt).toLocaleString()}
          {" · "}Auto-refreshes every 15 seconds
        </p>
      </div>
    </div>
  );
}
