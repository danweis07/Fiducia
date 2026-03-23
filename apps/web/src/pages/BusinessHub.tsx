import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  FileText,
  ArrowRightLeft,
  Bell,
  ArrowRight,
  BarChart3,
  Landmark,
} from "lucide-react";
import { useApprovalSummary } from "@/hooks/useApprovals";
import { useSweepSummary } from "@/hooks/useCashSweeps";
import { useInvoices } from "@/hooks/useInvoiceProcessor";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

export default function BusinessHubPage() {
  const { t } = useTranslation("banking");
  const { data: approvalData } = useApprovalSummary();
  const approvalSummary = approvalData?.summary;
  const { data: sweepData } = useSweepSummary();
  const sweepSummary = sweepData?.summary;
  const { data: invoiceData } = useInvoices();
  const recentInvoices = invoiceData?.invoices ?? [];
  const pendingInvoices = recentInvoices.filter(
    (i) => i.status === "parsed" || i.status === "pending",
  );

  return (
    <AppShell>
      <div className="container mx-auto max-w-6xl py-6 px-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" />
            {t("businessHub.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("businessHub.subtitle")}</p>
        </div>

        {/* Quick Status Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(approvalSummary?.pendingCount ?? 0) > 0 && (
            <Card className="border-yellow-300 bg-gradient-to-br from-yellow-50 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-yellow-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        {t("businessHub.approvalsWaiting")}
                      </p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {approvalSummary?.pendingCount}
                      </p>
                    </div>
                  </div>
                  <Link to="/approvals">
                    <Button size="sm" variant="outline" className="border-yellow-300">
                      {t("businessHub.review")} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
          {pendingInvoices.length > 0 && (
            <Card className="border-blue-300 bg-gradient-to-br from-blue-50 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        {t("businessHub.invoicesToReview")}
                      </p>
                      <p className="text-2xl font-bold text-blue-900">{pendingInvoices.length}</p>
                    </div>
                  </div>
                  <Link to="/invoices">
                    <Button size="sm" variant="outline" className="border-blue-300">
                      {t("businessHub.review")} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
          {(sweepSummary?.estimatedYieldCents ?? 0) > 0 && (
            <Card className="border-green-300 bg-gradient-to-br from-green-50 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        {t("businessHub.weeklyYield")}
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(sweepSummary?.estimatedYieldCents ?? 0)}
                      </p>
                    </div>
                  </div>
                  <Link to="/cash-sweeps">
                    <Button size="sm" variant="outline" className="border-green-300">
                      {t("businessHub.view")} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Zero-Touch AP */}
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="flex items-center gap-2">
                {t("businessHub.zeroTouchAP")}
                <Badge variant="default" className="text-xs">
                  {t("businessHub.aiPowered")}
                </Badge>
              </CardTitle>
              <CardDescription>{t("businessHub.zeroTouchAPDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>{t("businessHub.invoicesProcessed", { count: recentInvoices.length })}</span>
                {pendingInvoices.length > 0 && (
                  <Badge variant="secondary">
                    {t("businessHub.pendingCount", { count: pendingInvoices.length })}
                  </Badge>
                )}
              </div>
              <Link to="/invoices">
                <Button className="w-full group-hover:bg-primary/90">
                  <FileText className="w-4 h-4 mr-2" /> {t("businessHub.openInvoiceProcessor")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Smart Sweeps */}
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-2">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="flex items-center gap-2">
                {t("businessHub.smartCashSweeps")}
                <Badge variant="outline" className="text-xs">
                  {t("businessHub.automated")}
                </Badge>
              </CardTitle>
              <CardDescription>{t("businessHub.smartCashSweepsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>
                  {t("businessHub.activeRulesCount", { count: sweepSummary?.activeRules ?? 0 })}
                </span>
                <span>
                  {t("businessHub.sweptAmount", {
                    amount: formatCurrency(sweepSummary?.totalSweptCents ?? 0),
                  })}
                </span>
              </div>
              <Link to="/cash-sweeps">
                <Button className="w-full" variant="outline">
                  <ArrowRightLeft className="w-4 h-4 mr-2" /> {t("businessHub.manageSweeps")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* JIT Permissions */}
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="flex items-center gap-2">
                {t("businessHub.jitPermissions")}
                <Badge variant="outline" className="text-xs">
                  {t("businessHub.realTime")}
                </Badge>
              </CardTitle>
              <CardDescription>{t("businessHub.jitPermissionsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>
                  {t("businessHub.pendingCount", { count: approvalSummary?.pendingCount ?? 0 })}
                </span>
                <span>
                  {t("businessHub.avgResponse", {
                    minutes: approvalSummary?.avgResponseMinutes ?? 0,
                  })}
                </span>
              </div>
              <Link to="/approvals">
                <Button className="w-full" variant="outline">
                  <Shield className="w-4 h-4 mr-2" /> {t("businessHub.viewApprovals")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t("businessHub.comparisonTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">
                      {t("businessHub.feature")}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                      {t("businessHub.legacy")}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-primary">
                      {t("businessHub.fiducia")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">{t("businessHub.payingBills")}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {t("businessHub.legacyBills")}
                    </td>
                    <td className="py-3 px-4">{t("businessHub.fiduciaBills")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">{t("businessHub.permissions")}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {t("businessHub.legacyPermissions")}
                    </td>
                    <td className="py-3 px-4">{t("businessHub.fiduciaPermissions")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">{t("businessHub.cashManagement")}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {t("businessHub.legacyCash")}
                    </td>
                    <td className="py-3 px-4">{t("businessHub.fiduciaCash")}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">{t("businessHub.onboarding")}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {t("businessHub.legacyOnboarding")}
                    </td>
                    <td className="py-3 px-4">{t("businessHub.fiduciaOnboarding")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
