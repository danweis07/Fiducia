import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Phone,
  Mail,
  Hash,
  Search,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Globe,
  Smartphone,
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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/AppShell";
import { formatCurrencyIntl } from "@/lib/common/currency";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useAliasDirectories,
  useResolveAlias,
  usePayByAlias,
  useInboundR2P,
  useRespondToR2P,
  useOutboundR2P,
  useSendR2P,
} from "@/hooks/useAliasPayments";
import type { RequestToPayInbound, RequestToPayOutbound } from "@/types";

const aliasTypeIcons: Record<string, React.ElementType> = {
  phone: Phone,
  email: Mail,
  tax_id: Hash,
  upi_vpa: Smartphone,
  pix_key: Hash,
  proxy_id: Globe,
};

const r2pStatusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  pending: { variant: "outline", label: "Pending" },
  approved: { variant: "default", label: "Approved" },
  declined: { variant: "destructive", label: "Declined" },
  expired: { variant: "secondary", label: "Expired" },
  cancelled: { variant: "secondary", label: "Cancelled" },
};

export default function AliasPayments() {
  const { t } = useTranslation("banking");
  const [activeTab, setActiveTab] = useState("pay");
  const [aliasType, setAliasType] = useState("phone");
  const [aliasValue, setAliasValue] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [description, setDescription] = useState("");
  const [showPayDialog, setShowPayDialog] = useState(false);

  const { toast } = useToast();
  const { data: directoriesData, isLoading: dirLoading } = useAliasDirectories();
  const { data: inboundData, isLoading: inboundLoading } = useInboundR2P();
  const { data: outboundData, isLoading: outboundLoading } = useOutboundR2P();
  const resolveAlias = useResolveAlias();
  const payByAlias = usePayByAlias();
  const respondToR2P = useRespondToR2P();
  useSendR2P();

  if (dirLoading && inboundLoading)
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );

  const directories = directoriesData?.directories ?? [];
  const inboundRequests = inboundData?.requests ?? [];
  const outboundRequests = outboundData?.requests ?? [];
  const pendingInbound = inboundRequests.filter((r: RequestToPayInbound) => r.status === "pending");

  function handleResolve() {
    if (!aliasValue.trim()) return;
    resolveAlias.mutate(
      { aliasType, aliasValue: aliasValue.trim() },
      {
        onSuccess: (data) => {
          toast({
            title: t("aliasPayments.aliasResolved"),
            description: `${t("aliasPayments.found")}: ${data.resolution.resolvedName} at ${data.resolution.resolvedInstitution}`,
          });
          setShowPayDialog(true);
        },
        onError: () =>
          toast({
            title: t("aliasPayments.resolutionFailed"),
            description: t("aliasPayments.resolutionFailedDesc"),
            variant: "destructive",
          }),
      },
    );
  }

  function handlePay() {
    if (!resolveAlias.data) return;
    payByAlias.mutate(
      {
        sourceAccountId: "default",
        aliasType,
        aliasValue: aliasValue.trim(),
        amountCents: Math.round(parseFloat(amount) * 100),
        currency,
        description,
        idempotencyKey: `alias-pay-${Date.now()}`,
      },
      {
        onSuccess: (data) => {
          toast({
            title: t("aliasPayments.paymentSent"),
            description: `${formatCurrencyIntl(Math.round(parseFloat(amount) * 100), currency)} ${t("aliasPayments.sentTo")} ${data.resolvedName}`,
          });
          setShowPayDialog(false);
          setAliasValue("");
          setAmount("");
          setDescription("");
        },
        onError: () => toast({ title: t("aliasPayments.paymentFailed"), variant: "destructive" }),
      },
    );
  }

  function handleR2PRespond(requestId: string, action: "approve" | "decline") {
    respondToR2P.mutate(
      { requestId, action },
      {
        onSuccess: () =>
          toast({
            title:
              action === "approve"
                ? t("aliasPayments.paymentApproved")
                : t("aliasPayments.requestDeclined"),
          }),
        onError: () => toast({ title: t("aliasPayments.actionFailed"), variant: "destructive" }),
      },
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Smartphone className="h-6 w-6" />
              {t("aliasPayments.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("aliasPayments.subtitle")}</p>
          </div>
          {pendingInbound.length > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {t("aliasPayments.pendingRequests", { count: pendingInbound.length })}
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pay">{t("aliasPayments.payByAlias")}</TabsTrigger>
            <TabsTrigger value="inbound">
              {t("aliasPayments.requestsToPay")}
              {pendingInbound.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {pendingInbound.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outbound">{t("aliasPayments.sentRequests")}</TabsTrigger>
            <TabsTrigger value="directories">{t("aliasPayments.directories")}</TabsTrigger>
          </TabsList>

          {/* Pay by Alias Tab */}
          <TabsContent value="pay">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  {t("aliasPayments.findAndPay")}
                </CardTitle>
                <CardDescription>{t("aliasPayments.findAndPayDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t("aliasPayments.aliasType")}</Label>
                    <Select value={aliasType} onValueChange={setAliasType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">{t("aliasPayments.phoneNumber")}</SelectItem>
                        <SelectItem value="email">{t("aliasPayments.emailAddress")}</SelectItem>
                        <SelectItem value="upi_vpa">{t("aliasPayments.upiId")}</SelectItem>
                        <SelectItem value="pix_key">{t("aliasPayments.pixKey")}</SelectItem>
                        <SelectItem value="tax_id">{t("aliasPayments.taxId")}</SelectItem>
                        <SelectItem value="proxy_id">{t("aliasPayments.proxyId")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>{t("aliasPayments.aliasValue")}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={aliasValue}
                        onChange={(e) => setAliasValue(e.target.value)}
                        placeholder={
                          aliasType === "phone"
                            ? "+44 7700 900123"
                            : aliasType === "email"
                              ? "jane@example.com"
                              : aliasType === "upi_vpa"
                                ? "user@bankname"
                                : aliasType === "pix_key"
                                  ? t("aliasPayments.pixKeyPlaceholder")
                                  : t("aliasPayments.enterAlias")
                        }
                      />
                      <Button
                        onClick={handleResolve}
                        disabled={!aliasValue.trim() || resolveAlias.isPending}
                      >
                        {resolveAlias.isPending
                          ? t("aliasPayments.resolving")
                          : t("aliasPayments.lookup")}
                      </Button>
                    </div>
                  </div>
                </div>

                {resolveAlias.data && (
                  <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-lg">
                            {resolveAlias.data.resolution.resolvedName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {resolveAlias.data.resolution.resolvedInstitution}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("aliasPayments.account")}:{" "}
                            {resolveAlias.data.resolution.resolvedAccountMasked} &middot;{" "}
                            {resolveAlias.data.resolution.country}
                          </p>
                          <div className="flex gap-1 mt-2">
                            {resolveAlias.data.resolution.availableRails.map((rail: string) => (
                              <Badge key={rail} variant="secondary" className="text-xs">
                                {rail}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button onClick={() => setShowPayDialog(true)}>
                          <Send className="h-4 w-4 mr-2" /> {t("aliasPayments.sendPayment")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("aliasPayments.sendPayment")}</DialogTitle>
                  <DialogDescription>
                    {resolveAlias.data
                      ? t("aliasPayments.sendingTo", {
                          name: resolveAlias.data.resolution.resolvedName,
                          institution: resolveAlias.data.resolution.resolvedInstitution,
                        })
                      : t("aliasPayments.completePaymentDetails")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("aliasPayments.amount")}</Label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("aliasPayments.currency")}</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="BRL">BRL</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("aliasPayments.description")}</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("aliasPayments.paymentReference")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPayDialog(false)}>
                    {t("aliasPayments.cancel")}
                  </Button>
                  <Button onClick={handlePay} disabled={!amount || payByAlias.isPending}>
                    {payByAlias.isPending
                      ? t("aliasPayments.sending")
                      : t("aliasPayments.confirmAndSend")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Inbound R2P Tab */}
          <TabsContent value="inbound">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownLeft className="h-5 w-5" />
                    {t("aliasPayments.paymentRequests")}
                  </CardTitle>
                  <CardDescription>{t("aliasPayments.paymentRequestsDesc")}</CardDescription>
                </CardHeader>
              </Card>

              {inboundLoading ? (
                <PageSkeleton />
              ) : inboundRequests.length === 0 ? (
                <EmptyState
                  icon={ArrowDownLeft}
                  title={t("aliasPayments.noPaymentRequests")}
                  description={t("aliasPayments.noPaymentRequestsDesc")}
                />
              ) : (
                <div className="space-y-3">
                  {inboundRequests.map((r2p: RequestToPayInbound) => {
                    const AliasIcon = aliasTypeIcons[r2p.requesterAliasType] || Globe;
                    const statusCfg = r2pStatusConfig[r2p.status] ?? r2pStatusConfig.pending;
                    return (
                      <Card key={r2p.requestId}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <AliasIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold">{r2p.requesterName}</p>
                                <p className="text-sm text-muted-foreground">{r2p.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("aliasPayments.ref")}: {r2p.reference} &middot;{" "}
                                  {r2p.requesterInstitution}
                                </p>
                              </div>
                            </div>
                            <div className="text-right space-y-2">
                              <p className="text-lg font-bold">
                                {formatCurrencyIntl(r2p.amountCents, r2p.currency)}
                              </p>
                              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                              {r2p.status === "pending" && (
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleR2PRespond(r2p.requestId, "approve")}
                                    disabled={respondToR2P.isPending}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />{" "}
                                    {t("aliasPayments.approve")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleR2PRespond(r2p.requestId, "decline")}
                                    disabled={respondToR2P.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />{" "}
                                    {t("aliasPayments.decline")}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Outbound R2P Tab */}
          <TabsContent value="outbound">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5" />
                    {t("aliasPayments.sentPaymentRequests")}
                  </CardTitle>
                  <CardDescription>{t("aliasPayments.sentPaymentRequestsDesc")}</CardDescription>
                </CardHeader>
              </Card>

              {outboundLoading ? (
                <PageSkeleton />
              ) : outboundRequests.length === 0 ? (
                <EmptyState
                  icon={ArrowUpRight}
                  title={t("aliasPayments.noSentRequests")}
                  description={t("aliasPayments.noSentRequestsDesc")}
                />
              ) : (
                <div className="space-y-3">
                  {outboundRequests.map((r2p: RequestToPayOutbound) => {
                    const AliasIcon = aliasTypeIcons[r2p.payerAliasType] || Globe;
                    const statusCfg = r2pStatusConfig[r2p.status] ?? r2pStatusConfig.pending;
                    return (
                      <Card key={r2p.requestId}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <AliasIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold">{r2p.payerName}</p>
                                <p className="text-sm text-muted-foreground">{r2p.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("aliasPayments.alias")}: {r2p.payerAlias}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">
                                {formatCurrencyIntl(r2p.amountCents, r2p.currency)}
                              </p>
                              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Directories Tab */}
          <TabsContent value="directories">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {t("aliasPayments.supportedDirectories")}
                  </CardTitle>
                  <CardDescription>{t("aliasPayments.supportedDirectoriesDesc")}</CardDescription>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {directories.map((dir) => (
                  <Card key={dir.region}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{dir.name}</p>
                          <Badge variant="outline">{dir.region.toUpperCase()}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dir.supportedAliasTypes.map((aliasT: string) => (
                            <Badge key={aliasT} variant="secondary" className="text-xs">
                              {aliasT}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {t("aliasPayments.currencies")}: {dir.supportedCurrencies.join(", ")}
                          </span>
                          {dir.supportsR2P && (
                            <Badge variant="default" className="text-xs">
                              R2P
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
