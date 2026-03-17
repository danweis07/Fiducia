import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { gateway } from "@/lib/gateway";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type { TrendMetric, FunnelStep } from "@/types";

// ---------------------------------------------------------------------------
// Fallback mock data (used when gateway returns empty)
// ---------------------------------------------------------------------------

const fallbackAccountGrowth = [
  { date: "Jul", accounts: 14200 },
  { date: "Aug", accounts: 14800 },
  { date: "Sep", accounts: 15400 },
  { date: "Oct", accounts: 15900 },
  { date: "Nov", accounts: 16500 },
  { date: "Dec", accounts: 17000 },
  { date: "Jan", accounts: 17400 },
  { date: "Feb", accounts: 17900 },
  { date: "Mar", accounts: 18432 },
];

const fallbackTxVolume = [
  { type: "Debit", count: 62000, amount: 8400000 },
  { type: "Credit", count: 34000, amount: 12500000 },
  { type: "Transfer", count: 28000, amount: 9200000 },
  { type: "Bill Pay", count: 18000, amount: 4100000 },
  { type: "RDC", count: 8500, amount: 3200000 },
  { type: "P2P", count: 6280, amount: 1900000 },
];

const fallbackDepositTrends = [
  { date: "Jul", checking: 10200000, savings: 6800000, cd: 2100000 },
  { date: "Aug", checking: 10600000, savings: 7100000, cd: 2100000 },
  { date: "Sep", checking: 10900000, savings: 7400000, cd: 2200000 },
  { date: "Oct", checking: 11200000, savings: 7700000, cd: 2200000 },
  { date: "Nov", checking: 11600000, savings: 7900000, cd: 2250000 },
  { date: "Dec", checking: 11900000, savings: 8200000, cd: 2300000 },
  { date: "Jan", checking: 12100000, savings: 8400000, cd: 2300000 },
  { date: "Feb", checking: 12300000, savings: 8600000, cd: 2350000 },
  { date: "Mar", checking: 12480000, savings: 8720000, cd: 2350000 },
];

const fallbackFunnel: FunnelStep[] = [
  { step: "Visited Signup Page", count: 8400, percentage: 100 },
  { step: "Started Application", count: 3200, percentage: 38 },
  { step: "Completed KYC", count: 1800, percentage: 21 },
  { step: "Account Opened", count: 1200, percentage: 14 },
  { step: "First Deposit", count: 980, percentage: 12 },
];

const fallbackMetrics: TrendMetric[] = [
  { label: "Avg Deposit Size", value: 285000, previousValue: 272000, format: "currency" },
  { label: "Signup Conversion", value: 14.3, previousValue: 12.8, format: "percentage" },
  { label: "Monthly Active Users", value: 9450, previousValue: 9100, format: "number" },
  { label: "Avg Session Duration", value: 4.2, previousValue: 4.5, format: "number" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMetricValue(metric: TrendMetric): string {
  switch (metric.format) {
    case "currency":
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(metric.value / 100);
    case "percentage":
      return `${metric.value}%`;
    default:
      return new Intl.NumberFormat("en-US").format(metric.value);
  }
}

function trendPercentage(current: number, previous: number): { value: string; up: boolean } {
  const change = ((current - previous) / previous) * 100;
  return { value: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`, up: change >= 0 };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalyticsDashboard() {
  const { t } = useTranslation('admin');
  const [dateRange, setDateRange] = useState("9m");

  const { data: growthData, isLoading: growthLoading } = useQuery({
    queryKey: ["admin-analytics-growth", dateRange],
    queryFn: () => gateway.request("admin.analytics.accountGrowth", { range: dateRange }),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["admin-analytics-tx", dateRange],
    queryFn: () => gateway.request("admin.analytics.transactionVolume", { range: dateRange }),
  });

  const { data: depositData, isLoading: depositLoading } = useQuery({
    queryKey: ["admin-analytics-deposits", dateRange],
    queryFn: () => gateway.request("admin.analytics.depositTrends", { range: dateRange }),
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["admin-analytics-metrics", dateRange],
    queryFn: () => gateway.request("admin.analytics.keyMetrics", { range: dateRange }),
  });

  type GrowthPoint = { date: string; accounts: number };
  type TxVolPoint = { type: string; count: number; amount: number };
  type DepositPoint = { date: string; checking: number; savings: number; cd: number };

  const accountGrowth = (growthData as { data?: GrowthPoint[] })?.data ?? fallbackAccountGrowth;
  const txVolumeByType = (txData as { data?: TxVolPoint[] })?.data ?? fallbackTxVolume;
  const depositTrends = (depositData as { data?: DepositPoint[] })?.data ?? fallbackDepositTrends;
  const keyMetrics = (metricsData as { metrics?: TrendMetric[] })?.metrics ?? fallbackMetrics;
  const funnel = (metricsData as { funnel?: FunnelStep[] })?.funnel ?? fallbackFunnel;

  const isLoading = growthLoading && txLoading && depositLoading && metricsLoading;
  if (isLoading) return <PageSkeleton />;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('analytics.title')}</h1>
          <p className="text-sm text-slate-500">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36 gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">{t('analytics.dateRange.last30Days')}</SelectItem>
              <SelectItem value="3m">{t('analytics.dateRange.last3Months')}</SelectItem>
              <SelectItem value="6m">{t('analytics.dateRange.last6Months')}</SelectItem>
              <SelectItem value="9m">{t('analytics.dateRange.last9Months')}</SelectItem>
              <SelectItem value="1y">{t('analytics.dateRange.lastYear')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> {t('analytics.export')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric) => {
          const trend = trendPercentage(metric.value, metric.previousValue);
          return (
            <Card key={metric.label}>
              <CardContent className="py-4">
                <p className="text-sm text-slate-500">{metric.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatMetricValue(metric)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {trend.up ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                  )}
                  <span className={`text-xs font-medium ${trend.up ? "text-green-600" : "text-red-600"}`}>
                    {trend.value}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('analytics.accountGrowth')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={accountGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Area type="monotone" dataKey="accounts" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('analytics.transactionVolume')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={txVolumeByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('analytics.depositTrends')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={depositTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                    tickFormatter={(v: number) => `$${(v / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    formatter={(value: number) =>
                      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
                    }
                  />
                  <Line type="monotone" dataKey="checking" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="savings" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cd" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2 justify-center text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> {t('analytics.legend.checking')}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> {t('analytics.legend.savings')}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> {t('analytics.legend.cds')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('analytics.acquisitionFunnel')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 py-2">
              {funnel.map((step, i) => (
                <div key={step.step}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">{step.step}</span>
                    <span className="font-medium text-slate-900">{step.count.toLocaleString()} ({step.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${step.percentage}%`,
                        backgroundColor: `hsl(${220 + i * 15}, 70%, ${50 + i * 5}%)`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
