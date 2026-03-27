import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  RotateCcw,
  Eye,
  Play,
  Loader2,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  useMigrationBatches,
  useUploadMigration,
  useValidateBatch,
  useExecuteBatch,
  useRollbackBatch,
  useMappingTemplates,
} from "@/hooks/useDataMigration";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type {
  MigrationBatch,
  MigrationBatchStatus,
  MigrationEntityType,
  MappingTemplate,
} from "@/types/migration";

const STATUS_CONFIG: Record<
  MigrationBatchStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  validating: { label: "Validating", variant: "outline" },
  validated: { label: "Validated", variant: "default" },
  importing: { label: "Importing", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  rolled_back: { label: "Rolled Back", variant: "secondary" },
};

const ENTITY_TYPES: { value: MigrationEntityType; label: string }[] = [
  { value: "members", label: "Members / Customers" },
  { value: "accounts", label: "Accounts" },
  { value: "transactions", label: "Transactions" },
  { value: "payees", label: "Bill Pay Payees" },
  { value: "cards", label: "Cards" },
  { value: "loans", label: "Loans" },
];

const SOURCE_SYSTEMS = [
  "Symitar",
  "CU*Answers",
  "FIS",
  "Fiserv",
  "Jack Henry",
  "Corelation",
  "Fineract",
  "Other",
];

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function DataMigration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadSource, setUploadSource] = useState("");
  const [uploadEntity, setUploadEntity] = useState<MigrationEntityType>("members");
  const [uploadFormat, setUploadFormat] = useState<"csv" | "json">("csv");

  const batchesQuery = useMigrationBatches();
  const templatesQuery = useMappingTemplates();
  const uploadMutation = useUploadMigration();
  const validateMutation = useValidateBatch();
  const executeMutation = useExecuteBatch();
  const rollbackMutation = useRollbackBatch();

  if (batchesQuery.isLoading) return <PageSkeleton />;

  const batches = batchesQuery.data?.batches ?? [];
  const templates = templatesQuery.data?.templates ?? [];

  const totalRecords = batches.reduce((sum: number, b: MigrationBatch) => sum + b.totalRows, 0);
  const completedBatches = batches.filter((b: MigrationBatch) => b.status === "completed").length;
  const failedBatches = batches.filter((b: MigrationBatch) => b.status === "failed").length;

  function handleUpload() {
    if (!uploadLabel || !uploadSource) {
      toast({
        title: "Missing fields",
        description: "Label and source system are required.",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate(
      {
        label: uploadLabel,
        sourceSystem: uploadSource,
        entityType: uploadEntity,
        fileFormat: uploadFormat,
        fileName: `${uploadEntity}_export.${uploadFormat}`,
        fileContent: "",
      },
      {
        onSuccess: () => {
          toast({
            title: "Import created",
            description: "Your import batch has been created. Configure field mapping next.",
          });
          setShowUpload(false);
          setUploadLabel("");
          setUploadSource("");
        },
      },
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Migration</h1>
          <p className="text-muted-foreground">
            Import members, accounts, and transactions from your legacy core banking system
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Import
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{batches.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(totalRecords)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{completedBatches}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{failedBatches}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches">Import Batches</TabsTrigger>
          <TabsTrigger value="templates">Mapping Templates ({templates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="text-right">Valid</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch: MigrationBatch) => {
                    const cfg = STATUS_CONFIG[batch.status as MigrationBatchStatus];
                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {batch.label}
                        </TableCell>
                        <TableCell className="capitalize">{batch.entityType}</TableCell>
                        <TableCell>{batch.sourceSystem}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(batch.totalRows)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatNumber(batch.validRows)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatNumber(batch.errorRows)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {batch.status === "draft" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Configure mapping"
                                  onClick={() =>
                                    navigate(`/admin/data-migration/mapper/${batch.id}`)
                                  }
                                >
                                  <FileSpreadsheet className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Validate"
                                  disabled={validateMutation.isPending}
                                  onClick={() => validateMutation.mutate({ batchId: batch.id })}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {batch.status === "validated" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Preview"
                                  onClick={() =>
                                    navigate(`/admin/data-migration/preview/${batch.id}`)
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Execute import"
                                  disabled={executeMutation.isPending}
                                  onClick={() =>
                                    executeMutation.mutate(
                                      { batchId: batch.id },
                                      {
                                        onSuccess: () => toast({ title: "Import complete" }),
                                      },
                                    )
                                  }
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {(batch.status === "completed" || batch.status === "failed") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Rollback"
                                disabled={rollbackMutation.isPending}
                                onClick={() =>
                                  rollbackMutation.mutate(
                                    { batchId: batch.id },
                                    {
                                      onSuccess: () => toast({ title: "Batch rolled back" }),
                                    },
                                  )
                                }
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {batches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No import batches yet. Click "New Import" to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Source System</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead className="text-right">Fields Mapped</TableHead>
                    <TableHead>Shared</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tmpl: MappingTemplate) => (
                    <TableRow key={tmpl.id}>
                      <TableCell className="font-medium">{tmpl.name}</TableCell>
                      <TableCell>{tmpl.sourceSystem}</TableCell>
                      <TableCell className="capitalize">{tmpl.entityType}</TableCell>
                      <TableCell className="text-right">{tmpl.fieldMappings.length}</TableCell>
                      <TableCell>
                        {tmpl.isShared ? (
                          <Badge variant="default">Shared</Badge>
                        ) : (
                          <Badge variant="secondary">Private</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Data Import</DialogTitle>
            <DialogDescription>
              Upload a CSV or JSON file exported from your legacy core banking system. You can
              configure field mapping after upload.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Import Label</Label>
              <Input
                placeholder="e.g. Initial Member Load — Symitar Export"
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
              />
            </div>
            <div>
              <Label>Source System</Label>
              <Select value={uploadSource} onValueChange={setUploadSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source system" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_SYSTEMS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entity Type</Label>
              <Select
                value={uploadEntity}
                onValueChange={(v) => setUploadEntity(v as MigrationEntityType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File Format</Label>
              <Select
                value={uploadFormat}
                onValueChange={(v) => setUploadFormat(v as "csv" | "json")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File</Label>
              <Input type="file" accept=".csv,.json" />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum 500MB. Headers must be in the first row for CSV files.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Upload className="h-4 w-4 mr-2" />
              Upload & Create Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
