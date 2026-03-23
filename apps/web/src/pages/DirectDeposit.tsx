import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Search,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/common/currency";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import {
  useEmployers,
  useInitiateSwitch,
  useSwitches,
  useCancelSwitch,
} from "@/hooks/useDirectDeposit";
import { useAccounts } from "@/hooks/useAccounts";
import type { AllocationTypeValue, DirectDepositSwitchStatus } from "@/types";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const switchStatusConfig: Record<
  string,
  { labelKey: string; className: string; icon: React.ElementType }
> = {
  pending: {
    labelKey: "directDeposit.statusPending",
    className: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  awaiting_login: {
    labelKey: "directDeposit.statusAwaitingLogin",
    className: "bg-blue-100 text-blue-700",
    icon: Loader2,
  },
  processing: {
    labelKey: "directDeposit.statusProcessing",
    className: "bg-indigo-100 text-indigo-700",
    icon: Loader2,
  },
  completed: {
    labelKey: "directDeposit.statusCompleted",
    className: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  failed: {
    labelKey: "directDeposit.statusFailed",
    className: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  cancelled: {
    labelKey: "directDeposit.statusCancelled",
    className: "bg-gray-100 text-gray-500",
    icon: XCircle,
  },
};

const _allocationLabelKeys: Record<AllocationTypeValue, string> = {
  full: "directDeposit.fullPaycheck",
  partial: "directDeposit.percentageOfPaycheck",
  fixed_amount: "directDeposit.fixedDollarAmount",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DirectDeposit() {
  const { t } = useTranslation("banking");
  const [activeTab, setActiveTab] = useState("switch");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployerId, setSelectedEmployerId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [allocationType, setAllocationType] = useState<AllocationTypeValue>("full");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [allocationPercent, setAllocationPercent] = useState("");
  const { toast } = useToast();

  const { data: employersData, isLoading: employersLoading } = useEmployers({
    query: searchQuery || undefined,
    limit: 50,
  });
  const { data: switchesData, isLoading: switchesLoading } = useSwitches();
  const { data: accountsData } = useAccounts();
  const initiate = useInitiateSwitch();
  const cancelSwitch = useCancelSwitch();

  const employers = employersData?.employers ?? [];
  const switches = switchesData?.switches ?? [];
  const accounts = accountsData?.accounts ?? [];
  const depositAccounts = accounts.filter((a) => a.type === "checking" || a.type === "savings");
  const selectedEmployer = employers.find((e) => e.id === selectedEmployerId);

  function handleInitiate() {
    if (!selectedEmployerId || !selectedAccountId) {
      toast({
        title: t("directDeposit.missingSelection"),
        description: t("directDeposit.missingSelectionDesc"),
        variant: "destructive",
      });
      return;
    }

    const params: {
      accountId: string;
      employerId: string;
      allocationType: AllocationTypeValue;
      allocationAmountCents?: number;
      allocationPercentage?: number;
    } = {
      accountId: selectedAccountId,
      employerId: selectedEmployerId,
      allocationType,
    };

    if (allocationType === "fixed_amount") {
      const cents = Math.round(parseFloat(allocationAmount) * 100);
      if (!cents || cents <= 0) {
        toast({
          title: t("directDeposit.invalidAmount"),
          description: t("directDeposit.invalidAmountDesc"),
          variant: "destructive",
        });
        return;
      }
      params.allocationAmountCents = cents;
    }
    if (allocationType === "partial") {
      const pct = parseInt(allocationPercent, 10);
      if (!pct || pct <= 0 || pct > 100) {
        toast({
          title: t("directDeposit.invalidPercentage"),
          description: t("directDeposit.invalidPercentageDesc"),
          variant: "destructive",
        });
        return;
      }
      params.allocationPercentage = pct;
    }

    initiate.mutate(params, {
      onSuccess: (data) => {
        toast({
          title: t("directDeposit.switchInitiated"),
          description: t("directDeposit.switchInitiatedDesc"),
        });
        if (data.widgetUrl) {
          window.open(data.widgetUrl, "_blank", "noopener,noreferrer");
        }
        setActiveTab("history");
        setSelectedEmployerId("");
      },
      onError: () => {
        toast({
          title: t("directDeposit.switchFailed"),
          description: t("directDeposit.switchFailedDesc"),
          variant: "destructive",
        });
      },
    });
  }

  function handleCancel(switchId: string) {
    cancelSwitch.mutate(switchId, {
      onSuccess: () => toast({ title: t("directDeposit.switchCancelled") }),
      onError: () => toast({ title: t("directDeposit.cancelFailed"), variant: "destructive" }),
    });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="h-6 w-6" /> {t("directDeposit.title")}
          </h1>
          <p className="text-muted-foreground">{t("directDeposit.subtitle")}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="switch">{t("directDeposit.switchDirectDeposit")}</TabsTrigger>
            <TabsTrigger value="history">
              {t("directDeposit.switchHistory", { count: switches.length })}
            </TabsTrigger>
          </TabsList>

          {/* Switch Flow */}
          <TabsContent value="switch" className="space-y-6">
            {/* Step 1: Employer Search */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("directDeposit.findEmployer")}</CardTitle>
                <CardDescription>{t("directDeposit.findEmployerDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder={t("directDeposit.searchEmployers")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {employersLoading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {t("directDeposit.searching")}
                  </div>
                ) : employers.length === 0 && searchQuery ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {t("directDeposit.noEmployersFound", { query: searchQuery })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {employers.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                          selectedEmployerId === emp.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedEmployerId(emp.id)}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {emp.logoUrl ? (
                            <img
                              src={emp.logoUrl}
                              alt={emp.name}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.payrollProvider}</div>
                        </div>
                        {selectedEmployerId === emp.id && (
                          <CheckCircle className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Account & Allocation */}
            {selectedEmployer && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("directDeposit.configureDeposit")}</CardTitle>
                  <CardDescription>
                    {t("directDeposit.switchingFrom")}: <strong>{selectedEmployer.name}</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("directDeposit.depositAccount")}</Label>
                      <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("directDeposit.selectAccount")} />
                        </SelectTrigger>
                        <SelectContent>
                          {depositAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nickname ?? a.type} ({a.accountNumberMasked})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("directDeposit.allocationType")}</Label>
                      <Select
                        value={allocationType}
                        onValueChange={(v) => setAllocationType(v as AllocationTypeValue)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">{t("directDeposit.fullPaycheck")}</SelectItem>
                          <SelectItem value="partial">
                            {t("directDeposit.percentageOfPaycheck")}
                          </SelectItem>
                          <SelectItem value="fixed_amount">
                            {t("directDeposit.fixedDollarAmount")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {allocationType === "fixed_amount" && (
                      <div className="space-y-2">
                        <Label>{t("directDeposit.amountDollar")}</Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="500.00"
                          value={allocationAmount}
                          onChange={(e) => setAllocationAmount(e.target.value)}
                        />
                      </div>
                    )}

                    {allocationType === "partial" && (
                      <div className="space-y-2">
                        <Label>{t("directDeposit.percentage")}</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          placeholder="50"
                          value={allocationPercent}
                          onChange={(e) => setAllocationPercent(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full mt-2"
                    onClick={handleInitiate}
                    disabled={initiate.isPending || !selectedAccountId}
                  >
                    {initiate.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                        {t("directDeposit.initiating")}
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4 mr-2" /> Start Direct Deposit Switch
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Switch History */}
          <TabsContent value="history" className="space-y-4">
            {switchesLoading ? (
              <PageSkeleton />
            ) : switches.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No direct deposit switches yet. Search for your employer to get started.
                </CardContent>
              </Card>
            ) : (
              switches.map((sw) => {
                const cfg = switchStatusConfig[sw.status] ?? switchStatusConfig.pending;
                const StatusIcon = cfg.icon;
                const cancellable =
                  sw.status === ("pending" as DirectDepositSwitchStatus) ||
                  sw.status === ("awaiting_login" as DirectDepositSwitchStatus);
                return (
                  <Card key={sw.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" />
                            <span className="font-semibold">{sw.employerName}</span>
                            <Badge className={cfg.className}>{cfg.label}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Account {sw.accountMasked} &middot;{" "}
                            {allocationLabels[sw.allocationType] ?? sw.allocationType}
                            {sw.allocationAmountCents != null &&
                              ` (${formatCurrency(sw.allocationAmountCents)})`}
                            {sw.allocationPercentage != null && ` (${sw.allocationPercentage}%)`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Started {new Date(sw.createdAt).toLocaleDateString()}
                            {sw.completedAt &&
                              ` \u00B7 Completed ${new Date(sw.completedAt).toLocaleDateString()}`}
                            {sw.failureReason && ` \u00B7 ${sw.failureReason}`}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {cancellable && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(sw.id)}
                              disabled={cancelSwitch.isPending}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
