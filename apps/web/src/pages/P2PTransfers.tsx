import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Send,
  ArrowDownLeft,
  Clock,
  UserPlus,
  UserMinus,
  DollarSign,
  Mail,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/common/currency";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useAccounts } from "@/hooks/useAccounts";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { getStatusStyle } from "@/lib/common/design-tokens";
import {
  useP2PEnrollment,
  useEnrollP2P,
  useUnenrollP2P,
  useSendP2P,
  useRequestP2P,
  useP2PTransactions,
  useCancelP2PRequest,
  useP2PLimits,
} from "@/hooks/useP2P";
import type { P2PTransactionStatus } from "@/types";

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------
function p2pStatusStyle(status: P2PTransactionStatus) {
  const map: Record<P2PTransactionStatus, string> = {
    pending: "warning",
    completed: "success",
    failed: "error",
    cancelled: "neutral",
    expired: "neutral",
  };
  return getStatusStyle(map[status] ?? "neutral");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function P2PTransfers() {
  const { t } = useTranslation("banking");
  const [sendOpen, setSendOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [txFilter, setTxFilter] = useState<"sent" | "received" | "requests" | undefined>(undefined);

  // Form state
  const [recipientType, setRecipientType] = useState<"email" | "phone">("email");
  const [recipientValue, setRecipientValue] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [enrollType, setEnrollType] = useState<"email" | "phone">("email");
  const [enrollValue, setEnrollValue] = useState("");
  const [enrollAccountId, setEnrollAccountId] = useState("");

  const { data: enrollmentData, isLoading: enrollLoading } = useP2PEnrollment();
  const { data: txData, isLoading: txLoading } = useP2PTransactions(txFilter);
  const { data: limitsData } = useP2PLimits();
  const { data: accountsData } = useAccounts();
  const enrollP2P = useEnrollP2P();
  const unenrollP2P = useUnenrollP2P();
  const sendP2P = useSendP2P();
  const requestP2P = useRequestP2P();
  const cancelRequest = useCancelP2PRequest();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const enrollment = enrollmentData?.enrollment;
  const transactions = txData?.transactions ?? [];
  const limits = limitsData?.limits;
  const accounts = accountsData?.accounts ?? [];

  const resetForm = () => {
    setRecipientValue("");
    setAmount("");
    setMemo("");
  };

  const handleSend = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      toast({ title: t("p2pTransfers.invalidAmount"), variant: "destructive" });
      return;
    }
    if (!recipientValue) {
      toast({ title: t("p2pTransfers.recipientRequired"), variant: "destructive" });
      return;
    }
    try {
      await sendP2P.mutateAsync({
        recipientType,
        recipientValue,
        amountCents: cents,
        memo: memo || undefined,
      });
      toast({
        title: t("p2pTransfers.moneySent"),
        description: t("p2pTransfers.moneySentDesc", {
          amount: formatCurrency(cents),
          recipient: recipientValue,
        }),
      });
      resetForm();
      setSendOpen(false);
    } catch (e) {
      handleError(e);
    }
  };

  const handleRequest = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      toast({ title: t("p2pTransfers.invalidAmount"), variant: "destructive" });
      return;
    }
    if (!recipientValue) {
      toast({ title: t("p2pTransfers.recipientRequired"), variant: "destructive" });
      return;
    }
    try {
      await requestP2P.mutateAsync({
        recipientType,
        recipientValue,
        amountCents: cents,
        memo: memo || undefined,
      });
      toast({
        title: t("p2pTransfers.moneyRequested"),
        description: t("p2pTransfers.moneyRequestedDesc", {
          amount: formatCurrency(cents),
          recipient: recipientValue,
        }),
      });
      resetForm();
      setRequestOpen(false);
    } catch (e) {
      handleError(e);
    }
  };

  const handleEnroll = async () => {
    if (!enrollValue || !enrollAccountId) {
      toast({ title: t("p2pTransfers.allFieldsRequired"), variant: "destructive" });
      return;
    }
    try {
      await enrollP2P.mutateAsync({
        accountId: enrollAccountId,
        enrollmentType: enrollType,
        enrollmentValue: enrollValue,
      });
      toast({ title: t("p2pTransfers.enrolledForP2P") });
      setEnrollOpen(false);
    } catch (e) {
      handleError(e);
    }
  };

  const handleUnenroll = async () => {
    try {
      await unenrollP2P.mutateAsync();
      toast({ title: t("p2pTransfers.unenrolledFromP2P") });
    } catch (e) {
      handleError(e);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelRequest.mutateAsync(id);
      toast({ title: t("p2pTransfers.requestCancelled") });
    } catch (e) {
      handleError(e);
    }
  };

  if (enrollLoading)
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );

  return (
    <AppShell>
      <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("p2pTransfers.title")}</h1>
            <p className="text-muted-foreground">{t("p2pTransfers.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            {enrollment ? (
              <>
                <Dialog open={sendOpen} onOpenChange={setSendOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Send className="h-4 w-4 mr-2" />
                      {t("p2pTransfers.send")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("p2pTransfers.sendMoney")}</DialogTitle>
                      <DialogDescription>{t("p2pTransfers.sendMoneyDesc")}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t("p2pTransfers.recipientType")}</Label>
                        <Select
                          value={recipientType}
                          onValueChange={(v) => setRecipientType(v as "email" | "phone")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">{t("p2pTransfers.email")}</SelectItem>
                            <SelectItem value="phone">{t("p2pTransfers.phone")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {recipientType === "email"
                            ? t("p2pTransfers.emailAddress")
                            : t("p2pTransfers.phoneNumber")}
                        </Label>
                        <Input
                          value={recipientValue}
                          onChange={(e) => setRecipientValue(e.target.value)}
                          placeholder={
                            recipientType === "email" ? "name@example.com" : "+1234567890"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("p2pTransfers.amountDollar")}</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("p2pTransfers.memoOptional")}</Label>
                        <Textarea
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          placeholder={t("p2pTransfers.memoPlaceholder")}
                          maxLength={150}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSendOpen(false)}>
                        {t("p2pTransfers.cancel")}
                      </Button>
                      <Button onClick={handleSend} disabled={sendP2P.isPending}>
                        {sendP2P.isPending
                          ? t("p2pTransfers.sending")
                          : t("p2pTransfers.sendMoney")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <ArrowDownLeft className="h-4 w-4 mr-2" />
                      {t("p2pTransfers.request")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("p2pTransfers.requestMoney")}</DialogTitle>
                      <DialogDescription>{t("p2pTransfers.requestMoneyDesc")}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t("p2pTransfers.recipientType")}</Label>
                        <Select
                          value={recipientType}
                          onValueChange={(v) => setRecipientType(v as "email" | "phone")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">{t("p2pTransfers.email")}</SelectItem>
                            <SelectItem value="phone">{t("p2pTransfers.phone")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {recipientType === "email"
                            ? t("p2pTransfers.emailAddress")
                            : t("p2pTransfers.phoneNumber")}
                        </Label>
                        <Input
                          value={recipientValue}
                          onChange={(e) => setRecipientValue(e.target.value)}
                          placeholder={
                            recipientType === "email" ? "name@example.com" : "+1234567890"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("p2pTransfers.amountDollar")}</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("p2pTransfers.memoOptional")}</Label>
                        <Textarea
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          placeholder={t("p2pTransfers.memoPlaceholder")}
                          maxLength={150}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRequestOpen(false)}>
                        {t("p2pTransfers.cancel")}
                      </Button>
                      <Button onClick={handleRequest} disabled={requestP2P.isPending}>
                        {requestP2P.isPending
                          ? t("p2pTransfers.requesting")
                          : t("p2pTransfers.requestMoney")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("p2pTransfers.enrollInZelle")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("p2pTransfers.enrollInZelle")}</DialogTitle>
                    <DialogDescription>{t("p2pTransfers.enrollInZelleDesc")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("p2pTransfers.contactType")}</Label>
                      <Select
                        value={enrollType}
                        onValueChange={(v) => setEnrollType(v as "email" | "phone")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">{t("p2pTransfers.email")}</SelectItem>
                          <SelectItem value="phone">{t("p2pTransfers.phone")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {enrollType === "email"
                          ? t("p2pTransfers.emailAddress")
                          : t("p2pTransfers.phoneNumber")}
                      </Label>
                      <Input
                        value={enrollValue}
                        onChange={(e) => setEnrollValue(e.target.value)}
                        placeholder={enrollType === "email" ? "name@example.com" : "+1234567890"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("p2pTransfers.linkedAccount")}</Label>
                      <Select value={enrollAccountId} onValueChange={setEnrollAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("p2pTransfers.selectAccount")} />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter((a) => a.status === "active")
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.nickname ?? a.type} ({a.accountNumberMasked})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEnrollOpen(false)}>
                      {t("p2pTransfers.cancel")}
                    </Button>
                    <Button onClick={handleEnroll} disabled={enrollP2P.isPending}>
                      {enrollP2P.isPending ? t("p2pTransfers.enrolling") : t("p2pTransfers.enroll")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Enrollment & Limits */}
        <div className="grid gap-4 md:grid-cols-2">
          {enrollment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("p2pTransfers.enrollment")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {enrollment.enrollmentType === "email" ? (
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{enrollment.enrollmentValue}</span>
                  <Badge variant="outline" className="ml-auto">
                    {t("p2pTransfers.active")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("p2pTransfers.account")}: {enrollment.accountMasked}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={handleUnenroll}
                  disabled={unenrollP2P.isPending}
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  {unenrollP2P.isPending
                    ? t("p2pTransfers.unenrolling")
                    : t("p2pTransfers.unenroll")}
                </Button>
              </CardContent>
            </Card>
          )}
          {limits && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("p2pTransfers.sendLimits")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("p2pTransfers.perTransaction")}</span>
                  <span>{formatCurrency(limits.perTransactionLimitCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("p2pTransfers.today")}</span>
                  <span>
                    {formatCurrency(limits.usedTodayCents)} /{" "}
                    {formatCurrency(limits.dailySendLimitCents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("p2pTransfers.thisMonth")}</span>
                  <span>
                    {formatCurrency(limits.usedThisMonthCents)} /{" "}
                    {formatCurrency(limits.monthlySendLimitCents)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>{t("p2pTransfers.transactionHistory")}</CardTitle>
            <CardDescription>{t("p2pTransfers.transactionHistoryDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={txFilter ?? "all"}
              onValueChange={(v) =>
                setTxFilter(v === "all" ? undefined : (v as "sent" | "received" | "requests"))
              }
            >
              <TabsList className="mb-4">
                <TabsTrigger value="all">{t("p2pTransfers.all")}</TabsTrigger>
                <TabsTrigger value="sent">{t("p2pTransfers.sent")}</TabsTrigger>
                <TabsTrigger value="received">{t("p2pTransfers.received")}</TabsTrigger>
                <TabsTrigger value="requests">{t("p2pTransfers.requests")}</TabsTrigger>
              </TabsList>
              <TabsContent value={txFilter ?? "all"}>
                {txLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    {t("p2pTransfers.loading")}
                  </div>
                ) : transactions.length === 0 ? (
                  <EmptyState
                    icon={<DollarSign className="h-10 w-10" />}
                    title={t("p2pTransfers.noTransactions")}
                    description={t("p2pTransfers.noTransactionsDesc")}
                  />
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full ${tx.type === "send" ? "bg-red-100 text-red-600" : tx.type === "receive" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}
                          >
                            {tx.type === "send" ? (
                              <Send className="h-4 w-4" />
                            ) : tx.type === "receive" ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {tx.type === "send"
                                ? t("p2pTransfers.toRecipient", { recipient: tx.recipientValue })
                                : tx.type === "receive"
                                  ? t("p2pTransfers.fromSender", { sender: tx.senderName })
                                  : t("p2pTransfers.requestTo", { recipient: tx.recipientValue })}
                            </p>
                            {tx.memo && <p className="text-xs text-muted-foreground">{tx.memo}</p>}
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-sm ${tx.type === "receive" ? "text-green-600" : ""}`}
                          >
                            {tx.type === "receive" ? "+" : tx.type === "send" ? "-" : ""}
                            {formatCurrency(tx.amountCents)}
                          </span>
                          <Badge className={p2pStatusStyle(tx.status)}>{tx.status}</Badge>
                          {tx.type === "request" && tx.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(tx.id)}
                              disabled={cancelRequest.isPending}
                            >
                              {t("p2pTransfers.cancel")}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
