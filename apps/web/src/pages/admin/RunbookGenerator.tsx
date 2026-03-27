import { useState } from "react";
import {
  BookOpen,
  Download,
  RefreshCw,
  Loader2,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

interface Runbook {
  id: string;
  name: string;
  category: "incident_response" | "adapter_guide" | "backup_restore" | "escalation";
  generatedAt: string;
  sourceArtifacts: number;
  content: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  incident_response: "Incident Response",
  adapter_guide: "Adapter Guide",
  backup_restore: "Backup/Restore",
  escalation: "Escalation",
};

const CATEGORY_COLORS: Record<string, string> = {
  incident_response: "bg-red-100 text-red-800 border-red-200",
  adapter_guide: "bg-blue-100 text-blue-800 border-blue-200",
  backup_restore: "bg-amber-100 text-amber-800 border-amber-200",
  escalation: "bg-purple-100 text-purple-800 border-purple-200",
};

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RunbookGenerator() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runbooksQuery = useQuery({
    queryKey: ["admin-runbooks"],
    queryFn: () =>
      gateway.request<{ runbooks: Runbook[]; lastGenerated: string | null }>(
        "admin.runbooks.list",
        {},
      ),
  });

  const generateMutation = useMutation({
    mutationFn: (params: { regenerateAll?: boolean }) =>
      gateway.request("admin.runbooks.generate", params),
    onSuccess: () => {
      toast({ title: "Runbooks generated", description: "All runbooks have been updated." });
      qc.invalidateQueries({ queryKey: ["admin-runbooks"] });
    },
  });

  const runbooks = runbooksQuery.data?.runbooks ?? [];
  const lastGenerated = runbooksQuery.data?.lastGenerated;

  const filtered =
    activeTab === "all" ? runbooks : runbooks.filter((r) => r.category === activeTab);

  function downloadRunbook(runbook: Runbook) {
    const blob = new Blob([runbook.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${runbook.name.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Runbook Generator</h1>
          <p className="text-muted-foreground">Auto-generated SOPs and operational runbooks.</p>
          {lastGenerated && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Last generated: {formatDate(lastGenerated)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => generateMutation.mutate({})} disabled={generateMutation.isPending}>
            {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <BookOpen className="mr-2 h-4 w-4" /> Generate Runbooks
          </Button>
          <Button
            variant="outline"
            onClick={() => generateMutation.mutate({ regenerateAll: true })}
            disabled={generateMutation.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="incident_response">Incident Response</TabsTrigger>
          <TabsTrigger value="adapter_guide">Adapter Guides</TabsTrigger>
          <TabsTrigger value="backup_restore">Backup/Restore</TabsTrigger>
          <TabsTrigger value="escalation">Escalation</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No runbooks generated yet. Click &quot;Generate Runbooks&quot; to get started.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((runbook) => (
          <Card key={runbook.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight">{runbook.name}</CardTitle>
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${CATEGORY_COLORS[runbook.category]}`}
                >
                  {CATEGORY_LABELS[runbook.category]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatDate(runbook.generatedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {runbook.sourceArtifacts} sources
                </span>
              </div>

              {expandedId === runbook.id && (
                <div className="rounded-lg border bg-muted/30 p-3 max-h-64 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">{runbook.content}</pre>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setExpandedId(expandedId === runbook.id ? null : runbook.id)}
                >
                  {expandedId === runbook.id ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {expandedId === runbook.id ? "Collapse" : "Preview"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => downloadRunbook(runbook)}
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
