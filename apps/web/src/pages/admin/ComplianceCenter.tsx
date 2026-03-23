import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileSearch,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/common/currency";
import { gateway } from "@/lib/gateway";
import { toast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type { ComplianceReview, AMLAlert, GDPRRequest } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ComplianceCenter() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [retentionPeriod, setRetentionPeriod] = useState("5");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: kycData, isLoading: kycLoading } = useQuery({
    queryKey: ["admin-compliance-kyc"],
    queryFn: () => gateway.request("admin.compliance.kycReviews", {}),
  });

  const { data: amlData, isLoading: amlLoading } = useQuery({
    queryKey: ["admin-compliance-aml"],
    queryFn: () => gateway.request("admin.compliance.amlAlerts", {}),
  });

  const { data: gdprData, isLoading: gdprLoading } = useQuery({
    queryKey: ["admin-compliance-gdpr"],
    queryFn: () => gateway.request("admin.compliance.gdprRequests", {}),
  });

  const kycQueue = (kycData as { reviews?: ComplianceReview[] })?.reviews ?? [];
  const amlAlerts = (amlData as { alerts?: AMLAlert[] })?.alerts ?? [];
  const gdprRequests = (gdprData as { requests?: GDPRRequest[] })?.requests ?? [];

  const handleKycAction = useCallback(
    async (reviewId: string, action: "approve" | "reject") => {
      setActionLoading(reviewId);
      try {
        const route =
          action === "approve" ? "admin.compliance.approveKyc" : "admin.compliance.rejectKyc";
        await gateway.request(route, { reviewId });
        toast({
          title:
            action === "approve"
              ? t("compliance.toast.kycApproved")
              : t("compliance.toast.kycRejected"),
          description: t("compliance.toast.reviewActioned", { reviewId, action }),
        });
        queryClient.invalidateQueries({ queryKey: ["admin-compliance-kyc"] });
      } catch {
        toast({
          title: t("compliance.toast.actionFailed"),
          description: t("compliance.toast.couldNotAction", { action }),
          variant: "destructive",
        });
      } finally {
        setActionLoading(null);
      }
    },
    [queryClient],
  );

  const handleAmlUpdate = useCallback(
    async (alertId: string, status: string) => {
      setActionLoading(alertId);
      try {
        await gateway.request("admin.compliance.updateAmlStatus", { alertId, status });
        toast({
          title: t("compliance.toast.amlUpdated"),
          description: t("compliance.toast.alertStatusChanged", { status }),
        });
        queryClient.invalidateQueries({ queryKey: ["admin-compliance-aml"] });
      } catch {
        toast({ title: t("compliance.toast.updateFailed"), variant: "destructive" });
      } finally {
        setActionLoading(null);
      }
    },
    [queryClient],
  );

  const isLoading = kycLoading || amlLoading || gdprLoading;
  const complianceScore =
    Math.round(
      (kycQueue.filter((k) => k.status === "approved").length / Math.max(kycQueue.length, 1)) * 50 +
        (amlAlerts.filter((a) => a.status === "cleared").length / Math.max(amlAlerts.length, 1)) *
          50,
    ) || 87;

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("compliance.title")}
          </h1>
          <p className="text-sm text-slate-500">{t("compliance.subtitle")}</p>
        </div>
        <Card className="px-4 py-2">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-slate-500">{t("compliance.complianceScore")}</p>
              <div className="flex items-center gap-2">
                <Progress value={complianceScore} className="w-20 h-2" />
                <span className="text-sm font-bold text-slate-900">{complianceScore}%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="kyc">
        <TabsList>
          <TabsTrigger value="kyc" className="gap-1.5">
            <FileSearch className="h-3.5 w-3.5" /> {t("compliance.kycQueue")}
            <Badge variant="secondary" className="ml-1 text-xs">
              {kycQueue.filter((k) => k.status === "pending").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="aml" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {t("compliance.amlAlerts")}
            <Badge variant="destructive" className="ml-1 text-xs">
              {amlAlerts.filter((a) => a.status === "open").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {t("compliance.dataGovernance")}
          </TabsTrigger>
        </TabsList>

        {/* KYC Review Queue */}
        <TabsContent value="kyc" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("compliance.pendingKycVerifications")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("compliance.table.customer")}</TableHead>
                      <TableHead>{t("compliance.table.submitted")}</TableHead>
                      <TableHead>{t("compliance.table.documentType")}</TableHead>
                      <TableHead>{t("compliance.table.status")}</TableHead>
                      <TableHead className="w-48">{t("compliance.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kycQueue.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.customerName}</TableCell>
                        <TableCell className="text-slate-500">{item.submissionDate}</TableCell>
                        <TableCell>{item.documentType}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 gap-1 text-xs"
                                disabled={actionLoading === item.id}
                                onClick={() => handleKycAction(item.id, "approve")}
                              >
                                {actionLoading === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}{" "}
                                {t("compliance.approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 gap-1 text-xs"
                                disabled={actionLoading === item.id}
                                onClick={() => handleKycAction(item.id, "reject")}
                              >
                                {actionLoading === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}{" "}
                                {t("compliance.reject")}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {kycQueue.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                          {t("compliance.noKycReviews")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AML Alerts */}
        <TabsContent value="aml" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("compliance.amlFlaggedTransactions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("compliance.table.customer")}</TableHead>
                      <TableHead>{t("compliance.table.amount")}</TableHead>
                      <TableHead>{t("compliance.table.reason")}</TableHead>
                      <TableHead>{t("compliance.table.status")}</TableHead>
                      <TableHead>{t("compliance.table.flagged")}</TableHead>
                      <TableHead className="w-40">{t("compliance.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {amlAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.customerName}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(alert.transactionAmountCents)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 max-w-[250px] truncate">
                          {alert.reason}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={alert.status} className="text-xs" />
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(alert.flaggedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {alert.status === "open" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-6 text-xs"
                                disabled={actionLoading === alert.id}
                                onClick={() => handleAmlUpdate(alert.id, "investigating")}
                              >
                                {t("compliance.investigate")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                disabled={actionLoading === alert.id}
                                onClick={() => handleAmlUpdate(alert.id, "cleared")}
                              >
                                {t("compliance.clear")}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {amlAlerts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          {t("compliance.noAmlAlerts")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Governance */}
        <TabsContent value="data" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("compliance.dataRetention")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-slate-500">{t("compliance.retentionPeriod")}</p>
                  <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
                    <SelectTrigger className="w-40 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">{t("compliance.retention.threeYears")}</SelectItem>
                      <SelectItem value="5">{t("compliance.retention.fiveYears")}</SelectItem>
                      <SelectItem value="7">{t("compliance.retention.sevenYears")}</SelectItem>
                      <SelectItem value="10">{t("compliance.retention.tenYears")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{t("compliance.nextPurge")}</p>
                  <p className="text-sm font-medium mt-1.5">April 1, 2026</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("compliance.gdprRequests")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("compliance.table.customer")}</TableHead>
                      <TableHead>{t("compliance.table.requestType")}</TableHead>
                      <TableHead>{t("compliance.table.status")}</TableHead>
                      <TableHead>{t("compliance.table.requested")}</TableHead>
                      <TableHead>{t("compliance.table.completed")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gdprRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.customerName}</TableCell>
                        <TableCell className="capitalize">{req.requestType}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={req.status}
                            label={req.status.replace("_", " ")}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-slate-500">{req.requestedAt}</TableCell>
                        <TableCell className="text-slate-500">
                          {req.completedAt ?? "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {gdprRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                          {t("compliance.noDataRequests")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
