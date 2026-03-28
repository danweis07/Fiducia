import { useState } from "react";
import { Zap, ArrowUpRight, ArrowDownLeft, Loader2, FileCode2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { useAccounts } from "@/hooks/useAccounts";
import {
  useInstantPayments,
  useSendInstantPayment,
  useInstantPaymentLimits,
  useCheckReceiver,
  useExportISO20022,
} from "@/hooks/useInstantPayments";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { InstantPaymentStatus, InstantPaymentRail } from "@/types";

type Step = "form" | "confirm";

const STATUS_STYLES: Record<
  InstantPaymentStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  pending: { variant: "secondary", label: "Pending" },
  accepted: { variant: "default", label: "Accepted" },
  completed: { variant: "default", label: "Completed" },
  rejected: { variant: "destructive", label: "Rejected" },
  returned: { variant: "destructive", label: "Returned" },
  failed: { variant: "destructive", label: "Failed" },
};

const RAIL_LABELS: Record<InstantPaymentRail, string> = {
  fednow: "FedNow",
  rtp: "RTP",
};

export default function InstantPayments() {
  const [tab, setTab] = useState<"send" | "history">("send");
  const [step, setStep] = useState<Step>("form");
  const [exportPaymentId, setExportPaymentId] = useState<string | null>(null);

  // Send form
  const [fromAccountId, setFromAccountId] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverRouting, setReceiverRouting] = useState("");
  const [receiverAccount, setReceiverAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [preferredRail, setPreferredRail] = useState<InstantPaymentRail>("fednow");

  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: paymentsData, isLoading: paymentsLoading } = useInstantPayments();
  const { data: limitsData } = useInstantPaymentLimits();
  const { data: receiverCheck } = useCheckReceiver(receiverRouting, preferredRail);

  const sendPayment = useSendInstantPayment();
  const exportISO = useExportISO20022();

  const accounts = accountsData?.accounts ?? [];
  const payments = paymentsData?.payments ?? [];
  const limits = limitsData?.limits;

  function resetForm() {
    setFromAccountId("");
    setReceiverName("");
    setReceiverRouting("");
    setReceiverAccount("");
    setAmount("");
    setDescription("");
    setPreferredRail("fednow");
    setStep("form");
  }

  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const railLimit =
    preferredRail === "fednow"
      ? (limits?.fednow?.perTransactionLimitCents ?? 10000000)
      : (limits?.rtp?.perTransactionLimitCents ?? 100000000);

  async function handleSend() {
    try {
      await sendPayment.mutateAsync({
        sourceAccountId: fromAccountId,
        receiverRoutingNumber: receiverRouting,
        receiverAccountNumber: receiverAccount,
        receiverName,
        amountCents,
        description,
        preferredRail,
        idempotencyKey: `${fromAccountId}-${Date.now()}`,
      });
      toast({
        title: "Payment sent",
        description: `${formatCurrency(amountCents)} sent via ${RAIL_LABELS[preferredRail]}`,
      });
      resetForm();
      setTab("history");
    } catch (err) {
      handleError(err);
    }
  }

  async function handleExportISO20022(paymentId: string) {
    try {
      const result = await exportISO.mutateAsync({ paymentId, format: "pacs.008" });
      // Create downloadable blob
      const blob = new Blob([result.xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.messageType}-${paymentId}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "ISO 20022 exported",
        description: `${result.messageType} message downloaded`,
      });
    } catch (err) {
      handleError(err);
    }
    setExportPaymentId(null);
  }

  const canSubmit =
    fromAccountId &&
    receiverName &&
    receiverRouting.length === 9 &&
    receiverAccount &&
    amountCents > 0 &&
    amountCents <= railLimit &&
    description;

  if (accountsLoading)
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Instant Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Send real-time payments via FedNow or RTP using ISO 20022 messaging
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "send" | "history")}>
          <TabsList>
            <TabsTrigger value="send">Send Payment</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          {/* ============================================================= */}
          {/* SEND PAYMENT TAB */}
          {/* ============================================================= */}
          <TabsContent value="send" className="space-y-4">
            {step === "form" && (
              <Card>
                <CardHeader>
                  <CardTitle>Send Instant Payment</CardTitle>
                  <CardDescription>
                    Payments settle in seconds via the {RAIL_LABELS[preferredRail]} network
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Rail</Label>
                    <Select
                      value={preferredRail}
                      onValueChange={(v) => setPreferredRail(v as InstantPaymentRail)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fednow">FedNow (Federal Reserve)</SelectItem>
                        <SelectItem value="rtp">RTP (The Clearing House)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Limit: {formatCurrency(railLimit)} per transaction
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>From Account</Label>
                    <Select value={fromAccountId} onValueChange={setFromAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.accountNumberMasked}) - {formatCurrency(a.balanceCents)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Receiver Name</Label>
                      <Input
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Receiver Routing Number</Label>
                      <Input
                        value={receiverRouting}
                        onChange={(e) =>
                          setReceiverRouting(e.target.value.replace(/\D/g, "").slice(0, 9))
                        }
                        placeholder="021000089"
                        maxLength={9}
                      />
                      {receiverRouting.length === 9 && receiverCheck && (
                        <p
                          className={`text-xs ${receiverCheck.eligible ? "text-green-600" : "text-red-600"}`}
                        >
                          {receiverCheck.eligible
                            ? `${receiverCheck.institutionName ?? "Institution"} — ${RAIL_LABELS[preferredRail]} eligible`
                            : "Not eligible for instant payments on this rail"}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Receiver Account Number</Label>
                      <Input
                        value={receiverAccount}
                        onChange={(e) => setReceiverAccount(e.target.value)}
                        placeholder="Account number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description / Remittance Info</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Payment description"
                      rows={2}
                    />
                  </div>

                  <Button
                    onClick={() => setStep("confirm")}
                    disabled={!canSubmit}
                    className="w-full"
                  >
                    Review Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === "confirm" && (
              <Card>
                <CardHeader>
                  <CardTitle>Confirm Instant Payment</CardTitle>
                  <CardDescription>
                    Review before sending — instant payments cannot be reversed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rail</span>
                      <Badge variant="outline">{RAIL_LABELS[preferredRail]}</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">To</span>
                      <span className="font-medium">{receiverName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Routing</span>
                      <span className="font-mono">{receiverRouting}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account</span>
                      <span className="font-mono">****{receiverAccount.slice(-4)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Amount</span>
                      <span>{formatCurrency(amountCents)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description</span>
                      <span className="text-right max-w-[60%]">{description}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
                      Back
                    </Button>
                    <Button
                      onClick={handleSend}
                      disabled={sendPayment.isPending}
                      className="flex-1"
                    >
                      {sendPayment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Send {formatCurrency(amountCents)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============================================================= */}
          {/* HISTORY TAB */}
          {/* ============================================================= */}
          <TabsContent value="history" className="space-y-4">
            {paymentsLoading ? (
              <PageSkeleton />
            ) : payments.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="No instant payments yet"
                description="Send your first real-time payment to get started"
              />
            ) : (
              <div className="space-y-3">
                {payments.map((p) => {
                  const style = STATUS_STYLES[p.status as InstantPaymentStatus];
                  const isOutbound = p.direction === "outbound";
                  return (
                    <Card key={p.paymentId}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {isOutbound ? (
                            <ArrowUpRight className="h-5 w-5 text-red-500" />
                          ) : (
                            <ArrowDownLeft className="h-5 w-5 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {isOutbound ? p.receiverName : p.senderName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.description} &middot; {new Date(p.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {RAIL_LABELS[p.rail as InstantPaymentRail]}
                              </Badge>
                              {p.iso20022MessageType && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  {p.iso20022MessageType}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p
                              className={`font-semibold ${isOutbound ? "text-red-600" : "text-green-600"}`}
                            >
                              {isOutbound ? "-" : "+"}
                              {formatCurrency(p.amountCents)}
                            </p>
                            <Badge variant={style.variant}>{style.label}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExportPaymentId(p.paymentId)}
                            title="Export ISO 20022 XML"
                          >
                            <FileCode2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Export ISO 20022 Dialog */}
      <AlertDialog open={!!exportPaymentId} onOpenChange={() => setExportPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export ISO 20022 Message</AlertDialogTitle>
            <AlertDialogDescription>
              Download the ISO 20022 pacs.008 XML message for this payment. This is the standard
              format used by FedNow, SWIFT, and international clearinghouses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => exportPaymentId && handleExportISO20022(exportPaymentId)}
            >
              {exportISO.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Download XML
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
