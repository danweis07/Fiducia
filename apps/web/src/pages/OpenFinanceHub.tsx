import { useState } from "react";
import {
  Building2,
  RefreshCw,
  Trash2,
  Plus,
  TrendingUp,
  Wallet,
  PiggyBank,
  CreditCard,
  Globe,
  LinkIcon,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { formatCurrency } from "@/lib/common/currency";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useOpenFinanceConnections,
  useCreateOpenFinanceConnection,
  useRefreshOpenFinanceConnection,
  useRemoveOpenFinanceConnection,
  useOpenFinanceAccounts,
  useOpenFinanceNetWorth,
  useAlternativeCreditData,
} from "@/hooks/useOpenFinance";
import type {
  OpenFinanceConnection,
  OpenFinanceAggregatedAccount,
  OpenFinanceNetWorth,
  AlternativeCreditData,
} from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function connectionStatusBadge(status: OpenFinanceConnection["status"]) {
  const map: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    active: { variant: "default", label: "Active" },
    inactive: { variant: "secondary", label: "Inactive" },
    reconnect_required: { variant: "outline", label: "Reconnect Required" },
    error: { variant: "destructive", label: "Error" },
  };
  const entry = map[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function OpenFinanceHub() {
  const [addOpen, setAddOpen] = useState(false);
  const [removeConnectionId, setRemoveConnectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryCode, setCountryCode] = useState("");

  // Hooks
  const { data: connectionsData, isLoading: connectionsLoading } = useOpenFinanceConnections();
  const { data: accountsData } = useOpenFinanceAccounts();
  const { data: netWorthData } = useOpenFinanceNetWorth();
  const { data: creditData } = useAlternativeCreditData();

  const createConnection = useCreateOpenFinanceConnection();
  const refreshConnection = useRefreshOpenFinanceConnection();
  const removeConnection = useRemoveOpenFinanceConnection();

  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const connections = connectionsData?.connections ?? [];
  const aggregatedAccounts = accountsData?.accounts ?? [];
  const netWorth = netWorthData?.netWorth as OpenFinanceNetWorth | undefined;
  const altCredit = creditData?.creditData as AlternativeCreditData | undefined;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleAddConnection = async () => {
    if (!searchQuery) {
      toast({ title: "Institution name required", variant: "destructive" });
      return;
    }
    try {
      await createConnection.mutateAsync({
        institutionId: searchQuery,
        countryCode: countryCode || "US",
      });
      toast({
        title: "Connection initiated",
        description: "Follow the prompts to link your account",
      });
      setSearchQuery("");
      setCountryCode("");
      setAddOpen(false);
    } catch (e) {
      handleError(e);
    }
  };

  const handleRefresh = async (connectionId: string) => {
    try {
      await refreshConnection.mutateAsync(connectionId);
      toast({ title: "Connection refreshed" });
    } catch (e) {
      handleError(e);
    }
  };

  const handleRemove = async () => {
    if (!removeConnectionId) return;
    try {
      await removeConnection.mutateAsync(removeConnectionId);
      toast({ title: "Connection removed" });
    } catch (e) {
      handleError(e);
    } finally {
      setRemoveConnectionId(null);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (connectionsLoading) return <PageSkeleton />;

  // Group accounts by institution
  const accountsByInstitution = aggregatedAccounts.reduce<
    Record<string, OpenFinanceAggregatedAccount[]>
  >((acc, account) => {
    const key = account.institutionName ?? "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(account);
    return acc;
  }, {});

  if (connections.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Open Finance Hub</h1>
          <p className="text-muted-foreground">See all your bank accounts in one place</p>
        </div>
        <EmptyState
          icon={LinkIcon}
          title="No connected accounts"
          description="Connect your first bank account to see all your finances in one place"
        />
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Connect Bank Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Bank Account</DialogTitle>
              <DialogDescription>Search for your bank or financial institution</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Institution Name</Label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for your bank..."
                />
              </div>
              <div className="space-y-2">
                <Label>Country Code (optional)</Label>
                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. US, GB, BR"
                  maxLength={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddConnection} disabled={createConnection.isPending}>
                {createConnection.isPending ? "Connecting..." : "Connect"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Open Finance Hub</h1>
          <p className="text-muted-foreground">See all your bank accounts in one place</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Connection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Bank Account</DialogTitle>
              <DialogDescription>Search for your bank or financial institution</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Institution Name</Label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for your bank..."
                />
              </div>
              <div className="space-y-2">
                <Label>Country Code (optional)</Label>
                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. US, GB, BR"
                  maxLength={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddConnection} disabled={createConnection.isPending}>
                {createConnection.isPending ? "Connecting..." : "Connect"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Net Worth Summary */}
      {netWorth && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-bold">{formatCurrency(netWorth.netWorthCents)}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Assets</span>
                <p className="font-semibold text-green-600">
                  {formatCurrency(netWorth.totalAssetsCents)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Liabilities</span>
                <p className="font-semibold text-red-600">
                  {formatCurrency(netWorth.totalLiabilitiesCents)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{netWorth.connectionCount} connections</span>
              <span>{netWorth.accountCount} accounts</span>
              {netWorth.lastUpdatedAt && (
                <span>Updated {new Date(netWorth.lastUpdatedAt).toLocaleString()}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Institutions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Connected Institutions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {connections.map((conn: OpenFinanceConnection) => (
            <Card key={conn.connectionId}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
                      {conn.institutionName?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="font-medium">{conn.institutionName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {connectionStatusBadge(conn.status)}
                        {conn.countryCode && (
                          <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            {conn.countryCode}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accounts</span>
                    <span>{conn.accountCount}</span>
                  </div>
                  {conn.totalBalanceCents != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Balance</span>
                      <span className="font-medium">{formatCurrency(conn.totalBalanceCents)}</span>
                    </div>
                  )}
                  {conn.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last synced: {new Date(conn.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRefresh(conn.connectionId)}
                    disabled={refreshConnection.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setRemoveConnectionId(conn.connectionId)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* All Accounts View */}
      {aggregatedAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Accounts</CardTitle>
            <CardDescription>Aggregated view across all connected institutions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(accountsByInstitution).map(([institution, instAccounts]) => (
                <div key={institution}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {institution}
                  </h3>
                  <div className="space-y-2">
                    {instAccounts.map((account: OpenFinanceAggregatedAccount) => (
                      <div
                        key={account.accountId}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-muted">
                            {account.type === "savings" ? (
                              <PiggyBank className="h-4 w-4" />
                            ) : account.type === "credit" ? (
                              <CreditCard className="h-4 w-4" />
                            ) : (
                              <Wallet className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{account.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="capitalize">{account.type}</span>
                              {account.mask && <span>{account.mask}</span>}
                              {account.currencyCode && (
                                <Badge variant="outline" className="text-xs">
                                  {account.currencyCode}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            {formatCurrency(account.balanceCents)}
                          </p>
                          {account.availableBalanceCents != null && (
                            <p className="text-xs text-muted-foreground">
                              Available: {formatCurrency(account.availableBalanceCents)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternative Credit Scoring */}
      {altCredit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Alternative Credit Scoring
            </CardTitle>
            <CardDescription>
              Link your primary bank account to verify income instantly, no PDF statements needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Verify Income</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Monthly Income</span>
                    <span className="font-semibold">
                      {formatCurrency(altCredit.estimatedMonthlyIncomeCents)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Confidence Score</span>
                      <span className="font-semibold">{altCredit.incomeConfidenceScore}%</span>
                    </div>
                    <Progress value={altCredit.incomeConfidenceScore} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Months Analyzed</span>
                    <span>{altCredit.monthsAnalyzed}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accounts Analyzed</span>
                    <span>{altCredit.accountsAnalyzed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Monthly Balance</span>
                    <span className="font-semibold">
                      {formatCurrency(altCredit.avgMonthlyBalanceCents)}
                    </span>
                  </div>
                  {altCredit.meetsMinimumRequirements && (
                    <Badge variant="default" className="mt-2">
                      <DollarSign className="h-3 w-3 mr-1" />
                      Meets Requirements
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remove Connection Confirmation */}
      <AlertDialog
        open={!!removeConnectionId}
        onOpenChange={(open) => {
          if (!open) setRemoveConnectionId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this bank connection? All synced account data will be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
