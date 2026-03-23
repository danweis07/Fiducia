import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, Download } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminAuditAction } from "@/types";
import { useAdminAuditLog } from "@/hooks/useAdminAuditLog";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function actionCategory(action: AdminAuditAction): { label: string; color: string } {
  if (action.includes("approve") || action.includes("activate")) {
    return { label: "approve", color: "bg-green-100 text-green-800 border-green-200" };
  }
  if (action.includes("suspend") || action.includes("reject") || action.includes("freeze")) {
    return { label: "restrict", color: "bg-red-100 text-red-800 border-red-200" };
  }
  if (
    action.includes("update") ||
    action.includes("configure") ||
    action.includes("toggle") ||
    action.includes("reset")
  ) {
    return { label: "update", color: "bg-blue-100 text-blue-800 border-blue-200" };
  }
  return { label: "other", color: "bg-slate-100 text-slate-800 border-slate-200" };
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const allActions: AdminAuditAction[] = [
  "user.suspend",
  "user.activate",
  "user.reset_password",
  "account.freeze",
  "account.unfreeze",
  "settings.update",
  "branding.update",
  "integration.configure",
  "compliance.approve",
  "compliance.reject",
  "feature.toggle",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditLog() {
  const { t } = useTranslation("admin");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const { data: auditData, isLoading } = useAdminAuditLog({
    action: actionFilter !== "all" ? actionFilter : undefined,
    user: userFilter !== "all" ? userFilter : undefined,
    search: search || undefined,
  });

  const entries = useMemo(() => auditData?.entries ?? [], [auditData?.entries]);

  const users = useMemo(() => {
    const set = new Set(entries.map((e) => e.user));
    return Array.from(set);
  }, [entries]);

  const filtered = entries;

  const exportData = useCallback(
    (format: "csv" | "json") => {
      if (filtered.length === 0) return;
      let content: string;
      let mimeType: string;
      let filename: string;
      if (format === "csv") {
        const headers = ["Timestamp", "User", "Action", "Entity Type", "IP Address", "Details"];
        const rows = filtered.map((e) =>
          [e.timestamp, e.user, e.action, e.entityType, e.ipAddress, `"${e.details}"`].join(","),
        );
        content = [headers.join(","), ...rows].join("\n");
        mimeType = "text/csv";
        filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        content = JSON.stringify(filtered, null, 2);
        mimeType = "application/json";
        filename = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
      }
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [filtered],
  );

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("auditLog.title")}
          </h1>
          <p className="text-sm text-slate-500">{t("auditLog.subtitle")}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> {t("auditLog.export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportData("csv")}>
              {t("auditLog.exportCsv")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportData("json")}>
              {t("auditLog.exportJson")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("auditLog.activityLog")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t("auditLog.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("auditLog.filters.allActions")}</SelectItem>
                {allActions.map((a) => (
                  <SelectItem key={a} value={a} className="capitalize">
                    {a.replace(".", " / ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("auditLog.filters.allUsers")}</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("auditLog.table.timestamp")}</TableHead>
                  <TableHead>{t("auditLog.table.user")}</TableHead>
                  <TableHead>{t("auditLog.table.action")}</TableHead>
                  <TableHead>{t("auditLog.table.entity")}</TableHead>
                  <TableHead>{t("auditLog.table.ipAddress")}</TableHead>
                  <TableHead>{t("auditLog.table.details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => {
                  const cat = actionCategory(entry.action);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{entry.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${cat.color}`}>
                          {entry.action.replace(".", " / ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{entry.entityType}</TableCell>
                      <TableCell className="text-sm text-slate-500 font-mono">
                        {entry.ipAddress}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-[300px] truncate">
                        {entry.details}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      {t("auditLog.noEntriesFound")}
                    </TableCell>
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
