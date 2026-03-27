import { BookOpen, RefreshCw, Download, FileText, Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRunbooks, useGenerateRunbooks } from "@/hooks/useGoLive";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const RUNBOOK_DESCRIPTIONS: Record<string, string> = {
  "incident-response.md":
    "Auto-generated from Prometheus alert rules. Contains severity, check commands, and remediation steps for each alert.",
  "adapter-troubleshooting.md":
    "Per-adapter troubleshooting guide with common errors, health check endpoints, and escalation paths.",
  "backup-restore-sop.md":
    "Step-by-step backup and restore procedures generated from scripts/backup/ scripts.",
  "support-escalation.md": "Support tier decision tree and escalation playbook.",
  "tenant-runbook-demo.md":
    "Institution-specific runbook covering only enabled features and configured adapters.",
};

export default function RunbookGenerator() {
  const { toast } = useToast();
  const runbooksQuery = useRunbooks();
  const generateMutation = useGenerateRunbooks();

  if (runbooksQuery.isLoading) return <PageSkeleton />;

  const runbooks = runbooksQuery.data?.runbooks ?? [];

  function handleGenerate() {
    generateMutation.mutate(undefined, {
      onSuccess: () =>
        toast({
          title: "Runbooks generated",
          description:
            "All operational runbooks have been regenerated from current codebase artifacts.",
        }),
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Runbook Generator</h1>
          <p className="text-muted-foreground">
            Auto-generate operational runbooks from codebase artifacts: alerts, adapters, backup
            scripts
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Regenerate All
        </Button>
      </div>

      {/* Sources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alert Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">10</p>
            <p className="text-xs text-muted-foreground">From monitoring/prometheus/alerts/</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Adapter Domains</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">44+</p>
            <p className="text-xs text-muted-foreground">
              From supabase/functions/_shared/adapters/
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Backup Scripts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground">From scripts/backup/</p>
          </CardContent>
        </Card>
      </div>

      {/* Generated runbooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Generated Runbooks
          </CardTitle>
          <CardDescription>
            Runbooks are regenerated from the latest codebase artifacts. Download or preview below.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Runbook</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runbooks.map((rb) => (
                <TableRow key={rb.name}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{rb.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">
                    {RUNBOOK_DESCRIPTIONS[rb.name] ?? "Operational runbook"}
                  </TableCell>
                  <TableCell className="text-right text-sm">{formatBytes(rb.sizeBytes)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(rb.generatedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {runbooks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No runbooks generated yet. Click "Regenerate All" to create them.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
