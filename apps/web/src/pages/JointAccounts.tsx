import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, Shield, Clock, Check, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAccounts } from "@/hooks/useAccounts";
import {
  useJointOwners,
  useAddJointOwner,
  useRemoveJointOwner,
  useUpdateJointOwnerPermissions,
  usePendingInvitations,
  useAcceptInvitation,
  useDeclineInvitation,
  useJointAccountSummary,
} from "@/hooks/useJointAccounts";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { JointOwnerPermission, JointOwnerRelationship } from "@/types";

const RELATIONSHIP_LABEL_KEYS: Record<JointOwnerRelationship, string> = {
  spouse: "jointAccounts.relationshipSpouse",
  child: "jointAccounts.relationshipChild",
  parent: "jointAccounts.relationshipParent",
  business_partner: "jointAccounts.relationshipBusinessPartner",
  other: "jointAccounts.relationshipOther",
};

const PERMISSION_LABEL_KEYS: Record<JointOwnerPermission, string> = {
  full: "jointAccounts.permissionFull",
  view_only: "jointAccounts.permissionViewOnly",
  limited: "jointAccounts.permissionLimited",
};

const PERMISSION_COLORS: Record<JointOwnerPermission, string> = {
  full: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  view_only: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  limited: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export default function JointAccounts() {
  const { t } = useTranslation("banking");

  const RELATIONSHIP_LABELS: Record<JointOwnerRelationship, string> = {
    spouse: t(RELATIONSHIP_LABEL_KEYS.spouse),
    child: t(RELATIONSHIP_LABEL_KEYS.child),
    parent: t(RELATIONSHIP_LABEL_KEYS.parent),
    business_partner: t(RELATIONSHIP_LABEL_KEYS.business_partner),
    other: t(RELATIONSHIP_LABEL_KEYS.other),
  };

  const PERMISSION_LABELS: Record<JointOwnerPermission, string> = {
    full: t(PERMISSION_LABEL_KEYS.full),
    view_only: t(PERMISSION_LABEL_KEYS.view_only),
    limited: t(PERMISSION_LABEL_KEYS.limited),
  };

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<{
    accountId: string;
    ownerId: string;
    name: string;
  } | null>(null);
  const [editPermissions, setEditPermissions] = useState<{
    accountId: string;
    ownerId: string;
    current: JointOwnerPermission;
  } | null>(null);

  // Form state for add owner dialog
  const [formEmail, setFormEmail] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formRelationship, setFormRelationship] = useState<JointOwnerRelationship>("spouse");
  const [formPermissions, setFormPermissions] = useState<JointOwnerPermission>("view_only");

  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: summaryData } = useJointAccountSummary();
  const { data: ownersData, isLoading: ownersLoading } = useJointOwners(selectedAccountId);
  const { data: invitationsData, isLoading: invitationsLoading } = usePendingInvitations();

  const addOwner = useAddJointOwner();
  const removeOwner = useRemoveJointOwner();
  const updatePermissions = useUpdateJointOwnerPermissions();
  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();

  const accounts = accountsData?.accounts ?? [];
  const owners = ownersData?.owners ?? [];
  const invitations = invitationsData?.invitations ?? [];
  const summary = summaryData?.summary;

  const resetForm = () => {
    setFormEmail("");
    setFormFirstName("");
    setFormLastName("");
    setFormRelationship("spouse");
    setFormPermissions("view_only");
  };

  const handleAddOwner = async () => {
    if (!selectedAccountId) return;
    try {
      await addOwner.mutateAsync({
        accountId: selectedAccountId,
        email: formEmail,
        firstName: formFirstName,
        lastName: formLastName,
        relationship: formRelationship,
        permissions: formPermissions,
      });
      toast({
        title: t("jointAccounts.invitationSent"),
        description: t("jointAccounts.invitationSentDesc", { email: formEmail }),
      });
      setAddDialogOpen(false);
      resetForm();
    } catch (err) {
      handleError(err, { fallbackTitle: t("jointAccounts.failedToSendInvitation") });
    }
  };

  const handleRemoveOwner = async () => {
    if (!removeConfirm) return;
    try {
      await removeOwner.mutateAsync({
        accountId: removeConfirm.accountId,
        ownerId: removeConfirm.ownerId,
      });
      toast({
        title: t("jointAccounts.ownerRemoved"),
        description: t("jointAccounts.ownerRemovedDesc", { name: removeConfirm.name }),
      });
      setRemoveConfirm(null);
    } catch (err) {
      handleError(err, { fallbackTitle: t("jointAccounts.failedToRemoveOwner") });
    }
  };

  const handleUpdatePermissions = async (permissions: JointOwnerPermission) => {
    if (!editPermissions) return;
    try {
      await updatePermissions.mutateAsync({
        accountId: editPermissions.accountId,
        ownerId: editPermissions.ownerId,
        permissions,
      });
      toast({
        title: t("jointAccounts.permissionsUpdated"),
        description: t("jointAccounts.permissionsUpdatedDesc", {
          level: t(PERMISSION_LABEL_KEYS[permissions]),
        }),
      });
      setEditPermissions(null);
    } catch (err) {
      handleError(err, { fallbackTitle: t("jointAccounts.failedToUpdatePermissions") });
    }
  };

  const handleAccept = async (invitationId: string) => {
    try {
      await acceptInvitation.mutateAsync(invitationId);
      toast({
        title: t("jointAccounts.invitationAccepted"),
        description: t("jointAccounts.invitationAcceptedDesc"),
      });
    } catch (err) {
      handleError(err, { fallbackTitle: t("jointAccounts.failedToAcceptInvitation") });
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      await declineInvitation.mutateAsync(invitationId);
      toast({ title: t("jointAccounts.invitationDeclined") });
    } catch (err) {
      handleError(err, { fallbackTitle: t("jointAccounts.failedToDeclineInvitation") });
    }
  };

  if (accountsLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("jointAccounts.title")}</h1>
        <p className="text-muted-foreground">{t("jointAccounts.subtitle")}</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{summary.primaryAccountCount}</p>
              <p className="text-sm text-muted-foreground">{t("jointAccounts.primaryAccounts")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{summary.jointAccountCount}</p>
              <p className="text-sm text-muted-foreground">{t("jointAccounts.jointAccounts")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{summary.totalAccountCount}</p>
              <p className="text-sm text-muted-foreground">{t("jointAccounts.totalAccounts")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{summary.pendingInvitationCount}</p>
              <p className="text-sm text-muted-foreground">
                {t("jointAccounts.pendingInvitations")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending invitations */}
      {!invitationsLoading && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("jointAccounts.pendingInvitations")}
            </CardTitle>
            <CardDescription>{t("jointAccounts.pendingInvitationsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {inv.direction === "received" ? inv.inviterName : inv.inviteeName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Account {inv.accountMasked} &middot;{" "}
                      {t(RELATIONSHIP_LABEL_KEYS[inv.relationship])} &middot;{" "}
                      {t(PERMISSION_LABEL_KEYS[inv.permissions])}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {inv.direction === "received"
                        ? t("jointAccounts.received")
                        : t("jointAccounts.sent")}
                    </Badge>
                  </div>
                  {inv.direction === "received" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(inv.id)}
                        disabled={acceptInvitation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {t("jointAccounts.accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecline(inv.id)}
                        disabled={declineInvitation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("jointAccounts.decline")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account selector + owners */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("jointAccounts.accountOwners")}
              </CardTitle>
              <CardDescription>{t("jointAccounts.accountOwnersDesc")}</CardDescription>
            </div>
            {selectedAccountId && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("jointAccounts.addOwner")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>{t("jointAccounts.account")}</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t("jointAccounts.selectAnAccount")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acct) => (
                  <SelectItem key={acct.id} value={acct.id}>
                    {acct.name} ({acct.accountNumberMasked})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAccountId && ownersLoading && (
            <p className="text-sm text-muted-foreground py-4">{t("jointAccounts.loadingOwners")}</p>
          )}

          {selectedAccountId && !ownersLoading && owners.length === 0 && (
            <EmptyState
              icon={Users}
              title={t("jointAccounts.noOwnersFound")}
              description={t("jointAccounts.noOwnersFoundDesc")}
            />
          )}

          {selectedAccountId && !ownersLoading && owners.length > 0 && (
            <div className="space-y-3">
              {owners.map((owner) => (
                <div
                  key={owner.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {owner.firstName} {owner.lastName}
                      </p>
                      {owner.isPrimary && (
                        <Badge variant="secondary" className="text-xs">
                          {t("jointAccounts.primary")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {owner.email} &middot; {t(RELATIONSHIP_LABEL_KEYS[owner.relationship])}
                    </p>
                    <Badge className={PERMISSION_COLORS[owner.permissions]}>
                      <Shield className="h-3 w-3 mr-1" />
                      {PERMISSION_LABELS[owner.permissions]}
                    </Badge>
                  </div>
                  {!owner.isPrimary && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditPermissions({
                            accountId: selectedAccountId,
                            ownerId: owner.id,
                            current: owner.permissions,
                          })
                        }
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        {t("jointAccounts.permissions")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setRemoveConfirm({
                            accountId: selectedAccountId,
                            ownerId: owner.id,
                            name: `${owner.firstName} ${owner.lastName}`,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Owner Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("jointAccounts.addJointOwner")}</DialogTitle>
            <DialogDescription>{t("jointAccounts.addJointOwnerDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">{t("jointAccounts.firstName")}</Label>
                <Input
                  id="firstName"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lastName">{t("jointAccounts.lastName")}</Label>
                <Input
                  id="lastName"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">{t("jointAccounts.emailAddress")}</Label>
              <Input
                id="email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("jointAccounts.relationship")}</Label>
              <Select
                value={formRelationship}
                onValueChange={(v) => setFormRelationship(v as JointOwnerRelationship)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(RELATIONSHIP_LABELS) as [JointOwnerRelationship, string][]).map(
                    ([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("jointAccounts.permissions")}</Label>
              <Select
                value={formPermissions}
                onValueChange={(v) => setFormPermissions(v as JointOwnerPermission)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PERMISSION_LABELS) as [JointOwnerPermission, string][]).map(
                    ([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                resetForm();
              }}
            >
              {t("jointAccounts.cancel")}
            </Button>
            <Button
              onClick={handleAddOwner}
              disabled={!formEmail || !formFirstName || !formLastName || addOwner.isPending}
            >
              {addOwner.isPending ? t("jointAccounts.sending") : t("jointAccounts.sendInvitation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog
        open={!!editPermissions}
        onOpenChange={(open) => {
          if (!open) setEditPermissions(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("jointAccounts.updatePermissions")}</DialogTitle>
            <DialogDescription>{t("jointAccounts.updatePermissionsDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(Object.entries(PERMISSION_LABELS) as [JointOwnerPermission, string][]).map(
              ([val, label]) => (
                <Button
                  key={val}
                  variant={editPermissions?.current === val ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleUpdatePermissions(val)}
                  disabled={updatePermissions.isPending}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {label}
                </Button>
              ),
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog
        open={!!removeConfirm}
        onOpenChange={(open) => {
          if (!open) setRemoveConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("jointAccounts.removeJointOwner")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("jointAccounts.removeJointOwnerDesc", { name: removeConfirm?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("jointAccounts.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveOwner}>
              {t("jointAccounts.removeOwnerAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
