import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, MoreHorizontal, UserPlus, Loader2 } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatBankingDate } from "@/lib/common/date";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { useToast } from "@/hooks/use-toast";
import { gateway } from "@/lib/gateway";
import { useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserManagement() {
  const { t } = useTranslation("admin");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState<{
    userId: string;
    action: "suspend" | "activate" | "reset";
    userName: string;
  } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [actionLoading, setActionLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useAdminUsers({
    status: statusFilter !== "all" ? statusFilter : undefined,
    kycStatus: kycFilter !== "all" ? kycFilter : undefined,
    search: search || undefined,
  });

  const users = useMemo(() => usersData?.users ?? [], [usersData?.users]);
  const filtered = users;

  const counts = useMemo(
    () => ({
      active: users.filter((u) => u.status === "active").length,
      suspended: users.filter((u) => u.status === "suspended").length,
      closed: users.filter((u) => u.status === "closed").length,
    }),
    [users],
  );

  const handleAction = useCallback(async () => {
    if (!actionDialog) return;
    setActionLoading(true);
    try {
      if (actionDialog.action === "suspend") {
        await gateway.request("admin.users.suspend", { userId: actionDialog.userId });
        toast({
          title: t("userManagement.toasts.userSuspended"),
          description: t("userManagement.toasts.userSuspendedDesc", {
            name: actionDialog.userName,
          }),
        });
      } else if (actionDialog.action === "activate") {
        await gateway.request("admin.users.activate", { userId: actionDialog.userId });
        toast({
          title: t("userManagement.toasts.userActivated"),
          description: t("userManagement.toasts.userActivatedDesc", {
            name: actionDialog.userName,
          }),
        });
      } else if (actionDialog.action === "reset") {
        await gateway.request("admin.users.resetPassword", { userId: actionDialog.userId });
        toast({
          title: t("userManagement.toasts.passwordResetSent"),
          description: t("userManagement.toasts.passwordResetSentDesc", {
            name: actionDialog.userName,
          }),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {
      toast({
        title: t("userManagement.toasts.actionFailed"),
        description: t("userManagement.toasts.actionFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setActionDialog(null);
    }
  }, [actionDialog, queryClient, toast]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail) return;
    setActionLoading(true);
    try {
      await gateway.request("admin.users.invite", { email: inviteEmail, role: inviteRole });
      toast({
        title: t("userManagement.toasts.invitationSent"),
        description: t("userManagement.toasts.invitationSentDesc", { email: inviteEmail }),
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch {
      toast({
        title: t("userManagement.toasts.inviteFailed"),
        description: t("userManagement.toasts.inviteFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  }, [inviteEmail, inviteRole, toast]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("userManagement.title")}
          </h1>
          <p className="text-sm text-slate-500">{t("userManagement.subtitle")}</p>
        </div>
        <Button className="gap-1.5" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> {t("userManagement.inviteUser")}
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="default" className="text-sm px-3 py-1">
          {counts.active} {t("userManagement.statusActive")}
        </Badge>
        <Badge variant="destructive" className="text-sm px-3 py-1">
          {counts.suspended} {t("userManagement.statusSuspended")}
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {counts.closed} {t("userManagement.statusClosed")}
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("userManagement.customers")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t("userManagement.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("userManagement.filters.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("userManagement.filters.active")}</SelectItem>
                <SelectItem value="suspended">{t("userManagement.filters.suspended")}</SelectItem>
                <SelectItem value="closed">{t("userManagement.filters.closed")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t("userManagement.filters.kycStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("userManagement.filters.allKyc")}</SelectItem>
                <SelectItem value="approved">{t("userManagement.filters.approved")}</SelectItem>
                <SelectItem value="in_review">{t("userManagement.filters.inReview")}</SelectItem>
                <SelectItem value="pending">{t("userManagement.filters.pending")}</SelectItem>
                <SelectItem value="rejected">{t("userManagement.filters.rejected")}</SelectItem>
                <SelectItem value="expired">{t("userManagement.filters.expired")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("userManagement.table.name")}</TableHead>
                  <TableHead>{t("userManagement.table.email")}</TableHead>
                  <TableHead>{t("userManagement.table.kyc")}</TableHead>
                  <TableHead className="text-center">
                    {t("userManagement.table.accounts")}
                  </TableHead>
                  <TableHead>{t("userManagement.table.lastLogin")}</TableHead>
                  <TableHead>{t("userManagement.table.status")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell className="text-slate-500">{user.email}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={user.kycStatus}
                        label={user.kycStatus.replace("_", " ")}
                        className="text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-center">{user.accountCount}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {user.lastLogin ? formatBankingDate(user.lastLogin) : "Never"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} className="text-xs" />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            {t("userManagement.actions.viewDetails")}
                          </DropdownMenuItem>
                          {user.status === "active" ? (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                setActionDialog({
                                  userId: user.id,
                                  action: "suspend",
                                  userName: `${user.firstName} ${user.lastName}`,
                                })
                              }
                            >
                              {t("userManagement.actions.suspend")}
                            </DropdownMenuItem>
                          ) : user.status === "suspended" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setActionDialog({
                                  userId: user.id,
                                  action: "activate",
                                  userName: `${user.firstName} ${user.lastName}`,
                                })
                              }
                            >
                              {t("userManagement.actions.activate")}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onClick={() =>
                              setActionDialog({
                                userId: user.id,
                                action: "reset",
                                userName: `${user.firstName} ${user.lastName}`,
                              })
                            }
                          >
                            {t("userManagement.actions.resetPassword")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      {t("userManagement.noUsersFound")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!actionDialog}
        onOpenChange={(open) => {
          if (!open) setActionDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "suspend" && t("userManagement.dialog.suspendTitle")}
              {actionDialog?.action === "activate" && t("userManagement.dialog.activateTitle")}
              {actionDialog?.action === "reset" && t("userManagement.dialog.resetTitle")}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === "suspend" &&
                t("userManagement.dialog.suspendDescription", { name: actionDialog.userName })}
              {actionDialog?.action === "activate" &&
                t("userManagement.dialog.activateDescription", { name: actionDialog?.userName })}
              {actionDialog?.action === "reset" &&
                t("userManagement.dialog.resetDescription", { name: actionDialog?.userName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog(null)}
              disabled={actionLoading}
            >
              {t("userManagement.dialog.cancel")}
            </Button>
            <Button
              variant={actionDialog?.action === "suspend" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("userManagement.dialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("userManagement.inviteDialog.title")}</DialogTitle>
            <DialogDescription>{t("userManagement.inviteDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t("userManagement.inviteDialog.email")}</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">{t("userManagement.inviteDialog.role")}</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    {t("userManagement.inviteDialog.roleMember")}
                  </SelectItem>
                  <SelectItem value="admin">
                    {t("userManagement.inviteDialog.roleAdmin")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={actionLoading}>
              {t("userManagement.dialog.cancel")}
            </Button>
            <Button onClick={handleInvite} disabled={actionLoading || !inviteEmail}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("userManagement.inviteDialog.sendInvitation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
