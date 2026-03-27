import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Loader2,
  BarChart3,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  useMigrationBatch,
  useMigrationPreview,
  useExecuteBatch,
  useReconciliationReport,
} from "@/hooks/useDataMigration";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function MigrationPreview() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const batchQuery = useMigrationBatch(batchId ?? "");
  const previewQuery = useMigrationPreview(batchId ?? "");
  const reconQuery = useReconciliationReport(batchId ?? "");
  const executeMutation = useExecuteBatch();

  if (batchQuery.isLoading || previewQuery.isLoading) return <PageSkeleton />;

  const batch = batchQuery.data?.batch;
  const previewRaw = previewQuery.data;
  const recon = reconQuery.data?.report;
  // Flatten preview into shape the template expects
  const preview = previewRaw
    ? {
        totalRows: previewRaw.validation.totalRows,
        validRows: previewRaw.validation.validRows,
        errorRows: previewRaw.validation.invalidRows,
        warningRows: previewRaw.validation.warningRows,
        sampleCreates: previewRaw.sampleRows,
      }
    : null;

  if (!batch || !preview) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Batch not found.</p>
      </div>
    );
  }

  const validPct = preview.totalRows > 0 ? (preview.validRows / preview.totalRows) * 100 : 0;

  function handleExecute() {
    executeMutation.mutate(
      { batchId: batchId! },
      {
        onSuccess: () => {
          toast({
            title: "Import complete",
            description: `${formatNumber(preview!.validRows)} records imported successfully.`,
          });
          navigate("/admin/data-migration");
        },
      },
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/data-migration")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Import Preview</h1>
          <p className="text-muted-foreground">{batch.label}</p>
        </div>
        <Button
          onClick={handleExecute}
          disabled={executeMutation.isPending || preview.errorRows > 0}
        >
          {executeMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Approve & Import
        </Button>
      </div>

      {/* Validation summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(preview.totalRows)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Valid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatNumber(preview.validRows)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-red-600" /> Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatNumber(preview.errorRows)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-500">{formatNumber(preview.warningRows)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Validation Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={validPct} className="h-3" />
          <p className="text-xs text-muted-foreground mt-1">
            {validPct.toFixed(1)}% of rows passed validation
          </p>
        </CardContent>
      </Card>

      {/* Reconciliation */}
      {recon && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <div>
                <CardTitle>Balance Reconciliation</CardTitle>
                <CardDescription>Comparing source totals against target</CardDescription>
              </div>
              {recon.passed ? (
                <Badge variant="default" className="ml-auto">
                  Passed
                </Badge>
              ) : (
                <Badge variant="destructive" className="ml-auto">
                  Discrepancies Found
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Source</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Row Count</TableCell>
                  <TableCell className="text-right">{formatNumber(recon.sourceRowCount)}</TableCell>
                  <TableCell className="text-right">{formatNumber(recon.targetRowCount)}</TableCell>
                  <TableCell className="text-right">
                    {recon.sourceRowCount === recon.targetRowCount ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 inline" />
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Balance</TableCell>
                  <TableCell className="text-right">
                    {formatCents(recon.sourceTotalCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(recon.targetTotalCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {recon.sourceTotalCents === recon.targetTotalCents ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 inline" />
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sample records */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Records to Import</CardTitle>
          <CardDescription>
            First {preview.sampleCreates.length} records that will be created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preview.sampleCreates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.sampleCreates.map((row, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.targetTable}</TableCell>
                    <TableCell>{Object.keys(row.fields).length} fields</TableCell>
                    <TableCell>{row.errors.length > 0 ? row.errors[0].message : "OK"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No sample records available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
