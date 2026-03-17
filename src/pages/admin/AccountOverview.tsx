import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, AlertTriangle, Snowflake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency } from "@/lib/common/currency";
import { useAdminAccountList, useAdminAccountAggregates } from "@/hooks/useAdminAccounts";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountOverview() {
  const { t } = useTranslation('admin');
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: accountsData, isLoading: accountsLoading } = useAdminAccountList({
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });
  const { data: aggregatesData, isLoading: aggregatesLoading } = useAdminAccountAggregates();

  const filtered = accountsData?.accounts ?? [];
  const aggregates = aggregatesData?.aggregates;
  const isLoading = accountsLoading || aggregatesLoading;

  const statCards = aggregates ? [
    { label: "Total Checking", value: formatCurrency(aggregates.totalCheckingCents), color: "text-blue-700 bg-blue-50" },
    { label: "Total Savings", value: formatCurrency(aggregates.totalSavingsCents), color: "text-green-700 bg-green-50" },
    { label: "Total CDs", value: formatCurrency(aggregates.totalCDCents), color: "text-purple-700 bg-purple-50" },
    { label: "Money Market", value: formatCurrency(aggregates.totalMoneyMarketCents), color: "text-amber-700 bg-amber-50" },
  ] : [];

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('accountOverview.title')}</h1>
        <p className="text-sm text-slate-500">{t('accountOverview.subtitle')}</p>
      </div>

      {/* Aggregate cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('accountOverview.allAccounts', { count: (aggregates?.totalAccounts ?? 0).toLocaleString() })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder={t('accountOverview.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('accountOverview.filters.allTypes')}</SelectItem>
                <SelectItem value="checking">{t('accountOverview.filters.checking')}</SelectItem>
                <SelectItem value="savings">{t('accountOverview.filters.savings')}</SelectItem>
                <SelectItem value="cd">{t('accountOverview.filters.cd')}</SelectItem>
                <SelectItem value="money_market">{t('accountOverview.filters.moneyMarket')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('accountOverview.filters.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('accountOverview.filters.active')}</SelectItem>
                <SelectItem value="frozen">{t('accountOverview.filters.frozen')}</SelectItem>
                <SelectItem value="closed">{t('accountOverview.filters.closed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accountOverview.table.customer')}</TableHead>
                  <TableHead>{t('accountOverview.table.account')}</TableHead>
                  <TableHead>{t('accountOverview.table.type')}</TableHead>
                  <TableHead className="text-right">{t('accountOverview.table.balance')}</TableHead>
                  <TableHead>{t('accountOverview.table.status')}</TableHead>
                  <TableHead>{t('accountOverview.table.opened')}</TableHead>
                  <TableHead className="w-24">{t('accountOverview.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((acct) => (
                  <TableRow key={acct.id}>
                    <TableCell className="font-medium">{acct.customerName}</TableCell>
                    <TableCell className="text-slate-500 font-mono text-sm">{acct.accountNumberMasked}</TableCell>
                    <TableCell className="capitalize">{acct.type.replace("_", " ")}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(acct.balanceCents)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={acct.status === "active" ? "default" : acct.status === "frozen" ? "destructive" : "secondary"}
                        className="capitalize text-xs"
                      >
                        {acct.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{acct.openedAt}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Flag">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Freeze">
                          <Snowflake className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">{t('accountOverview.noAccountsFound')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
