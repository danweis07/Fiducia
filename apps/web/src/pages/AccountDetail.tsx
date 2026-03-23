import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Calendar,
  RefreshCw,
  AlertCircle,
  Info,
  Send,
  FileText,
  Search,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatInterestRate } from "@/lib/common/currency";
import { formatBankingDate } from "@/lib/common/date";
import { useAccount, useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useCDMaturity, useUpdateCDMaturityAction } from "@/hooks/useCDMaturity";
import { useCharges } from "@/hooks/useCharges";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { PageSkeleton, TransactionRowSkeleton } from "@/components/common/LoadingSkeleton";
import { Spinner } from "@/components/common/Spinner";
import { transactionColors } from "@/lib/common/design-tokens";
import type { MaturityAction } from "@/types";

type FilterType = "all" | "credits" | "debits";
type TabType = "transactions" | "details" | "fees";

const TRANSACTIONS_LIMIT = 20;

const maturityActionLabels: Record<MaturityAction, string> = {
  renew_same_term: "Renew at Same Term",
  renew_new_term: "Renew at New Term",
  transfer_to_savings: "Transfer to Savings",
  transfer_to_checking: "Transfer to Checking",
  notify_only: "Notify Me Only",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("banking");
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("transactions");
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const {
    data: accountData,
    isLoading: accountLoading,
    error: accountError,
  } = useAccount(id ?? "");

  const { data: transactionsData, isLoading: txLoading } = useTransactions({
    accountId: id,
    limit: TRANSACTIONS_LIMIT,
    offset,
  });

  const account = accountData?.account;
  const isCD = account?.type === "cd";

  // CD maturity info — only fetch for CD accounts
  const { data: cdData, isLoading: cdLoading } = useCDMaturity(isCD ? (id ?? "") : "");
  const updateMaturityAction = useUpdateCDMaturityAction();

  // Account fees
  const { data: chargesData, isLoading: chargesLoading } = useCharges({ accountId: id });

  // For CD transfer destination selection
  const { data: accountsData } = useAccounts();
  const otherAccounts = (accountsData?.accounts ?? []).filter((a) => a.id !== id);

  const transactions = transactionsData?.transactions ?? [];
  const cdMaturity = cdData?.maturity;
  const charges = chargesData?.charges ?? [];

  // Loading state
  if (accountLoading) {
    return <PageSkeleton />;
  }

  // Error or not found
  if (accountError || !account) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-muted-foreground">
          {accountError instanceof Error ? accountError.message : t("accounts.accountNotFound")}
        </p>
        <Button variant="ghost" className="mt-4" asChild>
          <Link to="/accounts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("accounts.backToAccounts")}
          </Link>
        </Button>
      </div>
    );
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "credits" && tx.amountCents < 0) return false;
    if (filter === "debits" && tx.amountCents >= 0) return false;
    if (searchQuery && !tx.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  const pagination = (transactionsData as Record<string, unknown> | undefined)?._pagination as
    | { hasMore?: boolean }
    | undefined;
  const hasMore = pagination?.hasMore ?? transactions.length >= TRANSACTIONS_LIMIT;

  const handleMaturityActionChange = async (action: string) => {
    if (!id) return;
    try {
      await updateMaturityAction.mutateAsync({
        accountId: id,
        maturityAction: action,
      });
      toast({ title: t("accounts.maturityPreferenceUpdated") });
    } catch (err) {
      handleError(err, { fallbackTitle: t("accounts.updateFailed") });
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: "transactions", label: t("transactions.title") },
    { key: "details", label: t("accounts.accountDetails") },
    { key: "fees", label: t("accounts.feesAndCharges") },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/accounts">{t("accounts.backToAccounts")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{account.nickname ?? t("accounts.accountDetails")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Account quick actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <Link to="/transfer">
            <Send className="h-4 w-4 mr-2" />
            {t("transfer.title")}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/statements">
            <FileText className="h-4 w-4 mr-2" />
            {t("statements.title")}
          </Link>
        </Button>
      </div>

      {/* Account header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="capitalize">
                {account.type.replace("_", " ")} &middot; {account.accountNumberMasked}
              </CardDescription>
              <CardTitle className="text-xl mt-1">
                {account.nickname ?? `${account.type} Account`}
              </CardTitle>
            </div>
            <Badge variant="secondary" className="capitalize">
              {account.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("accounts.currentBalance")}</p>
              <p className="text-xl font-bold">{formatCurrency(account.balanceCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("accounts.availableBalance")}</p>
              <p className="text-xl font-bold">{formatCurrency(account.availableBalanceCents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("accounts.apy")}</p>
              <p className="text-xl font-bold">{formatInterestRate(account.interestRateBps)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("accounts.routingNumber")}</p>
              <p className="text-xl font-bold">{account.routingNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CD Maturity Card — only for CD accounts */}
      {isCD && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              {t("accounts.cdMaturity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cdLoading ? (
              <div className="flex justify-center py-4" role="status" aria-label="Loading">
                <Spinner />
              </div>
            ) : cdMaturity ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("accounts.maturityDate")}</p>
                    <p className="font-semibold">
                      {cdMaturity.maturityDate ? formatBankingDate(cdMaturity.maturityDate) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("accounts.originalTerm")}</p>
                    <p className="font-semibold">
                      {cdMaturity.originalTermMonths
                        ? `${cdMaturity.originalTermMonths} months`
                        : "N/A"}
                    </p>
                  </div>
                  {cdMaturity.penaltyWithdrawnCents > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("accounts.earlyWithdrawalPenalty")}
                      </p>
                      <p className="font-semibold text-destructive">
                        {formatCurrency(cdMaturity.penaltyWithdrawnCents)}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    {t("accounts.atMaturity")}
                  </Label>
                  <Select
                    value={cdMaturity.maturityAction ?? "notify_only"}
                    onValueChange={handleMaturityActionChange}
                    disabled={updateMaturityAction.isPending}
                  >
                    <SelectTrigger className="w-full md:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(maturityActionLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* If transfer action is selected, show account picker */}
                  {(cdMaturity.maturityAction === "transfer_to_savings" ||
                    cdMaturity.maturityAction === "transfer_to_checking") && (
                    <div className="mt-2 space-y-2">
                      <Label>{t("accounts.transferTo")}</Label>
                      <Select
                        value={cdMaturity.maturityTransferAccountId ?? ""}
                        onValueChange={(acctId) => {
                          if (!id) return;
                          updateMaturityAction.mutate({
                            accountId: id,
                            maturityAction: cdMaturity.maturityAction!,
                            maturityTransferAccountId: acctId,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full md:w-72">
                          <SelectValue placeholder={t("accounts.selectAccount")} />
                        </SelectTrigger>
                        <SelectContent>
                          {otherAccounts
                            .filter((a) =>
                              cdMaturity.maturityAction === "transfer_to_savings"
                                ? a.type === "savings"
                                : a.type === "checking",
                            )
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.nickname ?? a.type} ({a.accountNumberMasked})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {cdMaturity.maturityDate && (
                  <div className="flex items-start gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>
                      {t("accounts.earlyWithdrawalWarning", {
                        date: formatBankingDate(cdMaturity.maturityDate),
                      })}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t("accounts.maturityInfoNotAvailable")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions tab */}
      {activeTab === "transactions" && (
        <div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("transactions.title")}</h2>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {(["all", "credits", "debits"] as FilterType[]).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="capitalize"
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("accounts.searchTransactions")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {txLoading ? (
                <div className="divide-y">
                  <TransactionRowSkeleton />
                  <TransactionRowSkeleton />
                  <TransactionRowSkeleton />
                  <TransactionRowSkeleton />
                  <TransactionRowSkeleton />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">
                  {t("accounts.noTransactionsFilter")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left px-6 py-3 font-medium">
                          {t("transactions.date")}
                        </th>
                        <th className="text-left px-6 py-3 font-medium">
                          {t("accounts.description")}
                        </th>
                        <th className="text-left px-6 py-3 font-medium">
                          {t("accounts.category")}
                        </th>
                        <th className="text-right px-6 py-3 font-medium">{t("accounts.amount")}</th>
                        <th className="text-right px-6 py-3 font-medium">
                          {t("accounts.balance")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/50">
                          <td className="px-6 py-3 whitespace-nowrap">
                            {(tx.postedAt ?? tx.createdAt)
                              ? formatBankingDate(tx.postedAt ?? tx.createdAt)
                              : "Pending"}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              {tx.amountCents >= 0 ? (
                                <ArrowDownLeft
                                  className={`h-4 w-4 shrink-0 ${transactionColors.credit.text}`}
                                />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 shrink-0 text-destructive" />
                              )}
                              <span>{tx.description}</span>
                              {tx.status === "pending" && (
                                <Badge variant="outline" className="text-[10px] py-0">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 capitalize text-muted-foreground">
                            {tx.category}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-medium ${
                              tx.amountCents >= 0 ? transactionColors.credit.text : ""
                            }`}
                          >
                            {tx.amountCents >= 0 ? "+" : ""}
                            {formatCurrency(Math.abs(tx.amountCents))}
                          </td>
                          <td className="px-6 py-3 text-right text-muted-foreground">
                            {formatCurrency(tx.runningBalanceCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {!txLoading && hasMore && filteredTransactions.length > 0 && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => setOffset((prev) => prev + TRANSACTIONS_LIMIT)}
              >
                {t("accounts.loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Account Details tab */}
      {activeTab === "details" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              {t("accounts.accountInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t("accounts.accountType")}</span>
                  <span className="font-medium capitalize">{account.type.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t("accounts.accountNumber")}</span>
                  <span className="font-medium">{account.accountNumberMasked}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t("accounts.routingNumber")}</span>
                  <span className="font-medium">{account.routingNumber}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t("accounts.status")}</span>
                  <span className="font-medium capitalize">{account.status}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t("accounts.interestRateApy")}</span>
                  <span className="font-medium">{formatInterestRate(account.interestRateBps)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t("accounts.opened")}</span>
                  <span className="font-medium">
                    {account.openedAt ? formatBankingDate(account.openedAt) : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fees & Charges tab */}
      {activeTab === "fees" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("accounts.feesAndCharges")}</CardTitle>
            <CardDescription>{t("accounts.feesApplied")}</CardDescription>
          </CardHeader>
          <CardContent>
            {chargesLoading ? (
              <div className="flex justify-center py-4" role="status" aria-label="Loading">
                <Spinner />
              </div>
            ) : charges.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                {t("accounts.noFees")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left px-4 py-2 font-medium">{t("transactions.date")}</th>
                      <th className="text-left px-4 py-2 font-medium">{t("accounts.status")}</th>
                      <th className="text-right px-4 py-2 font-medium">{t("accounts.amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {charges.map((charge) => (
                      <tr key={charge.id} className="hover:bg-muted/50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          {(charge.appliedAt ?? charge.createdAt)
                            ? formatBankingDate(charge.appliedAt ?? charge.createdAt)
                            : "Pending"}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            variant={
                              charge.status === "waived"
                                ? "secondary"
                                : charge.status === "reversed"
                                  ? "outline"
                                  : "default"
                            }
                            className="capitalize"
                          >
                            {charge.status}
                          </Badge>
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${
                            charge.status === "waived" ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {formatCurrency(charge.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
