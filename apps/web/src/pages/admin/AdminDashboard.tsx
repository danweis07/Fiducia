import { useTranslation } from "react-i18next";
import {
  Users,
  Wallet,
  CreditCard,
  ArrowRightLeft,
  UserPlus,
  ShieldCheck,
  Headphones,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AdminDashboardMetrics, ActivityFeedItem } from "@/types";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const metrics: AdminDashboardMetrics = {
  totalCustomers: 12847,
  totalDepositsCents: 24_350_000_00,
  activeAccounts: 18432,
  monthlyTransactions: 156_780,
  newSignups30d: 342,
  pendingKycReviews: 23,
  openSupportTickets: 17,
};

const chartData = [
  { date: "Oct", deposits: 18200000, accounts: 15800 },
  { date: "Nov", deposits: 19500000, accounts: 16200 },
  { date: "Dec", deposits: 20800000, accounts: 16800 },
  { date: "Jan", deposits: 21400000, accounts: 17300 },
  { date: "Feb", deposits: 23100000, accounts: 17900 },
  { date: "Mar", deposits: 24350000, accounts: 18432 },
];

const recentActivity: ActivityFeedItem[] = [
  {
    id: "1",
    action: "user.signup",
    user: "Maria Chen",
    timestamp: "2026-03-10T09:45:00Z",
    detail: "New customer registration completed",
  },
  {
    id: "2",
    action: "kyc.approved",
    user: "James Wilson",
    timestamp: "2026-03-10T09:30:00Z",
    detail: "KYC verification approved by admin",
  },
  {
    id: "3",
    action: "transfer.flagged",
    user: "Robert Kim",
    timestamp: "2026-03-10T09:15:00Z",
    detail: "Wire transfer $15,000 flagged for review",
  },
  {
    id: "4",
    action: "account.opened",
    user: "Susan Park",
    timestamp: "2026-03-10T08:50:00Z",
    detail: "New savings account opened",
  },
  {
    id: "5",
    action: "settings.updated",
    user: "Admin: Jane Doe",
    timestamp: "2026-03-10T08:30:00Z",
    detail: "Bill Pay feature enabled",
  },
  {
    id: "6",
    action: "user.suspended",
    user: "Thomas Brown",
    timestamp: "2026-03-09T17:20:00Z",
    detail: "Account suspended - failed verification",
  },
  {
    id: "7",
    action: "integration.sync",
    user: "System",
    timestamp: "2026-03-09T16:00:00Z",
    detail: "Core banking sync completed successfully",
  },
  {
    id: "8",
    action: "kyc.submitted",
    user: "Lisa Wang",
    timestamp: "2026-03-09T15:45:00Z",
    detail: "ID verification documents submitted",
  },
  {
    id: "9",
    action: "transfer.completed",
    user: "David Lee",
    timestamp: "2026-03-09T14:30:00Z",
    detail: "External transfer $5,200 completed",
  },
  {
    id: "10",
    action: "card.locked",
    user: "Anna Martinez",
    timestamp: "2026-03-09T13:15:00Z",
    detail: "Debit card locked by customer request",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatCompactCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(dollars);
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function actionColor(action: string): string {
  if (action.includes("flagged") || action.includes("suspended")) return "text-red-600";
  if (action.includes("approved") || action.includes("completed")) return "text-green-600";
  if (action.includes("signup") || action.includes("opened")) return "text-blue-600";
  return "text-slate-600";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const kpiCards = [
  {
    label: "Total Customers",
    value: formatNumber(metrics.totalCustomers),
    icon: Users,
    trend: "+4.2%",
    up: true,
  },
  {
    label: "Total Deposits",
    value: formatCompactCurrency(metrics.totalDepositsCents),
    icon: Wallet,
    trend: "+8.1%",
    up: true,
  },
  {
    label: "Active Accounts",
    value: formatNumber(metrics.activeAccounts),
    icon: CreditCard,
    trend: "+3.5%",
    up: true,
  },
  {
    label: "Monthly Transactions",
    value: formatNumber(metrics.monthlyTransactions),
    icon: ArrowRightLeft,
    trend: "-1.2%",
    up: false,
  },
];

const quickStats = [
  {
    label: "New Signups (30d)",
    value: metrics.newSignups30d,
    icon: UserPlus,
    color: "text-blue-600 bg-blue-50",
  },
  {
    label: "Pending KYC Reviews",
    value: metrics.pendingKycReviews,
    icon: ShieldCheck,
    color: "text-amber-600 bg-amber-50",
  },
  {
    label: "Open Support Tickets",
    value: metrics.openSupportTickets,
    icon: Headphones,
    color: "text-purple-600 bg-purple-50",
  },
];

export default function AdminDashboard() {
  const { t } = useTranslation("admin");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("dashboard.title")}</h1>
        <p className="text-sm text-slate-500">{t("dashboard.subtitle")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {kpi.up ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                )}
                <span
                  className={`text-xs font-medium ${kpi.up ? "text-green-600" : "text-red-600"}`}
                >
                  {kpi.trend}
                </span>
                <span className="text-xs text-slate-400">{t("dashboard.vsLastMonth")}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className={`rounded-lg p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Deposit trend chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.depositGrowth")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                    tickFormatter={(v: number) => `$${(v / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    formatter={(value: number) =>
                      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                        value,
                      )
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="deposits"
                    stroke="#3b82f6"
                    fill="#dbeafe"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y max-h-72 overflow-y-auto">
              {recentActivity.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.user}</p>
                      <p className="text-xs text-slate-500 truncate">{item.detail}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${actionColor(item.action)}`}
                    >
                      {timeAgo(item.timestamp)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
