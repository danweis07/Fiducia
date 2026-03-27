import { useState } from "react";
import {
  Rocket,
  GitBranch,
  ArrowUpCircle,
  RotateCcw,
  Plus,
  Loader2,
  Pin,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

interface Deployment {
  id: string;
  version: string;
  status: "canary" | "stable" | "rolling_out" | "rolled_back" | "promoted";
  rolloutPct: number;
  errorRate: number;
  deployedAt: string;
  autoRollback: boolean;
  errorThreshold: number;
  pinned: boolean;
}

interface CanaryMetrics {
  canary: { errorRate: number; p95Latency: number; requestCount: number };
  stable: { errorRate: number; p95Latency: number; requestCount: number };
}

const STATUS_STYLES: Record<string, string> = {
  canary: "bg-amber-100 text-amber-800 border-amber-200",
  stable: "bg-green-100 text-green-800 border-green-200",
  rolling_out: "bg-blue-100 text-blue-800 border-blue-200",
  rolled_back: "bg-red-100 text-red-800 border-red-200",
  promoted: "bg-green-100 text-green-800 border-green-200",
};

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CanaryDeployments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [newRolloutPct, setNewRolloutPct] = useState([10]);
  const [newErrorThreshold, setNewErrorThreshold] = useState("5");
  const [newAutoRollback, setNewAutoRollback] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);

  const deploymentsQuery = useQuery({
    queryKey: ["canary-deployments"],
    queryFn: () => gateway.request<{ deployments: Deployment[] }>("canary.deployments.list", {}),
  });

  const metricsQuery = useQuery({
    queryKey: ["canary-metrics", selectedDeployment],
    queryFn: () =>
      gateway.request<{ metrics: CanaryMetrics }>("canary.metrics", {
        deploymentId: selectedDeployment,
      }),
    enabled: !!selectedDeployment,
  });

  const createDeployment = useMutation({
    mutationFn: (params: {
      version: string;
      rolloutPct: number;
      errorThreshold: number;
      autoRollback: boolean;
    }) => gateway.request("canary.deployments.update", { action: "create", ...params }),
    onSuccess: () => {
      toast({ title: "Deployment created", description: "Canary deployment is rolling out." });
      qc.invalidateQueries({ queryKey: ["canary-deployments"] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateDeployment = useMutation({
    mutationFn: (params: { deploymentId: string; action: string }) =>
      gateway.request("canary.deployments.update", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["canary-deployments"] });
    },
  });

  function resetForm() {
    setNewVersion("");
    setNewRolloutPct([10]);
    setNewErrorThreshold("5");
    setNewAutoRollback(true);
  }

  const deployments = deploymentsQuery.data?.deployments ?? [];
  const metrics = metricsQuery.data?.metrics;
  const activeCount = deployments.filter(
    (d) => d.status !== "rolled_back" && d.status !== "promoted",
  ).length;
  const canaryCount = deployments.filter(
    (d) => d.status === "canary" || d.status === "rolling_out",
  ).length;
  const autoRollbackCount = deployments.filter((d) => d.autoRollback).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Canary Deployments</h1>
          <p className="text-muted-foreground">
            Manage progressive rollouts with automatic rollback.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Deployment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Canary Deployment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid gap-2">
                <Label>Version</Label>
                <Input
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="v2.4.1"
                />
              </div>
              <div className="grid gap-2">
                <Label>Rollout Percentage: {newRolloutPct[0]}%</Label>
                <Slider
                  value={newRolloutPct}
                  onValueChange={setNewRolloutPct}
                  min={1}
                  max={100}
                  step={1}
                />
              </div>
              <div className="grid gap-2">
                <Label>Error Rate Threshold (%)</Label>
                <Input
                  type="number"
                  value={newErrorThreshold}
                  onChange={(e) => setNewErrorThreshold(e.target.value)}
                  min={0}
                  max={100}
                  step={0.1}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-sm">Auto-Rollback</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically rollback if error rate exceeds threshold
                  </p>
                </div>
                <Switch checked={newAutoRollback} onCheckedChange={setNewAutoRollback} />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  createDeployment.mutate({
                    version: newVersion,
                    rolloutPct: newRolloutPct[0],
                    errorThreshold: Number(newErrorThreshold),
                    autoRollback: newAutoRollback,
                  })
                }
                disabled={!newVersion || createDeployment.isPending}
              >
                {createDeployment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Rocket className="mr-2 h-4 w-4" /> Deploy
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <Rocket className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active Deployments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                <GitBranch className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{canaryCount}</p>
                <p className="text-xs text-muted-foreground">Canary In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <RotateCcw className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{autoRollbackCount}</p>
                <p className="text-xs text-muted-foreground">Auto-Rollback Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployments table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Version</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Rollout</th>
                  <th className="px-4 py-2 text-left font-medium">Error Rate</th>
                  <th className="px-4 py-2 text-left font-medium">Deployed</th>
                  <th className="px-4 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((dep) => (
                  <tr
                    key={dep.id}
                    className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 ${
                      selectedDeployment === dep.id ? "bg-muted/50" : ""
                    }`}
                    onClick={() =>
                      setSelectedDeployment(dep.id === selectedDeployment ? null : dep.id)
                    }
                  >
                    <td className="px-4 py-3 font-mono font-medium">{dep.version}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${STATUS_STYLES[dep.status] ?? ""}`}
                      >
                        {dep.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{dep.rolloutPct}%</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          dep.errorRate > dep.errorThreshold ? "text-red-600 font-medium" : ""
                        }
                      >
                        {dep.errorRate}%
                      </span>
                      {dep.errorRate > dep.errorThreshold && (
                        <AlertTriangle className="inline ml-1 h-3.5 w-3.5 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(dep.deployedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {(dep.status === "canary" || dep.status === "rolling_out") && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Promote to 100%"
                              onClick={() =>
                                updateDeployment.mutate({
                                  deploymentId: dep.id,
                                  action: "promote",
                                })
                              }
                            >
                              <ArrowUpCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Rollback"
                              onClick={() =>
                                updateDeployment.mutate({
                                  deploymentId: dep.id,
                                  action: "rollback",
                                })
                              }
                            >
                              <RotateCcw className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={dep.pinned ? "Unpin version" : "Pin version"}
                          onClick={() =>
                            updateDeployment.mutate({
                              deploymentId: dep.id,
                              action: dep.pinned ? "unpin" : "pin",
                            })
                          }
                        >
                          <Pin
                            className={`h-4 w-4 ${dep.pinned ? "text-primary" : "text-muted-foreground"}`}
                          />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {deployments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No deployments found. Create a new canary deployment to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Metrics comparison */}
      {selectedDeployment && metrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Canary vs Stable Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium text-center">Error Rate</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-2">
                    <p className="text-lg font-bold">{metrics.canary.errorRate}%</p>
                    <p className="text-xs text-muted-foreground">Canary</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded p-2">
                    <p className="text-lg font-bold">{metrics.stable.errorRate}%</p>
                    <p className="text-xs text-muted-foreground">Stable</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium text-center">P95 Latency</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-2">
                    <p className="text-lg font-bold">{metrics.canary.p95Latency}ms</p>
                    <p className="text-xs text-muted-foreground">Canary</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded p-2">
                    <p className="text-lg font-bold">{metrics.stable.p95Latency}ms</p>
                    <p className="text-xs text-muted-foreground">Stable</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium text-center">Request Count</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-2">
                    <p className="text-lg font-bold">
                      {metrics.canary.requestCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Canary</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded p-2">
                    <p className="text-lg font-bold">
                      {metrics.stable.requestCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Stable</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
