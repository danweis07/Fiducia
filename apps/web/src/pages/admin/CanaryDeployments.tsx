import { useState } from "react";
import {
  GitBranch,
  Plus,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
  useDeployments,
  useCreateDeployment,
  useUpdateDeployment,
  useRollbackDeployment,
} from "@/hooks/useGoLive";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type { DeploymentStatus } from "@/types/golive";

const STATUS_CONFIG: Record<
  DeploymentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Active", variant: "default" },
  canary: { label: "Canary", variant: "outline" },
  rolling_back: { label: "Rolling Back", variant: "destructive" },
  inactive: { label: "Inactive", variant: "secondary" },
};

export default function CanaryDeployments() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [newRollout, setNewRollout] = useState(10);
  const [newThreshold, setNewThreshold] = useState("0.05");

  const deploymentsQuery = useDeployments();
  const createMutation = useCreateDeployment();
  const updateMutation = useUpdateDeployment();
  const rollbackMutation = useRollbackDeployment();

  if (deploymentsQuery.isLoading) return <PageSkeleton />;

  const deployments = deploymentsQuery.data?.deployments ?? [];

  function handleCreate() {
    if (!newVersion) {
      toast({ title: "Version required", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        version: newVersion,
        rolloutPercentage: newRollout,
        errorRateThreshold: parseFloat(newThreshold),
      },
      {
        onSuccess: () => {
          toast({ title: "Canary deployment created" });
          setShowCreate(false);
          setNewVersion("");
          setNewRollout(10);
        },
      },
    );
  }

  function handleUpdateRollout(deploymentId: string, rolloutPercentage: number) {
    updateMutation.mutate(
      { deploymentId, rolloutPercentage },
      {
        onSuccess: () => toast({ title: `Rollout updated to ${rolloutPercentage}%` }),
      },
    );
  }

  function handleTogglePin(deploymentId: string, pinned: boolean) {
    updateMutation.mutate(
      { deploymentId, pinned },
      {
        onSuccess: () => toast({ title: pinned ? "Version pinned" : "Version unpinned" }),
      },
    );
  }

  function handleRollback(deploymentId: string) {
    rollbackMutation.mutate(deploymentId, {
      onSuccess: () => toast({ title: "Deployment rolled back", variant: "destructive" }),
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Canary Deployments</h1>
          <p className="text-muted-foreground">
            Per-tenant version pinning, gradual rollout, and automatic rollback
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Canary
        </Button>
      </div>

      {/* Active deployments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Deployments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rollout %</TableHead>
                <TableHead>Error Threshold</TableHead>
                <TableHead>Pinned</TableHead>
                <TableHead>Auto-Rollback</TableHead>
                <TableHead>Deployed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((dep) => {
                const cfg = STATUS_CONFIG[dep.status];
                return (
                  <TableRow key={dep.id}>
                    <TableCell className="font-mono font-medium">{dep.version}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <Slider
                          value={[dep.rolloutPercentage]}
                          min={0}
                          max={100}
                          step={5}
                          className="flex-1"
                          onValueCommit={(val) => handleUpdateRollout(dep.id, val[0])}
                          disabled={dep.status !== "canary"}
                        />
                        <span className="text-sm w-10 text-right">{dep.rolloutPercentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{(dep.errorRateThreshold * 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      <Switch
                        checked={dep.pinned}
                        onCheckedChange={(checked) => handleTogglePin(dep.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      {dep.autoRollback ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(dep.deployedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {dep.status === "canary" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRollback(dep.id)}
                          disabled={rollbackMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Rollback
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {deployments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No deployments configured. Click "New Canary" to start a gradual rollout.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Canary Deployment</DialogTitle>
            <DialogDescription>
              Deploy a new version to a percentage of traffic with automatic rollback.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Version</Label>
              <Input
                placeholder="e.g. 1.3.0-rc.1"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
              />
            </div>
            <div>
              <Label>Initial Rollout Percentage: {newRollout}%</Label>
              <Slider
                value={[newRollout]}
                min={1}
                max={100}
                step={1}
                onValueChange={(val) => setNewRollout(val[0])}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Error Rate Threshold</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-rollback if error rate exceeds this threshold (e.g. 0.05 = 5%)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <GitBranch className="h-4 w-4 mr-2" />
              Deploy Canary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
