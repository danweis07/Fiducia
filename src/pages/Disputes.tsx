import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  FileText,
  Plus,
  ChevronRight,
  Ban,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/common/currency";
import { formatBankingDate } from "@/lib/common/date";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import {
  useDisputes,
  useDispute,
  useFileDispute,
  useAddDisputeDocument,
  useCancelDispute,
} from "@/hooks/useDisputes";
import { useTransactions } from "@/hooks/useTransactions";
import type { Dispute, DisputeStatus, DisputeTimelineEvent, DisputeDocument } from "@/types";

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const statusConfig: Record<
  DisputeStatus,
  { labelKey: string; className: string; icon: React.ElementType }
> = {
  pending: {
    labelKey: "disputes.statusPending",
    className: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  under_review: {
    labelKey: "disputes.statusUnderReview",
    className: "bg-blue-100 text-blue-700",
    icon: Shield,
  },
  provisional_credit_issued: {
    labelKey: "disputes.statusCreditIssued",
    className: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  resolved_favor_customer: {
    labelKey: "disputes.statusResolvedYourFavor",
    className: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle,
  },
  resolved_favor_merchant: {
    labelKey: "disputes.statusResolvedMerchant",
    className: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  cancelled: {
    labelKey: "disputes.statusCancelled",
    className: "bg-gray-100 text-gray-500",
    icon: Ban,
  },
};

const reasonKeys: Record<string, string> = {
  unauthorized: "disputes.reasonUnauthorized",
  duplicate: "disputes.reasonDuplicate",
  incorrect_amount: "disputes.reasonIncorrectAmount",
  merchandise_not_received: "disputes.reasonMerchandiseNotReceived",
  service_not_rendered: "disputes.reasonServiceNotRendered",
  other: "disputes.reasonOther",
};

// ---------------------------------------------------------------------------
// File Dispute Dialog
// ---------------------------------------------------------------------------

function FileDisputeDialog() {
  const { t } = useTranslation("banking");
  const [open, setOpen] = useState(false);
  const [txId, setTxId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const fileMutation = useFileDispute();

  const { data: txData } = useTransactions({ limit: 50 });
  const transactions = txData?.transactions ?? [];

  const handleSubmit = () => {
    if (!txId || !reason || !description) return;
    fileMutation.mutate(
      { transactionId: txId, reason, description },
      {
        onSuccess: () => {
          toast({ title: t("disputes.disputeFiled"), description: t("disputes.disputeFiledDesc") });
          setOpen(false);
          setTxId("");
          setReason("");
          setDescription("");
        },
        onError: () => {
          toast({
            title: t("disputes.error"),
            description: t("disputes.fileError"),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("disputes.fileDispute")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("disputes.fileDisputeTitle")}</DialogTitle>
          <DialogDescription>{t("disputes.fileDisputeDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("disputes.transaction")}</Label>
            <Select value={txId} onValueChange={setTxId}>
              <SelectTrigger>
                <SelectValue placeholder={t("disputes.selectTransaction")} />
              </SelectTrigger>
              <SelectContent>
                {transactions.map((tx) => (
                  <SelectItem key={tx.id} value={tx.id}>
                    {tx.merchantName ?? tx.description} &mdash;{" "}
                    {formatCurrency(Math.abs(tx.amountCents))} ({formatBankingDate(tx.createdAt)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("disputes.reason")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("disputes.selectReason")} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reasonKeys).map(([val, key]) => (
                  <SelectItem key={val} value={val}>
                    {t(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("disputes.description")}</Label>
            <Textarea
              placeholder={t("disputes.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("disputes.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!txId || !reason || !description || fileMutation.isPending}
          >
            {fileMutation.isPending ? t("disputes.submitting") : t("disputes.submitDispute")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dispute Detail Panel
// ---------------------------------------------------------------------------

function DisputeDetail({ disputeId, onBack }: { disputeId: string; onBack: () => void }) {
  const { t } = useTranslation("banking");
  const { data, isLoading } = useDispute(disputeId);
  const cancelMutation = useCancelDispute();
  const addDocMutation = useAddDisputeDocument();
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [docOpen, setDocOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [docDesc, setDocDesc] = useState("");
  const [docFileName, setDocFileName] = useState("");

  if (isLoading) return <PageSkeleton />;
  if (!data) return null;

  const { dispute, timeline, documents } = data;
  const cfg = statusConfig[dispute.status];

  const handleCancel = () => {
    cancelMutation.mutate(
      { disputeId, reason: cancelReason },
      {
        onSuccess: () => {
          toast({ title: t("disputes.disputeCancelled") });
          setCancelOpen(false);
          onBack();
        },
      },
    );
  };

  const handleAddDoc = () => {
    if (!docType || !docDesc || !docFileName) return;
    addDocMutation.mutate(
      { disputeId, documentType: docType, description: docDesc, fileName: docFileName },
      {
        onSuccess: () => {
          toast({ title: t("disputes.documentAdded") });
          setDocOpen(false);
          setDocType("");
          setDocDesc("");
          setDocFileName("");
        },
      },
    );
  };

  const canCancel = dispute.status === "pending" || dispute.status === "under_review";

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        &larr; {t("disputes.backToDisputes")}
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">{dispute.merchantName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formatCurrency(dispute.transactionAmountCents)} &middot;{" "}
              {formatBankingDate(dispute.transactionDate)}
            </p>
          </div>
          <Badge className={cfg.className}>{t(cfg.labelKey)}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("disputes.reason")}</p>
              <p className="font-medium">
                {reasonKeys[dispute.reason] ? t(reasonKeys[dispute.reason]) : dispute.reason}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("disputes.filed")}</p>
              <p className="font-medium">{formatBankingDate(dispute.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("disputes.provisionalCreditDeadline")}</p>
              <p className="font-medium">{formatBankingDate(dispute.provisionalCreditDeadline)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("disputes.investigationDeadline")}</p>
              <p className="font-medium">{formatBankingDate(dispute.investigationDeadline)}</p>
            </div>
            {dispute.provisionalCreditAmountCents != null && (
              <div>
                <p className="text-muted-foreground">{t("disputes.provisionalCredit")}</p>
                <p className="font-medium text-green-600">
                  {formatCurrency(dispute.provisionalCreditAmountCents)}
                </p>
              </div>
            )}
            {dispute.resolution && (
              <div className="col-span-2">
                <p className="text-muted-foreground">{t("disputes.resolution")}</p>
                <p className="font-medium">{dispute.resolution}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-sm">{t("disputes.description")}</p>
            <p className="text-sm mt-1">{dispute.description}</p>
          </div>
          <div className="flex gap-2">
            {canCancel && (
              <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Ban className="h-4 w-4 mr-1" />
                    {t("disputes.cancelDispute")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("disputes.cancelDispute")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Label>{t("disputes.reasonForCancellation")}</Label>
                    <Textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCancelOpen(false)}>
                      {t("disputes.keepDispute")}
                    </Button>
                    <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason}>
                      {t("disputes.confirmCancel")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={docOpen} onOpenChange={setDocOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-1" />
                  {t("disputes.addDocument")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("disputes.addSupportingDocument")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>{t("disputes.documentType")}</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("disputes.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receipt">{t("disputes.docTypeReceipt")}</SelectItem>
                        <SelectItem value="correspondence">
                          {t("disputes.docTypeCorrespondence")}
                        </SelectItem>
                        <SelectItem value="screenshot">
                          {t("disputes.docTypeScreenshot")}
                        </SelectItem>
                        <SelectItem value="other">{t("disputes.docTypeOther")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("disputes.description")}</Label>
                    <Input
                      value={docDesc}
                      onChange={(e) => setDocDesc(e.target.value)}
                      placeholder={t("disputes.briefDescription")}
                    />
                  </div>
                  <div>
                    <Label>{t("disputes.fileName")}</Label>
                    <Input
                      value={docFileName}
                      onChange={(e) => setDocFileName(e.target.value)}
                      placeholder="document.pdf"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDocOpen(false)}>
                    {t("disputes.cancel")}
                  </Button>
                  <Button onClick={handleAddDoc} disabled={!docType || !docDesc || !docFileName}>
                    {t("disputes.upload")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("disputes.timeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          {(timeline as DisputeTimelineEvent[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("disputes.noTimelineEvents")}</p>
          ) : (
            <ol className="relative border-l border-muted ml-3 space-y-4">
              {(timeline as DisputeTimelineEvent[]).map((evt) => (
                <li key={evt.id} className="ml-4">
                  <div className="absolute w-2.5 h-2.5 bg-primary rounded-full -left-[5.5px] mt-1.5" />
                  <p className="text-sm font-medium">{evt.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBankingDate(evt.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      {(documents as DisputeDocument[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("disputes.documents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(documents as DisputeDocument[]).map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.description} &middot; {formatBankingDate(doc.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Disputes() {
  const { t } = useTranslation("banking");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data, isLoading } = useDisputes(statusFilter ? { status: statusFilter } : {});
  const disputes = data?.disputes ?? [];

  if (selectedId) {
    return (
      <AppShell>
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full"
        >
          <DisputeDetail disputeId={selectedId} onBack={() => setSelectedId(null)} />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main
        id="main-content"
        className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t("disputes.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("disputes.subtitle")}</p>
          </div>
          <FileDisputeDialog />
        </div>

        <div className="mb-4">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("disputes.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("disputes.allStatuses")}</SelectItem>
              <SelectItem value="pending">{t("disputes.statusPending")}</SelectItem>
              <SelectItem value="under_review">{t("disputes.statusUnderReview")}</SelectItem>
              <SelectItem value="provisional_credit_issued">
                {t("disputes.statusCreditIssued")}
              </SelectItem>
              <SelectItem value="resolved_favor_customer">
                {t("disputes.statusResolvedYourFavor")}
              </SelectItem>
              <SelectItem value="resolved_favor_merchant">
                {t("disputes.statusResolvedMerchant")}
              </SelectItem>
              <SelectItem value="cancelled">{t("disputes.statusCancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <PageSkeleton />
        ) : disputes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("disputes.noDisputes")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("disputes.noDisputesHint")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {disputes.map((d: Dispute) => {
              const cfg = statusConfig[d.status];
              const StatusIcon = cfg.icon;
              return (
                <Card
                  key={d.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedId(d.id)}
                >
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.merchantName}</p>
                        <p className="text-sm text-muted-foreground">
                          {reasonKeys[d.reason] ? t(reasonKeys[d.reason]) : d.reason} &middot;{" "}
                          {formatBankingDate(d.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(d.transactionAmountCents)}</p>
                        <Badge className={cfg.className + " text-xs"}>{t(cfg.labelKey)}</Badge>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
}
