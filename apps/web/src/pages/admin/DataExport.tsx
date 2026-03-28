import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LayoutTemplate,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBankingDateTime } from "@/lib/common/date";
import { useToast } from "@/hooks/use-toast";
import {
  useExportList,
  useExportSummary,
  useCreateExport,
  useDownloadExport,
  useDeleteExport,
  useReportTemplates,
  useCreateReportTemplate,
  useDeleteReportTemplate,
} from "@/hooks/useDataExport";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type { ExportFormat, ReportType } from "@/types/admin";

const REPORT_TYPE_KEYS: { value: ReportType; key: string }[] = [
  { value: "transactions", key: "dataExport.reportTypes.transactions" },
  { value: "accounts", key: "dataExport.reportTypes.accounts" },
  { value: "compliance", key: "dataExport.reportTypes.compliance" },
  { value: "audit", key: "dataExport.reportTypes.audit" },
  { value: "financial_summary", key: "dataExport.reportTypes.financialSummary" },
  { value: "member_activity", key: "dataExport.reportTypes.memberActivity" },
  { value: "loan_portfolio", key: "dataExport.reportTypes.loanPortfolio" },
  { value: "deposit_summary", key: "dataExport.reportTypes.depositSummary" },
];

const FORMAT_OPTION_KEYS: { value: ExportFormat; key: string }[] = [
  { value: "csv", key: "dataExport.formats.csv" },
  { value: "pdf", key: "dataExport.formats.pdf" },
  { value: "json", key: "dataExport.formats.json" },
  { value: "xlsx", key: "dataExport.formats.xlsx" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DataExport() {
  const { t } = useTranslation("admin");
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showNewExport, setShowNewExport] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  // New export form state
  const [newReportType, setNewReportType] = useState<ReportType>("transactions");
  const [newFormat, setNewFormat] = useState<ExportFormat>("csv");
  const [newDateStart, setNewDateStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [newDateEnd, setNewDateEnd] = useState(() => new Date().toISOString().split("T")[0]);

  // New template form state
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateReportType, setTemplateReportType] = useState<ReportType>("transactions");
  const [templateFormat, setTemplateFormat] = useState<ExportFormat>("csv");

  const exportListQuery = useExportList({
    status: statusFilter === "all" ? undefined : statusFilter,
    reportType: typeFilter === "all" ? undefined : typeFilter,
  });
  const summaryQuery = useExportSummary();
  const templatesQuery = useReportTemplates();
  const createExport = useCreateExport();
  const downloadExport = useDownloadExport();
  const deleteExport = useDeleteExport();
  const createTemplate = useCreateReportTemplate();
  const deleteTemplate = useDeleteReportTemplate();

  const summary = summaryQuery.data?.summary;
  const exports = exportListQuery.data?.exports ?? [];
  const templates = templatesQuery.data?.templates ?? [];

  function handleCreateExport() {
    createExport.mutate(
      {
        reportType: newReportType,
        format: newFormat,
        dateRangeStart: newDateStart,
        dateRangeEnd: newDateEnd,
      },
      {
        onSuccess: () => {
          toast({
            title: t("dataExport.toast.exportCreated"),
            description: t("dataExport.toast.exportCreatedDesc"),
          });
          setShowNewExport(false);
        },
        onError: () =>
          toast({
            title: t("dataExport.toast.exportFailed"),
            description: t("dataExport.toast.exportFailedDesc"),
            variant: "destructive",
          }),
      },
    );
  }

  function handleDownload(exportId: string) {
    downloadExport.mutate(exportId, {
      onSuccess: (data) => {
        toast({
          title: t("dataExport.toast.downloadReady"),
          description: t("dataExport.toast.downloadReadyDesc", { fileName: data.fileName }),
        });
      },
      onError: () => toast({ title: t("dataExport.toast.downloadFailed"), variant: "destructive" }),
    });
  }

  function handleDelete(exportId: string) {
    deleteExport.mutate(exportId, {
      onSuccess: () => toast({ title: t("dataExport.toast.exportDeleted") }),
    });
  }

  function handleCreateTemplate() {
    if (!templateName.trim()) return;
    createTemplate.mutate(
      {
        name: templateName,
        description: templateDescription,
        reportType: templateReportType,
        defaultFormat: templateFormat,
      },
      {
        onSuccess: () => {
          toast({ title: t("dataExport.toast.templateCreated") });
          setShowNewTemplate(false);
          setTemplateName("");
          setTemplateDescription("");
        },
      },
    );
  }

  if (summaryQuery.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dataExport.title")}</h1>
          <p className="text-muted-foreground">{t("dataExport.description")}</p>
        </div>
        <Button onClick={() => setShowNewExport(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t("dataExport.newExport")}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {t("dataExport.summary.totalExports")}
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalExports ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {t("dataExport.summary.completed")}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.completedExports ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{t("dataExport.summary.failed")}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.failedExports ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {t("dataExport.summary.storageUsed")}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(summary?.storageUsedBytes ?? 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Exports / Templates */}
      <Tabs defaultValue="exports">
        <TabsList>
          <TabsTrigger value="exports">{t("dataExport.tabs.exports")}</TabsTrigger>
          <TabsTrigger value="templates">{t("dataExport.tabs.templates")}</TabsTrigger>
        </TabsList>

        {/* Exports tab */}
        <TabsContent value="exports" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("dataExport.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dataExport.filters.allStatuses")}</SelectItem>
                <SelectItem value="completed">{t("dataExport.filters.completed")}</SelectItem>
                <SelectItem value="processing">{t("dataExport.filters.processing")}</SelectItem>
                <SelectItem value="pending">{t("dataExport.filters.pending")}</SelectItem>
                <SelectItem value="failed">{t("dataExport.filters.failed")}</SelectItem>
                <SelectItem value="expired">{t("dataExport.filters.expired")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("dataExport.filters.reportType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dataExport.filters.allTypes")}</SelectItem>
                {REPORT_TYPE_KEYS.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {t(rt.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => exportListQuery.refetch()}>
              <RefreshCw
                className={`h-4 w-4 ${exportListQuery.isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dataExport.table.report")}</TableHead>
                  <TableHead>{t("dataExport.table.format")}</TableHead>
                  <TableHead>{t("dataExport.table.dateRange")}</TableHead>
                  <TableHead>{t("dataExport.table.status")}</TableHead>
                  <TableHead>{t("dataExport.table.rows")}</TableHead>
                  <TableHead>{t("dataExport.table.size")}</TableHead>
                  <TableHead>{t("dataExport.table.requested")}</TableHead>
                  <TableHead className="text-right">{t("dataExport.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t("dataExport.emptyExports")}
                    </TableCell>
                  </TableRow>
                )}
                {exports.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="font-medium">
                      {REPORT_TYPE_KEYS.find((rt) => rt.value === exp.reportType)
                        ? t(REPORT_TYPE_KEYS.find((rt) => rt.value === exp.reportType)!.key)
                        : exp.reportType}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-xs">
                        {exp.format}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {exp.dateRangeStart} &mdash; {exp.dateRangeEnd}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={exp.status} className="gap-1" />
                    </TableCell>
                    <TableCell>{exp.rowCount?.toLocaleString() ?? "\u2014"}</TableCell>
                    <TableCell>
                      {exp.fileSizeBytes ? formatBytes(exp.fileSizeBytes) : "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatBankingDateTime(exp.requestedAt)}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {exp.status === "completed" && (
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(exp.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Templates tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowNewTemplate(true)}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> {t("dataExport.newTemplate")}
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dataExport.templateTable.name")}</TableHead>
                  <TableHead>{t("dataExport.templateTable.type")}</TableHead>
                  <TableHead>{t("dataExport.templateTable.format")}</TableHead>
                  <TableHead>{t("dataExport.templateTable.schedule")}</TableHead>
                  <TableHead>{t("dataExport.templateTable.created")}</TableHead>
                  <TableHead className="text-right">
                    {t("dataExport.templateTable.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t("dataExport.emptyTemplates")}
                    </TableCell>
                  </TableRow>
                )}
                {templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{tpl.name}</p>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground">{tpl.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {REPORT_TYPE_KEYS.find((rt) => rt.value === tpl.reportType)
                        ? t(REPORT_TYPE_KEYS.find((rt) => rt.value === tpl.reportType)!.key)
                        : tpl.reportType}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-xs">
                        {tpl.defaultFormat}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tpl.schedule?.isActive
                        ? `${(tpl.schedule as unknown as Record<string, unknown>).frequency}`
                        : t("dataExport.manual")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatBankingDateTime(tpl.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewReportType(tpl.reportType as ReportType);
                          setNewFormat(tpl.defaultFormat as ExportFormat);
                          setShowNewExport(true);
                        }}
                      >
                        {t("dataExport.run")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTemplate.mutate(tpl.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Export Dialog */}
      <Dialog open={showNewExport} onOpenChange={setShowNewExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dataExport.newExportDialog.title")}</DialogTitle>
            <DialogDescription>{t("dataExport.newExportDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("dataExport.newExportDialog.reportType")}</Label>
              <Select
                value={newReportType}
                onValueChange={(v) => setNewReportType(v as ReportType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPE_KEYS.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {t(rt.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("dataExport.newExportDialog.format")}</Label>
              <Select value={newFormat} onValueChange={(v) => setNewFormat(v as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTION_KEYS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {t(f.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("dataExport.newExportDialog.startDate")}</Label>
                <Input
                  type="date"
                  value={newDateStart}
                  onChange={(e) => setNewDateStart(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("dataExport.newExportDialog.endDate")}</Label>
                <Input
                  type="date"
                  value={newDateEnd}
                  onChange={(e) => setNewDateEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewExport(false)}>
              {t("dataExport.cancel")}
            </Button>
            <Button onClick={handleCreateExport} disabled={createExport.isPending}>
              {createExport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dataExport.generateExport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Template Dialog */}
      <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Report Template</DialogTitle>
            <DialogDescription>Save a reusable report configuration.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Monthly Transaction Report"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="grid gap-2">
              <Label>Report Type</Label>
              <Select
                value={templateReportType}
                onValueChange={(v) => setTemplateReportType(v as ReportType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPE_KEYS.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {t(rt.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Default Format</Label>
              <Select
                value={templateFormat}
                onValueChange={(v) => setTemplateFormat(v as ExportFormat)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTION_KEYS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {t(f.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTemplate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={createTemplate.isPending || !templateName.trim()}
            >
              {createTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
